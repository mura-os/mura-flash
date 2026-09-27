import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  createReplaySession,
  getProcedure,
  loadProcedureCatalog,
  loadReplayScenarioCatalog,
  loadTargetCatalog,
  planProcedure,
  validateProcedure,
  validateReplayScenario,
} from "../../dist/mura-flash.mjs";
import { procedure, replayScenario } from "./fixtures.mjs";

const sharedV1FixtureRoot = new URL(
  "../fixtures/schema-or-catalog/",
  import.meta.url,
);

test("agrees with shared repaired-v1 schema fixtures", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("manifest.json", sharedV1FixtureRoot), "utf8"),
  );
  const validate = (relativePath) => {
    const source = fs.readFileSync(
      new URL(relativePath, sharedV1FixtureRoot),
      "utf8",
    );
    const schema = JSON.parse(source).schema;
    if (schema === "org.mura.flash.install-procedure/v1") {
      validateProcedure(source);
    } else if (schema === "org.mura.flash.target-record/v1") {
      loadTargetCatalog([source]);
    } else if (schema === "org.mura.flash.replay-scenario/v1") {
      validateReplayScenario(source);
    } else {
      assert.fail(`unsupported shared fixture schema ${schema}`);
    }
  };
  for (const relativePath of Object.keys(manifest.valid)) {
    assert.doesNotThrow(() => validate(relativePath), relativePath);
  }
  for (const relativePath of Object.keys(manifest.invalid)) {
    assert.throws(
      () => validate(relativePath),
      (error) => error.code === "invalid-document",
      relativePath,
    );
  }
});

test("strictly loads and freezes the v1 target catalog", () => {
  const targets = loadTargetCatalog();
  assert.equal(targets.length, 15);
  assert.equal(targets[0].id, "htc-vive-xr-elite-kyoto");
  assert.equal(Object.isFrozen(targets), true);
  assert.equal(Object.isFrozen(targets[0]), true);
  assert.ok(loadProcedureCatalog().length > 0);
  const scenarios = loadReplayScenarioCatalog();
  assert.ok(scenarios.some((scenario) => scenario.procedureId ===
    "samsung-galaxy-xr-ayke-to-ayia-rollback-unlock"));
  assert.equal(Object.isFrozen(scenarios), true);
  assert.equal(Object.isFrozen(scenarios[0]), true);
});

test("validates procedure closure and plans disabled operations", () => {
  const validated = validateProcedure(JSON.stringify(procedure()));
  const plan = planProcedure(validated, "install");
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(plan.steps[0].operationId, "main-wait");
  assert.equal(plan.steps[0].wouldExecute, false);
  assert.deepEqual(plan.requiredCapabilities, []);

  const catalog = loadProcedureCatalog([procedure()]);
  assert.equal(getProcedure("install.synthetic", catalog), catalog[0]);
  assert.equal(getProcedure(catalog, "install.synthetic"), catalog[0]);
});

test("rejects duplicate keys and unresolved procedure references", () => {
  const duplicate = JSON.stringify(procedure()).replace(
    '"id":"install.synthetic"',
    '"id":"install.synthetic","id":"install.other"',
  );
  assert.throws(
    () => validateProcedure(duplicate),
    (error) =>
      error.code === "invalid-document" &&
      error.message.includes('duplicate key "id"'),
  );

  const broken = procedure({
    flows: [
      {
        ...procedure().flows[0],
        steps: [{ kind: "operation", operationId: "missing" }],
      },
    ],
  });
  assert.throws(
    () => validateProcedure(broken),
    (error) =>
      error.code === "graph-invalid" &&
      error.message.includes('unknown operation "missing"'),
  );

  const nonFinite = JSON.stringify(procedure()).replace(
    '"value":1',
    '"value":1e999',
  );
  assert.throws(
    () => validateProcedure(nonFinite),
    (error) =>
      error.code === "invalid-document" &&
      error.message.includes("non-finite JSON number"),
  );
});

test("replays success deterministically with a redacted hash chain", async () => {
  const first = createReplaySession({
    sessionId: "synthetic-session",
  });
  const second = createReplaySession({
    sessionId: "synthetic-session",
  });
  const firstResult = await first.run(procedure(), replayScenario());
  const secondResult = await second.run(procedure(), replayScenario());

  assert.equal(firstResult.terminalStateId, "completed");
  assert.equal(firstResult.errorCode, null);
  assert.equal(firstResult.matchedExpected, true);
  assert.deepEqual(firstResult, secondResult);
  assert.equal(firstResult.events[0].previousHash, null);
  for (let index = 0; index < firstResult.events.length; index += 1) {
    const event = firstResult.events[index];
    assert.equal(event.sequence, index);
    assert.match(event.eventHash, /^[0-9a-f]{64}$/u);
    if (index > 0) {
      assert.equal(
        event.previousHash,
        firstResult.events[index - 1].eventHash,
      );
    }
  }
});

test("matches the Python canonical first-event hash", async () => {
  const result = await createReplaySession().run(procedure(), replayScenario());
  assert.equal(result.events[0].timestamp, "2000-01-01T00:00:00.000Z");
  assert.equal(
    result.events[0].eventHash,
    "711656da6d162208962bddbfe2aa53f239b1d5f4b0c048ebe55b6ac4a22c8993",
  );
});

test("redacts registry-declared sensitive values before hashing", async () => {
  const sensitive = "1234567";
  const sensitiveOperation = {
    ...procedure().operations[0],
    variant: "pico.derive-token",
    arguments: [
      {
        inputName: "socSerial",
        value: { kind: "constant", valueType: "string", value: sensitive },
      },
    ],
    postconditions: [
      {
        kind: "equals",
        left: {
          kind: "operation-output",
          operationId: "main-wait",
          outputName: "unlockToken",
        },
        right: { kind: "constant", valueType: "string", value: sensitive },
      },
    ],
    failureEdges: [
      { failureClass: "postcondition-failed", recoveryId: "safe-stop" },
    ],
  };
  const sensitiveProcedure = procedure({
    operations: [sensitiveOperation, procedure().operations[1]],
  });
  const sensitiveScenario = replayScenario({
    responses: [
      {
        kind: "success",
        operationId: "main-wait",
        outputs: [{ name: "unlockToken", type: "string", value: sensitive }],
      },
    ],
  });
  const result = await createReplaySession().run(
    sensitiveProcedure,
    sensitiveScenario,
  );
  const success = result.events.find(
    (event) => event.payload.kind === "operation-success",
  );
  assert.equal(success.payload.outputs[0].value, "<redacted>");
  assert.equal(result.stateEffects[0].outputs[0].value, "<redacted>");
});

test("normal planning skips disabled capabilities before confirmation", async () => {
  const disabled = procedure({
    confirmations: [
      {
        id: "confirmrun",
        safetyClasses: ["host-read"],
        prompt: "Run the replay step?",
      },
    ],
    flows: [{
      ...procedure().flows[0],
      confirmations: [{ kind: "confirmation", confirmationId: "confirmrun" }],
    }],
  });
  const scenario = replayScenario({
    responses: [],
    expected: {
      terminalStateId: "ready",
      eventKinds: ["session-start", "confirmation", "session-end"],
      errorCode: "confirmation-declined",
    },
  });
  const result = await createReplaySession().run(
    disabled,
    scenario,
  );
  assert.equal(result.plan.requiredCapabilities.length, 0);
  assert.equal(result.errorCode, "confirmation-declined");
});

test("normal replay skips disabled steps and confirmation", async () => {
  const disabled = procedure({
    confirmations: [
      {
        id: "confirmrun",
        safetyClasses: ["host-read"],
        prompt: "Run the replay step?",
      },
    ],
    flows: [{
      ...procedure().flows[0],
      confirmations: [{ kind: "confirmation", confirmationId: "confirmrun" }],
    }],
  });
  const scenario = replayScenario({
    simulateDisabled: false,
    responses: [],
    expected: {
      terminalStateId: "ready",
      eventKinds: ["session-start", "session-end"],
      errorCode: null,
    },
  });

  const result = await createReplaySession().run(disabled, scenario);

  assert.equal(result.matchedExpected, true);
  assert.equal(result.plan.steps[0].wouldExecute, false);
});

test("flow guard stops before a later operation", async () => {
  const base = procedure();
  const guarded = procedure({
    flows: [{
      ...base.flows[0],
      steps: [
        { kind: "operation", operationId: "main-wait" },
        { kind: "operation", operationId: "recovery-wait" },
      ],
      guards: [{
        kind: "equals",
        left: {
          kind: "operation-output",
          operationId: "main-wait",
          outputName: "elapsed",
        },
        right: { kind: "constant", valueType: "duration-ms", value: 2 },
      }],
    }],
  });
  const scenario = replayScenario({
    expected: {
      terminalStateId: "completed",
      eventKinds: [
        "session-start",
        "operation-would-execute",
        "state-transition",
        "operation-success",
        "session-end",
      ],
      errorCode: "guard-failed",
    },
  });

  const result = await createReplaySession().run(guarded, scenario);

  assert.equal(result.matchedExpected, true);
  assert.equal(
    result.events.some(
      (event) => event.payload.operationId === "recovery-wait",
    ),
    false,
  );
});

test("takes the exact failure edge and executes recovery", async () => {
  const scenario = replayScenario({
    responses: [
      {
        kind: "failure",
        operationId: "main-wait",
        failureClass: "interrupted",
      },
      {
        kind: "success",
        operationId: "recovery-wait",
        outputs: [{ name: "elapsed", type: "duration-ms", value: 1 }],
      },
    ],
    expected: {
      terminalStateId: "ready",
      eventKinds: [
        "session-start",
        "operation-would-execute",
        "operation-failure",
        "recovery-start",
        "operation-would-execute",
        "operation-success",
        "session-end",
      ],
      errorCode: "interrupted",
    },
  });
  const result = await createReplaySession().run(
    procedure(),
    scenario,
  );
  assert.equal(result.terminalStateId, "ready");
  assert.equal(result.errorCode, "interrupted");
});

test("uses engine interruption disposition after success", async () => {
  const base = procedure();
  const interruptedProcedure = procedure({
    operations: [
      {
        ...base.operations[0],
        engineFailureEdges: [
          base.operations[0].engineFailureEdges[0],
          { failureClass: "interrupted", terminalFailure: true },
        ],
      },
      base.operations[1],
    ],
  });
  const scenario = replayScenario({
    responses: [
      ...replayScenario().responses,
      { kind: "interruption", afterOperationId: "main-wait" },
    ],
    expected: {
      terminalStateId: "ready",
      eventKinds: [
        "session-start",
        "operation-would-execute",
        "operation-failure",
        "session-end",
      ],
      errorCode: "interrupted",
    },
  });
  const result = await createReplaySession().run(
    interruptedProcedure,
    scenario,
  );
  assert.equal(result.matchedExpected, true);
});

test("strictly validates runtime inputs and digest tags", async () => {
  const withInput = procedure({
    runtimeInputs: [
      { id: "delay", type: "duration-ms", required: true },
    ],
    operations: [
      {
        ...procedure().operations[0],
        arguments: [
          {
            inputName: "duration",
            value: { kind: "runtime-input", inputId: "delay" },
          },
        ],
      },
      procedure().operations[1],
    ],
  });
  await assert.rejects(
    createReplaySession().run(withInput, replayScenario()),
    (error) =>
      error.code === "invalid-document" &&
      error.message.includes("missing runtime input"),
  );
  await assert.rejects(
    createReplaySession().run(
      procedure(),
      replayScenario({
        inputs: [{ name: "digestValue", type: "digest", value: "not-a-digest" }],
      }),
    ),
    (error) =>
      error.code === "invalid-document" &&
      error.message.includes("does not match digest"),
  );

  const withMemberFilenames = procedure({
    runtimeInputs: [
      { id: "member-filenames", type: "string-list", required: true },
    ],
  });
  const memberScenario = replayScenario({
    inputs: [{
      name: "member-filenames",
      type: "string-list",
      value: ["exact-member-one", "exact-member-two"],
    }],
  });
  const memberResult = await createReplaySession().run(
    withMemberFilenames,
    memberScenario,
  );
  assert.equal(memberResult.matchedExpected, true);
});

test("records typed confirmation acceptance and decline", async () => {
  const confirmedProcedure = procedure({
    confirmations: [
      {
        id: "confirmrun",
        safetyClasses: ["host-read"],
        prompt: "Run the replay step?",
      },
    ],
    flows: [
      {
        ...procedure().flows[0],
        confirmations: [
          { kind: "confirmation", confirmationId: "confirmrun" },
        ],
      },
    ],
  });
  const accepted = replayScenario({
    inputs: [{ name: "confirmrun", type: "boolean", value: true }],
    expected: {
      terminalStateId: "completed",
      eventKinds: [
        "session-start",
        "confirmation",
        "operation-would-execute",
        "state-transition",
        "operation-success",
        "session-end",
      ],
      errorCode: null,
    },
  });
  const acceptedResult = await createReplaySession().run(
    confirmedProcedure,
    accepted,
  );
  assert.equal(acceptedResult.matchedExpected, true);

  const declined = replayScenario({
    inputs: [{ name: "confirmrun", type: "boolean", value: false }],
    responses: [],
    expected: {
      terminalStateId: "ready",
      eventKinds: ["session-start", "confirmation", "session-end"],
      errorCode: "confirmation-declined",
    },
  });
  const declinedResult = await createReplaySession().run(
    confirmedProcedure,
    declined,
  );
  assert.equal(declinedResult.matchedExpected, true);
});

test("replays by scenario against an injected procedure catalog", async () => {
  const catalog = loadProcedureCatalog([procedure()]);
  const result = await createReplaySession({
    procedureCatalog: catalog,
  }).replay(replayScenario());
  assert.equal(result.procedureId, "install.synthetic");
});

test("Samsung refusal paths emit no write or unlock operations", async () => {
  const procedures = loadProcedureCatalog();
  const scenarios = loadReplayScenarioCatalog();
  const safeScenarioIds = new Set([
    "samsung-ayia-wrong-build-guard",
    "samsung-ayke-rollback-unverified",
    "samsung-normal-disabled-plan",
    "samsung-u2-rollback-refusal",
    "samsung-unknown-build-refusal",
  ]);
  const forbidden = [
    "flash",
    "accept-oem-unlock",
    "enable-oem-unlocking",
    "enter-oem-unlock-confirmation",
  ];
  for (const scenario of scenarios.filter(({ id }) => safeScenarioIds.has(id))) {
    const result = await createReplaySession({
      procedureCatalog: procedures,
    }).replay(scenario);
    assert.equal(result.matchedExpected, true, scenario.id);
    const operationIds = result.events
      .map((event) => event.payload.operationId ?? "")
      .filter(Boolean);
    assert.equal(
      operationIds.some((operationId) =>
        forbidden.some((marker) => operationId.includes(marker))
      ),
      false,
      scenario.id,
    );
  }

  const interrupted = scenarios.find(
    ({ id }) => id === "samsung-unlock-wipe-interruption",
  );
  assert.notEqual(interrupted, undefined);
  const interruptedResult = await createReplaySession({
    procedureCatalog: procedures,
  }).replay(interrupted);
  assert.equal(interruptedResult.terminalStateId, "unlock-outcome-unknown");

  for (const scenarioId of [
    "samsung-simulation-only-unqualified-write-failure",
    "samsung-simulation-only-unqualified-write-interruption",
  ]) {
    const scenario = scenarios.find(({ id }) => id === scenarioId);
    assert.notEqual(scenario, undefined);
    const result = await createReplaySession({
      procedureCatalog: procedures,
    }).replay(scenario);
    assert.equal(result.matchedExpected, true, scenarioId);
    assert.equal(result.terminalStateId, "flash-outcome-unknown", scenarioId);
  }
});
