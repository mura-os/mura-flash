export function recipe(overrides = {}) {
  return {
    schema: "org.mura.flash.inspection-recipe/v1",
    id: "oculus-go-pacific",
    displayName: "Oculus Go",
    vendor: "Meta",
    models: ["Oculus Go"],
    codenames: ["pacific"],
    builds: [{ id: "all", status: "inspect-only" }],
    evidenceLevel: "community-reproduced",
    hardwareStatus: "unqualified",
    authenticationStatus: "test-only",
    writesEnabled: false,
    frontends: ["webusb"],
    transports: ["adb"],
    probes: ["adb.model", "adb.vbmeta-digest"],
    redactFacts: ["vbmeta-digest"],
    blockers: [],
    unknowns: [],
    sources: ["https://example.invalid/mura-test-source"],
    ...overrides,
  };
}

export class FakeAdapter {
  kind;
  devices;
  facts;
  reads = [];
  budgets = [];
  aborted = [];
  connects = [];
  closed = 0;
  connectedDevice;
  neverFacts;
  chunks;

  constructor({
    kind = "adb",
    devices = [{ serial: "unit-1", vendorId: 1, productId: 2 }],
    facts = {
      model: "Oculus Go",
      "vbmeta-digest": "private-digest",
    },
    connectedDevice,
    neverFacts = [],
    chunks = {},
  } = {}) {
    this.kind = kind;
    this.devices = devices;
    this.facts = facts;
    this.connectedDevice = connectedDevice;
    this.neverFacts = new Set(neverFacts);
    this.chunks = chunks;
  }

  async listDevices() {
    return this.devices;
  }

  async connect(device) {
    this.connects.push(device);
    return this.connectedDevice ?? device;
  }

  async readFact(fact, signal, maxBytes) {
    this.reads.push(fact);
    this.budgets.push(maxBytes);
    signal.throwIfAborted();
    if (this.neverFacts.has(fact)) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            this.aborted.push(fact);
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
    if (!Object.hasOwn(this.chunks, fact)) {
      return this.facts[fact] ?? null;
    }
    const chunks = this.chunks[fact];
    let value = "";
    for (const chunk of chunks) {
      await Promise.resolve();
      signal.throwIfAborted();
      if (chunk === null) {
        return null;
      }
      value += chunk;
      if (new TextEncoder().encode(value).byteLength > maxBytes) {
        throw new Error("fake fact exceeds remaining output budget");
      }
    }
    return value;
  }

  async close() {
    this.closed += 1;
  }
}
