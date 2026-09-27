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

const citation = {
  kind: "repository",
  path: "tests/web/fixtures.mjs",
  lineStart: 1,
  lineEnd: 1,
};

function stateRef(stateId) {
  return { kind: "state", stateId };
}

function waitOperation(
  id,
  {
    fromState = "ready",
    toState = null,
    recover = true,
  } = {},
) {
  return {
    id,
    variant: "wait",
    enabled: false,
    fromStates: [stateRef(fromState)],
    toState: toState === null ? null : stateRef(toState),
    arguments: [
      {
        inputName: "duration",
        value: { kind: "constant", valueType: "duration-ms", value: 1 },
      },
    ],
    guards: [],
    postconditions: [
      {
        kind: "equals",
        left: { kind: "constant", valueType: "duration-ms", value: 1 },
        right: { kind: "constant", valueType: "duration-ms", value: 1 },
      },
    ],
    failureEdges: [
      recover
        ? { failureClass: "interrupted", recoveryId: "safe-stop" }
        : { failureClass: "interrupted", terminalFailure: true },
    ],
    engineFailureEdges: [
      recover
        ? { failureClass: "postcondition-failed", recoveryId: "safe-stop" }
        : { failureClass: "postcondition-failed", terminalFailure: true },
      recover
        ? { failureClass: "interrupted", recoveryId: "safe-stop" }
        : { failureClass: "interrupted", terminalFailure: true },
    ],
    idempotence: "idempotent",
    sourceCitations: [citation],
  };
}

export function procedure(overrides = {}) {
  return {
    schema: "org.mura.flash.install-procedure/v1",
    id: "install.synthetic",
    targetId: "synthetic-target",
    enabled: false,
    sourceBehavior: {
      summary: "Synthetic deterministic replay procedure.",
      evidenceLevel: "source-documented",
    },
    sourceGaps: ["synthetic-test-only"],
    sourceParity: {
      path: "tests/fixtures/source-parity/vendor/oculus-go-pacific-official-unlock.json",
    },
    runtimeInputs: [],
    states: [
      { id: "ready", kind: "flow", initial: true },
      { id: "completed", kind: "flow", initial: false },
    ],
    artifacts: [],
    partitions: [],
    backups: [],
    confirmations: [],
    operations: [
      waitOperation("main-wait", { toState: "completed" }),
      waitOperation("recovery-wait", { recover: false }),
    ],
    flows: [
      {
        id: "install",
        enabled: false,
        initialState: stateRef("ready"),
        steps: [{ kind: "operation", operationId: "main-wait" }],
        guards: [],
        confirmations: [],
      },
    ],
    recovery: [
      {
        id: "safe-stop",
        fromStates: [stateRef("ready")],
        steps: [{ kind: "operation", operationId: "recovery-wait" }],
        terminalState: stateRef("ready"),
      },
    ],
    sourceCitations: [citation],
    ...overrides,
  };
}

export function replayScenario(overrides = {}) {
  return {
    schema: "org.mura.flash.replay-scenario/v1",
    id: "synthetic-replay",
    procedureId: "install.synthetic",
    flowId: "install",
    simulateDisabled: true,
    clock: {
      startTimestamp: "2000-01-01T00:00:00.000000Z",
      tickMs: 1,
    },
    operationDurations: [
      { operationId: "main-wait", durationMs: 1 },
      { operationId: "recovery-wait", durationMs: 1 },
    ],
    adapterCapabilities: [],
    inputs: [],
    responses: [
      {
        kind: "success",
        operationId: "main-wait",
        outputs: [{ name: "elapsed", type: "duration-ms", value: 1 }],
      },
    ],
    expected: {
      terminalStateId: "completed",
      eventKinds: [
        "session-start",
        "operation-would-execute",
        "state-transition",
        "operation-success",
        "session-end",
      ],
      errorCode: null,
    },
    ...overrides,
  };
}
