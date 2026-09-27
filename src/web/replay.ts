import scenarioSchema from "../../replay/scenario-v1.schema.json";

import { fail, MuraFlashError } from "./errors";
import {
  planProcedure,
  selectedFlow,
  validateProcedure,
  validateProcedureDocument,
} from "./procedure";
import { canonicalJson, deepFreeze, parseAndValidate } from "./schema";
import {
  contractV1,
  procedureRegistry,
  registryOperations,
} from "./v1-contract";
import type {
  FailureEdge,
  InstallProcedure,
  Predicate,
  ProcedureFlow,
  ProcedurePlan,
  ProcedureRecovery,
  ReplayResult,
  ReplayScenario,
  ReplaySessionOptions,
  ScalarValue,
  TranscriptEvent,
  TranscriptPayload,
  TypedValue,
  ValueRef,
} from "./v1-types";

const encoder = new TextEncoder();
const redaction = "<redacted>";

async function sha256(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw fail("contract-mismatch", "Web Crypto SHA-256 is unavailable");
  }
  const digest = await subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function scalarMatchesType(value: ScalarValue, type: string): boolean {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "duration-ms") {
    return Number.isSafeInteger(value) && (value as number) >= 0;
  }
  if (type === "integer") return Number.isSafeInteger(value);
  if (type === "digest") {
    return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
  }
  return typeof value === "string";
}

function typedMap(values: readonly TypedValue[], label: string): Map<string, TypedValue> {
  const result = new Map<string, TypedValue>();
  for (const value of values) {
    if (result.has(value.name)) {
      throw fail("invalid-document", `duplicate ${label} ${JSON.stringify(value.name)}`);
    }
    if (!procedureRegistry.valueTypes.includes(value.type)) {
      throw fail("invalid-document", `${label} uses unknown type ${value.type}`);
    }
    if (!scalarMatchesType(value.value, value.type)) {
      throw fail("invalid-document", `${label} ${value.name} does not match ${value.type}`);
    }
    result.set(value.name, value);
  }
  return result;
}

const outputKey = (operationId: string, outputName: string): string =>
  `${operationId}\u0000${outputName}`;

interface Values {
  readonly inputs: ReadonlyMap<string, TypedValue>;
  readonly outputs: Map<string, TypedValue>;
  readonly states: Map<string, boolean>;
  currentStateId: string;
}

function refValue(reference: ValueRef, values: Values): TypedValue {
  if (reference.kind === "constant") {
    if (
      typeof reference.value !== "string" &&
      typeof reference.value !== "number" &&
      typeof reference.value !== "boolean"
    ) {
      throw fail("contract-mismatch", "string-list cannot be used as a replay scalar");
    }
    return { name: "constant", type: reference.valueType, value: reference.value };
  }
  if (reference.kind === "operation-output") {
    const result = values.outputs.get(outputKey(reference.operationId, reference.outputName));
    if (result === undefined) {
      throw fail("guard-failed", `output ${reference.operationId}.${reference.outputName} unavailable`);
    }
    return result;
  }
  if (reference.kind === "runtime-input") {
    const result = values.inputs.get(reference.inputId);
    if (result === undefined) {
      throw fail("guard-failed", `runtime input ${reference.inputId} unavailable`);
    }
    return result;
  }
  if (reference.kind === "state") {
    return {
      name: reference.stateId,
      type: "state-ref",
      value: values.states.get(reference.stateId) ?? false,
    };
  }
  const [name, type] =
    reference.kind === "artifact"
      ? [reference.artifactId, "artifact-ref"]
      : reference.kind === "partition"
        ? [reference.partitionId, "partition-ref"]
        : [reference.backupId, "backup-ref"];
  return values.inputs.get(name) ?? { name, type, value: name };
}

function predicatePasses(predicate: Predicate, values: Values): boolean {
  if (predicate.kind === "state-assertion") {
    return (values.states.get(predicate.state.stateId) ?? false) === predicate.expected;
  }
  if (predicate.kind === "output-present") {
    return values.outputs.has(outputKey(predicate.value.operationId, predicate.value.outputName));
  }
  const left = refValue(predicate.left, values);
  const right = refValue(predicate.right, values);
  const equal =
    left.type === right.type &&
    typeof left.value === typeof right.value &&
    Object.is(left.value, right.value);
  return predicate.kind === "not-equals" ? !equal : equal;
}

function validateOutputs(
  operation: InstallProcedure["operations"][number],
  outputs: readonly TypedValue[],
): readonly TypedValue[] {
  const semantics = registryOperations.get(operation.variant);
  if (semantics === undefined) {
    throw fail("contract-mismatch", `unknown operation variant ${operation.variant}`);
  }
  const byName = typedMap(outputs, `output from ${operation.id}`);
  for (const [name, output] of byName) {
    const port = semantics.outputs.find((candidate) => candidate.name === name);
    if (port === undefined || port.type !== output.type) {
      throw fail("replay-mismatch", `undeclared output ${name}:${output.type} from ${operation.id}`);
    }
  }
  for (const port of semantics.outputs) {
    if (port.required && !byName.has(port.name)) {
      throw fail("replay-mismatch", `${operation.id} omitted output ${port.name}`);
    }
  }
  return semantics.outputs.flatMap((port) => {
    const output = byName.get(port.name);
    return output === undefined ? [] : [output];
  });
}

function redact(value: unknown, secrets: ReadonlySet<string>): unknown {
  if (typeof value === "string") {
    let result = value;
    for (const secret of [...secrets].sort(
      (left, right) => right.length - left.length || (left < right ? -1 : left > right ? 1 : 0),
    )) {
      result = result.replaceAll(secret, redaction);
    }
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, secrets));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, redact(child, secrets)]),
    );
  }
  return value;
}

function timestamp(clock: ReplayScenario["clock"], sequence: number): string {
  const start = Date.parse(clock.startTimestamp);
  if (!Number.isFinite(start)) {
    throw fail("invalid-document", "invalid replay clock startTimestamp");
  }
  return new Date(start + sequence * clock.tickMs).toISOString();
}

class Transcript {
  readonly #clock: ReplayScenario["clock"];
  readonly #events: TranscriptEvent[] = [];
  readonly #sessionId: string;
  readonly #secrets = new Set<string>();

  constructor(sessionId: string, clock: ReplayScenario["clock"]) {
    this.#sessionId = sessionId;
    this.#clock = clock;
  }

  get events(): readonly TranscriptEvent[] {
    return this.#events;
  }

  get secrets(): ReadonlySet<string> {
    return this.#secrets;
  }

  addSecret(value: string): void {
    if (value !== "") this.#secrets.add(value);
  }

  async append(payload: TranscriptPayload): Promise<void> {
    const sequence = this.#events.length;
    const withoutHash = {
      schema: contractV1.eventRules.schema,
      sessionId: this.#sessionId,
      sequence,
      timestamp: timestamp(this.#clock, sequence),
      previousHash:
        sequence === 0
          ? contractV1.eventRules.previousHashForFirstEvent
          : this.#events[sequence - 1]?.eventHash ?? null,
      payload: redact(payload, this.#secrets) as TranscriptPayload,
    };
    this.#events.push(
      deepFreeze({
        ...withoutHash,
        eventHash: await sha256(canonicalJson(withoutHash)),
      } as TranscriptEvent),
    );
  }
}

class ReplayAbort extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

type Outcome =
  | { readonly kind: "success" }
  | {
      readonly kind: "failure";
      readonly failureClass: string;
      readonly engine: boolean;
    };

interface RunState {
  readonly activeRecoveries: Set<string>;
  readonly durations: ReadonlyMap<string, number>;
  readonly operations: ReadonlyMap<string, InstallProcedure["operations"][number]>;
  readonly procedure: InstallProcedure;
  readonly responses: ReplayScenario["responses"];
  readonly effects: {
    operationId: string;
    stateEffect: string;
    outputs: readonly TypedValue[];
  }[];
  readonly transcript: Transcript;
  readonly values: Values;
  responseIndex: number;
}

function edgeFor(
  operation: InstallProcedure["operations"][number],
  failureClass: string,
  engine: boolean,
): FailureEdge {
  const edge = (engine ? operation.engineFailureEdges : operation.failureEdges).find(
    (candidate) => candidate.failureClass === failureClass,
  );
  if (edge === undefined) {
    throw fail("replay-mismatch", `${operation.id} has no ${failureClass} disposition`);
  }
  return edge;
}

function activeFrom(operation: InstallProcedure["operations"][number], values: Values): string {
  const reference = operation.fromStates.find(
    (candidate) => values.states.get(candidate.stateId) === true,
  );
  if (reference === undefined) throw new ReplayAbort("guard-failed");
  return reference.stateId;
}

function applyDestination(
  procedure: InstallProcedure,
  operation: InstallProcedure["operations"][number],
  values: Values,
): void {
  if (operation.toState === null) return;
  const destination = procedure.states.find(
    (candidate) => candidate.id === operation.toState?.stateId,
  );
  if (destination === undefined) {
    throw fail("contract-mismatch", `unknown destination ${operation.toState.stateId}`);
  }
  values.states.set(destination.id, true);
  values.currentStateId = destination.id;
}

async function execute(
  operation: InstallProcedure["operations"][number],
  state: RunState,
): Promise<Outcome> {
  const durationMs = state.durations.get(operation.id);
  if (durationMs === undefined) {
    throw fail("replay-mismatch", `missing duration for ${operation.id}`);
  }
  activeFrom(operation, state.values);
  const previousStateId = state.values.currentStateId;
  if (!operation.guards.every((predicate) => predicatePasses(predicate, state.values))) {
    throw new ReplayAbort("guard-failed");
  }
  await state.transcript.append(
    operation.enabled
      ? { kind: "operation-start", operationId: operation.id, variant: operation.variant }
      : {
          kind: "operation-would-execute",
          operationId: operation.id,
          variant: operation.variant,
          durationMs,
        },
  );
  const response = state.responses[state.responseIndex];
  if (response === undefined || response.kind === "interruption") {
    throw fail("replay-mismatch", `missing response for ${operation.id}`);
  }
  state.responseIndex += 1;
  if (response.operationId !== operation.id) {
    throw fail("replay-mismatch", `expected ${operation.id}, got ${response.operationId}`);
  }
  if (response.kind === "failure") {
    const semantics = registryOperations.get(operation.variant);
    if (semantics?.failureClasses.includes(response.failureClass) !== true) {
      throw fail("replay-mismatch", `${response.failureClass} is invalid for ${operation.variant}`);
    }
    await state.transcript.append({
      kind: "operation-failure",
      operationId: operation.id,
      failureClass: response.failureClass,
      durationMs,
    });
    return { kind: "failure", failureClass: response.failureClass, engine: false };
  }

  const outputs = validateOutputs(operation, response.outputs);
  const semantics = registryOperations.get(operation.variant);
  if (semantics === undefined) throw fail("contract-mismatch", operation.variant);
  const sensitive = semantics.algorithmParameters.some(
    (parameter) => parameter.name === "sensitive-input" && parameter.value === true,
  );
  if (sensitive) {
    for (const output of outputs) {
      if (typeof output.value === "string") state.transcript.addSecret(output.value);
    }
  }
  for (const output of outputs) {
    state.values.outputs.set(outputKey(operation.id, output.name), output);
  }
  state.effects.push({
    operationId: operation.id,
    stateEffect: semantics.stateEffect,
    outputs: [...outputs].sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    ),
  });
  if (!operation.postconditions.every((predicate) => predicatePasses(predicate, state.values))) {
    await state.transcript.append({
      kind: "operation-failure",
      operationId: operation.id,
      failureClass: "postcondition-failed",
      durationMs,
    });
    return { kind: "failure", failureClass: "postcondition-failed", engine: true };
  }
  const interruption = state.responses[state.responseIndex];
  if (
    interruption?.kind === "interruption" &&
    interruption.afterOperationId === operation.id
  ) {
    state.responseIndex += 1;
    await state.transcript.append({
      kind: "operation-failure",
      operationId: operation.id,
      failureClass: "interrupted",
      durationMs,
    });
    return { kind: "failure", failureClass: "interrupted", engine: true };
  }
  applyDestination(state.procedure, operation, state.values);
  if (operation.toState !== null) {
    await state.transcript.append({
      kind: "state-transition",
      fromStateId: previousStateId,
      toStateId: operation.toState.stateId,
      operationId: operation.id,
    });
  }
  await state.transcript.append({
    kind: "operation-success",
    operationId: operation.id,
    outputs,
    durationMs,
  });
  return { kind: "success" };
}

function recovery(procedure: InstallProcedure, id: string): ProcedureRecovery {
  const result = procedure.recovery.find((candidate) => candidate.id === id);
  if (result === undefined) throw fail("contract-mismatch", `missing recovery ${id}`);
  return result;
}

async function handleFailure(
  operation: InstallProcedure["operations"][number],
  outcome: Extract<Outcome, { readonly kind: "failure" }>,
  state: RunState,
): Promise<void> {
  const edge = edgeFor(operation, outcome.failureClass, outcome.engine);
  if ("recoveryId" in edge) {
    await runRecovery(recovery(state.procedure, edge.recoveryId), outcome.failureClass, state);
  }
}

async function runRecovery(
  selected: ProcedureRecovery,
  trigger: string,
  state: RunState,
): Promise<void> {
  if (
    state.activeRecoveries.has(selected.id) ||
    !selected.fromStates.some((item) => state.values.states.get(item.stateId) === true)
  ) {
    throw new ReplayAbort("replay-mismatch");
  }
  state.activeRecoveries.add(selected.id);
  await state.transcript.append({
    kind: "recovery-start",
    recoveryId: selected.id,
    trigger,
  });
  try {
    for (const reference of selected.steps) {
      const operation = state.operations.get(reference.operationId);
      if (operation === undefined) throw fail("contract-mismatch", reference.operationId);
      const outcome = await execute(operation, state);
      if (outcome.kind === "failure") {
        await handleFailure(operation, outcome, state);
        throw new ReplayAbort(outcome.failureClass);
      }
    }
    const terminal = state.procedure.states.find(
      (item) => item.id === selected.terminalState.stateId,
    );
    if (terminal === undefined) throw fail("contract-mismatch", selected.terminalState.stateId);
    if (terminal.id !== state.values.currentStateId) {
      const previous = state.values.currentStateId;
      state.values.states.set(terminal.id, true);
      state.values.currentStateId = terminal.id;
      const operationId = selected.steps[selected.steps.length - 1]?.operationId;
      if (operationId !== undefined) {
        await state.transcript.append({
          kind: "state-transition",
          fromStateId: previous,
          toStateId: terminal.id,
          operationId,
        });
      }
    }
    state.values.currentStateId = terminal.id;
    state.values.states.set(terminal.id, true);
  } finally {
    state.activeRecoveries.delete(selected.id);
  }
}

function reachable(procedure: InstallProcedure, flow: ProcedureFlow): readonly string[] {
  const operations = new Map(procedure.operations.map((item) => [item.id, item]));
  const recoveries = new Map(procedure.recovery.map((item) => [item.id, item]));
  const result: string[] = [];
  const seenOperations = new Set<string>();
  const seenRecoveries = new Set<string>();
  const visitRecovery = (id: string): void => {
    if (seenRecoveries.has(id)) return;
    seenRecoveries.add(id);
    for (const step of recoveries.get(id)?.steps ?? []) visitOperation(step.operationId);
  };
  const visitOperation = (id: string): void => {
    if (seenOperations.has(id)) return;
    seenOperations.add(id);
    result.push(id);
    const operation = operations.get(id);
    for (const edge of [
      ...(operation?.failureEdges ?? []),
      ...(operation?.engineFailureEdges ?? []),
    ]) {
      if ("recoveryId" in edge) visitRecovery(edge.recoveryId);
    }
  };
  for (const step of flow.steps) visitOperation(step.operationId);
  return result;
}

function resolveProcedure(
  input: string | unknown,
  options: ReplaySessionOptions,
): InstallProcedure {
  if (
    typeof input === "string" &&
    !input.trimStart().startsWith("{") &&
    options.procedureCatalog !== undefined
  ) {
    const result = options.procedureCatalog.find((candidate) => candidate.id === input);
    if (result === undefined) throw fail("closure-unresolved", `unknown procedure ${input}`);
    return validateProcedureDocument(result, options);
  }
  return validateProcedure(input, options);
}

function simulatedPlan(plan: ProcedurePlan): ProcedurePlan {
  return deepFreeze({
    ...plan,
    steps: plan.steps.map((step) => ({ ...step, wouldExecute: true })),
  });
}

function mismatches(
  scenario: ReplayScenario,
  terminalStateId: string,
  errorCode: string | null,
  events: readonly TranscriptEvent[],
): readonly string[] {
  const result: string[] = [];
  if (scenario.expected.terminalStateId !== terminalStateId) result.push("terminalStateId");
  if (
    canonicalJson(scenario.expected.eventKinds) !==
    canonicalJson(events.map((event) => event.payload.kind))
  ) {
    result.push("eventKinds");
  }
  if (scenario.expected.errorCode !== errorCode) result.push("errorCode");
  return result;
}

export class ReplaySession {
  readonly #options: ReplaySessionOptions;
  #transcript: readonly TranscriptEvent[] = [];

  constructor(options: ReplaySessionOptions = {}) {
    this.#options = options;
  }

  get transcript(): readonly TranscriptEvent[] {
    return this.#transcript;
  }

  async replay(
    scenarioInput: string | unknown,
    procedureInput?: string | unknown,
  ): Promise<ReplayResult> {
    const scenario = deepFreeze(
      parseAndValidate<ReplayScenario>(scenarioInput, scenarioSchema, "invalid-document"),
    );
    const procedure =
      procedureInput ??
      this.#options.procedureCatalog?.find((item) => item.id === scenario.procedureId);
    if (procedure === undefined) {
      throw fail("closure-unresolved", `procedure ${scenario.procedureId} unavailable`);
    }
    return this.run(procedure, scenario);
  }

  async run(
    procedureInput: string | unknown,
    scenarioInput: string | unknown,
  ): Promise<ReplayResult> {
    const procedure = resolveProcedure(procedureInput, this.#options);
    const scenario = deepFreeze(
      parseAndValidate<ReplayScenario>(scenarioInput, scenarioSchema, "invalid-document"),
    );
    if (scenario.procedureId !== procedure.id) {
      throw fail("invalid-document", "scenario procedureId does not match procedure");
    }
    const flow = selectedFlow(procedure, scenario.flowId);
    const plan = simulatedPlan(
      planProcedure(procedure, {
        ...this.#options,
        flowId: flow.id,
        adapterCapabilities: scenario.adapterCapabilities,
        simulateDisabled: scenario.simulateDisabled,
      }),
    );
    const inputs = typedMap(scenario.inputs, "replay input");
    for (const declared of procedure.runtimeInputs) {
      const supplied = inputs.get(declared.id);
      if (declared.required && supplied === undefined) {
        throw fail("invalid-document", `missing runtime input ${declared.id}`);
      }
      if (supplied !== undefined && supplied.type !== declared.type) {
        throw fail("invalid-document", `${declared.id} requires ${declared.type}`);
      }
    }
    const durations = new Map<string, number>();
    for (const item of scenario.operationDurations) {
      if (durations.has(item.operationId)) {
        throw fail("invalid-document", `duplicate duration for ${item.operationId}`);
      }
      if (!procedure.operations.some((operation) => operation.id === item.operationId)) {
        throw fail("invalid-document", `unknown duration operation ${item.operationId}`);
      }
      durations.set(item.operationId, item.durationMs);
    }
    for (const [index, response] of scenario.responses.entries()) {
      const operationId =
        response.kind === "interruption"
          ? response.afterOperationId
          : response.operationId;
      if (!procedure.operations.some((operation) => operation.id === operationId)) {
        throw fail(
          "invalid-document",
          `response ${index} names unknown operation ${operationId}`,
        );
      }
      if (!durations.has(operationId)) {
        throw fail(
          "invalid-document",
          `missing operation duration for ${operationId}`,
        );
      }
      if (response.kind === "success") {
        typedMap(response.outputs, `response ${index} output`);
      }
    }
    const transcript = new Transcript(
      this.#options.sessionId ?? scenario.id,
      scenario.clock,
    );
    const values: Values = {
      inputs,
      outputs: new Map(),
      states: new Map(procedure.states.map((state) => [state.id, state.initial])),
      currentStateId: flow.initialState.stateId,
    };
    for (const operation of procedure.operations) {
      const semantics = registryOperations.get(operation.variant);
      if (
        semantics?.algorithmParameters.some(
          (parameter) => parameter.name === "sensitive-input" && parameter.value === true,
        ) !== true
      ) {
        continue;
      }
      for (const argument of operation.arguments) {
        try {
          const value = refValue(argument.value, values).value;
          if (typeof value === "string") transcript.addSecret(value);
        } catch {
          // A producer output can be unavailable until its operation is simulated.
        }
      }
    }
    const operations = new Map(procedure.operations.map((item) => [item.id, item]));
    const state: RunState = {
      activeRecoveries: new Set(),
      durations,
      operations,
      procedure,
      responses: scenario.responses,
      effects: [],
      transcript,
      values,
      responseIndex: 0,
    };
    await transcript.append({
      kind: "session-start",
      procedureId: procedure.id,
      flowId: flow.id,
    });

    let errorCode: string | null = null;
    try {
      const preflightPredicates = [
        ...flow.guards,
        ...reachable(procedure, flow).flatMap(
          (id) => operations.get(id)?.guards ?? [],
        ),
      ];
      for (const predicate of preflightPredicates) {
        try {
          if (!predicatePasses(predicate, values)) throw new ReplayAbort("guard-failed");
        } catch (error) {
          if (error instanceof MuraFlashError && error.code === "guard-failed") continue;
          throw error;
        }
      }
      if (plan.missingCapabilities.length > 0) throw new ReplayAbort("capability-missing");
      for (const [index, reference] of flow.confirmations.entries()) {
        const answer = inputs.get(reference.confirmationId) ?? inputs.get(`confirmation${index}`);
        const accepted = answer?.type === "boolean" && answer.value === true;
        await transcript.append({
          kind: "confirmation",
          confirmationId: reference.confirmationId,
          accepted,
        });
        if (!accepted) throw new ReplayAbort("confirmation-declined");
      }
      for (const reference of flow.steps) {
        const operation = operations.get(reference.operationId);
        if (operation === undefined) throw fail("contract-mismatch", reference.operationId);
        const outcome = await execute(operation, state);
        if (outcome.kind === "failure") {
          await handleFailure(operation, outcome, state);
          throw new ReplayAbort(outcome.failureClass);
        }
      }
      if (!flow.guards.every((predicate) => predicatePasses(predicate, values))) {
        throw new ReplayAbort("guard-failed");
      }
      if (state.responseIndex !== scenario.responses.length) {
        throw new ReplayAbort("replay-mismatch");
      }
    } catch (error) {
      if (error instanceof ReplayAbort) {
        errorCode = error.code;
      } else if (error instanceof MuraFlashError && error.code === "replay-mismatch") {
        errorCode = "replay-mismatch";
      } else {
        throw error;
      }
    }
    const terminalStateId = values.currentStateId;
    await transcript.append({ kind: "session-end", terminalStateId, errorCode });
    this.#transcript = deepFreeze([...transcript.events]);
    const differences = mismatches(scenario, terminalStateId, errorCode, this.#transcript);
    return deepFreeze({
      scenarioId: scenario.id,
      procedureId: procedure.id,
      flowId: flow.id,
      terminalStateId,
      errorCode,
      matchedExpected: differences.length === 0,
      mismatches: differences,
      plan,
      events: this.#transcript,
      stateEffects: redact(state.effects, transcript.secrets),
    } as ReplayResult);
  }
}

export function createReplaySession(options: ReplaySessionOptions = {}): ReplaySession {
  return new ReplaySession(options);
}

export function validateReplayScenario(
  input: string | unknown,
): ReplayScenario {
  return deepFreeze(
    parseAndValidate<ReplayScenario>(
      input,
      scenarioSchema,
      "invalid-document",
    ),
  );
}
