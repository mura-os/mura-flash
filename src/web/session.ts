import { getTarget, loadCatalog, probesById, validateRecipe, contract } from "./catalog";
import { fail, MuraFlashError } from "./errors";
import {
  GrapheneFastbootProbeAdapter,
  TangoAdbProbeAdapter,
} from "./native-transports";
import { redactTranscript } from "./redact";
import type {
  BrowserSessionOptions,
  Catalog,
  DeviceIdentity,
  InspectOptions,
  InspectionRecipe,
  InspectionReport,
  ProbeAdapter,
  ProbeAdapterFactory,
  TranscriptEntry,
  TransportKind,
} from "./types";

const encoder = new TextEncoder();

function stableSerial(identity: DeviceIdentity): string {
  if (identity.serial === undefined || identity.serial.length === 0) {
    throw fail(
      "safety-refusal",
      "device continuity requires a stable serial",
    );
  }
  return identity.serial;
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  seconds: number,
  detail: string,
  close: () => Promise<void>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void close().catch(() => undefined);
      reject(fail("probe-timeout", detail));
    }, seconds * 1000);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function nativeFactory(kind: TransportKind): ProbeAdapterFactory {
  return kind === "adb"
    ? () => new TangoAdbProbeAdapter()
    : () => new GrapheneFastbootProbeAdapter();
}

export class BrowserSession {
  readonly #catalog: Catalog;
  readonly #factories: Readonly<Record<TransportKind, ProbeAdapterFactory>>;
  readonly #now: () => Date;
  readonly #redactFacts = new Set<string>();
  #adapter: ProbeAdapter | undefined;
  #boundSerial: string | undefined;
  #closed = false;
  #transcript: TranscriptEntry[] = [];

  constructor(options: BrowserSessionOptions = {}) {
    this.#catalog = options.catalog ?? loadCatalog();
    this.#factories = {
      adb:
        options.transports?.adb ??
        options.createAdbTransport ??
        nativeFactory("adb"),
      fastboot:
        options.transports?.fastboot ??
        options.createFastbootTransport ??
        nativeFactory("fastboot"),
    };
    this.#now = options.now ?? (() => new Date());
  }

  get transcript(): readonly TranscriptEntry[] {
    return Object.freeze(
      redactTranscript(this.#transcript, [...this.#redactFacts]).map((entry) =>
        Object.freeze(entry),
      ),
    );
  }

  async inspect(
    target: string | InspectionRecipe,
    options: InspectOptions = {},
  ): Promise<InspectionReport> {
    if (this.#closed) {
      throw fail("usage", "browser session is closed");
    }

    const recipe =
      typeof target === "string"
        ? getTarget(target, this.#catalog)
        : validateRecipe(target);
    if (!recipe.frontends.includes("webusb")) {
      throw fail(
        "safety-refusal",
        `target ${JSON.stringify(recipe.id)} does not enable the WebUSB frontend`,
      );
    }
    for (const fact of recipe.redactFacts) {
      this.#redactFacts.add(fact);
    }
    const probeTransports = new Set<TransportKind>();
    for (const probeId of recipe.probes) {
      const probe = probesById.get(probeId);
      if (probe !== undefined) {
        probeTransports.add(probe.transport);
      }
    }

    let transport = options.transport;
    if (transport === undefined) {
      if (probeTransports.size !== 1) {
        throw fail(
          "usage",
          "transport is required when a recipe spans ADB and fastboot",
        );
      }
      transport = [...probeTransports][0];
    }
    if (transport === undefined || !probeTransports.has(transport)) {
      throw fail(
        "usage",
        `recipe has no ${transport ?? "selected"} probes`,
      );
    }

    await this.#closeAdapter();
    const adapter = await this.#factories[transport]();
    if (adapter.kind !== transport) {
      throw fail("safety-refusal", "transport factory returned the wrong kind");
    }
    this.#adapter = adapter;

    try {
      const devices = await withTimeout(
        () => adapter.listDevices(),
        contract.limits.reconnectTimeoutSeconds,
        `${transport} device discovery timed out`,
        () => this.#closeAdapter(),
      );
      if (devices.length === 0) {
        throw fail("device-missing", `no ${transport} device is connected`);
      }
      if (devices.length > contract.limits.maxDevices) {
        throw fail(
          "device-ambiguous",
          `expected one ${transport} device, found ${devices.length}`,
        );
      }
      const selected = devices[0];
      if (selected === undefined) {
        throw fail("device-missing", `no ${transport} device is connected`);
      }
      const selectedSerial = stableSerial(selected);
      if (
        this.#boundSerial !== undefined &&
        this.#boundSerial !== selectedSerial
      ) {
        throw fail(
          "safety-refusal",
          "reconnected device does not match the original unit",
        );
      }
      const connected = await withTimeout(
        () => adapter.connect(selected),
        contract.limits.reconnectTimeoutSeconds,
        `${transport} connection timed out`,
        () => this.#closeAdapter(),
      );
      const connectedSerial = stableSerial(connected);
      if (selectedSerial !== connectedSerial) {
        throw fail(
          "safety-refusal",
          "connected device does not match the selected unit",
        );
      }
      if (
        this.#boundSerial !== undefined &&
        this.#boundSerial !== connectedSerial
      ) {
        throw fail(
          "safety-refusal",
          "connected device does not match the original unit",
        );
      }
      this.#boundSerial = connectedSerial;

      const facts: Record<string, string | null> = {};
      const start = this.#transcript.length;
      let outputBytes = 0;
      for (const probeId of recipe.probes) {
        const probe = probesById.get(probeId);
        if (probe === undefined || probe.transport !== transport) {
          continue;
        }
        try {
          const remainingBytes =
            contract.limits.maxOutputBytes - outputBytes;
          if (remainingBytes <= 0) {
            throw fail(
              "safety-refusal",
              `probe output reached ${contract.limits.maxOutputBytes} bytes`,
            );
          }
          const value = await withTimeout(
            (signal) =>
              adapter.readFact(probe.fact, signal, remainingBytes),
            contract.limits.probeTimeoutSeconds,
            `probe ${probe.id} timed out`,
            () => this.#closeAdapter(),
          );
          outputBytes += value === null ? 0 : encoder.encode(value).byteLength;
          if (outputBytes > contract.limits.maxOutputBytes) {
            throw fail(
              "safety-refusal",
              `probe output exceeds ${contract.limits.maxOutputBytes} bytes`,
            );
          }
          const sensitive =
            probe.sensitive === true || recipe.redactFacts.includes(probe.fact);
          facts[probe.fact] =
            sensitive && value !== null ? "[REDACTED]" : value;
          this.#transcript.push({
            at: this.#now().toISOString(),
            transport,
            probeId: probe.id,
            fact: probe.fact,
            status: "ok",
            value,
          });
        } catch (error) {
          const stableError =
            error instanceof MuraFlashError
              ? error
              : fail("probe-failed", `probe ${probe.id} failed`, error);
          this.#transcript.push({
            at: this.#now().toISOString(),
            transport,
            probeId: probe.id,
            fact: probe.fact,
            status: "error",
            error: stableError.message,
          });
          throw stableError;
        }
      }

      const reportTranscript = redactTranscript(
        this.#transcript.slice(start),
        recipe.redactFacts,
      );
      return Object.freeze({
        targetId: recipe.id,
        transport,
        facts: Object.freeze(facts),
        transcript: Object.freeze(
          reportTranscript.map((entry) => Object.freeze(entry)),
        ),
      });
    } finally {
      await this.#closeAdapter();
    }
  }

  async close(): Promise<void> {
    if (!this.#closed) {
      this.#closed = true;
      await this.#closeAdapter();
    }
  }

  async #closeAdapter(): Promise<void> {
    const adapter = this.#adapter;
    this.#adapter = undefined;
    if (adapter !== undefined) {
      await adapter.close();
    }
  }
}

export function createBrowserSession(
  options: BrowserSessionOptions = {},
): BrowserSession {
  return new BrowserSession(options);
}
