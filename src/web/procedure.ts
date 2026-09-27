import procedureSchema from "../../recipes/install-procedure-v1.schema.json";

import { fail } from "./errors";
import { deepFreeze, parseAndValidate } from "./schema";
import { procedureRegistry, registryOperations } from "./v1-contract";
import type {
  InstallProcedure,
  PlanProcedureOptions,
  Predicate,
  ProcedureFlow,
  ProcedurePlan,
  ProcedureRecovery,
  ProcedureRegistry,
  ProcedureValidationOptions,
  RegistryOperation,
  TargetRecord,
  ValueRef,
} from "./v1-types";

function graphError(path: string, detail: string): never {
  throw fail("graph-invalid", `${path}: ${detail}`);
}

function uniqueById<T extends { readonly id: string }>(
  values: readonly T[],
  path: string,
): Map<string, T> {
  const result = new Map<string, T>();
  values.forEach((value, index) => {
    if (result.has(value.id)) {
      graphError(`${path}/${index}/id`, `duplicate ID ${JSON.stringify(value.id)}`);
    }
    result.set(value.id, value);
  });
  return result;
}

function registryMap(registry: ProcedureRegistry): Map<string, RegistryOperation> {
  if (registry === procedureRegistry) {
    return new Map(registryOperations);
  }
  return uniqueById(registry.operations, "$registry/operations");
}

function scalarMatchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "boolean":
      return typeof value === "boolean";
    case "duration-ms":
      return Number.isSafeInteger(value) && (value as number) >= 0;
    case "integer":
      return Number.isSafeInteger(value);
    case "digest":
      return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
    case "string-list":
      return Array.isArray(value) && value.every((item) => typeof item === "string");
    default:
      return typeof value === "string";
  }
}

interface Closure {
  readonly artifacts: ReadonlySet<string>;
  readonly backups: ReadonlySet<string>;
  readonly operations: ReadonlyMap<string, InstallProcedure["operations"][number]>;
  readonly partitions: ReadonlySet<string>;
  readonly runtimeInputs: ReadonlyMap<string, string>;
  readonly states: ReadonlySet<string>;
  readonly registry: ReadonlyMap<string, RegistryOperation>;
  readonly valueTypes: ReadonlySet<string>;
}

export function valueRefType(
  reference: ValueRef,
  closure: Closure,
  path: string,
): string {
  switch (reference.kind) {
    case "artifact":
      if (!closure.artifacts.has(reference.artifactId)) {
        graphError(path, `unknown artifact ${JSON.stringify(reference.artifactId)}`);
      }
      return "artifact-ref";
    case "backup":
      if (!closure.backups.has(reference.backupId)) {
        graphError(path, `unknown backup ${JSON.stringify(reference.backupId)}`);
      }
      return "backup-ref";
    case "partition":
      if (!closure.partitions.has(reference.partitionId)) {
        graphError(path, `unknown partition ${JSON.stringify(reference.partitionId)}`);
      }
      return "partition-ref";
    case "state":
      if (!closure.states.has(reference.stateId)) {
        graphError(path, `unknown state ${JSON.stringify(reference.stateId)}`);
      }
      return "state-ref";
    case "runtime-input": {
      const type = closure.runtimeInputs.get(reference.inputId);
      if (type === undefined) {
        graphError(path, `unknown runtime input ${JSON.stringify(reference.inputId)}`);
      }
      return type;
    }
    case "constant":
      if (!closure.valueTypes.has(reference.valueType)) {
        graphError(path, `unknown value type ${JSON.stringify(reference.valueType)}`);
      }
      if (
        [
          "artifact-ref",
          "backup-ref",
          "device-ref",
          "partition-ref",
          "state-ref",
        ].includes(reference.valueType)
      ) {
        graphError(path, `reference type ${reference.valueType} cannot be a constant`);
      }
      if (!scalarMatchesType(reference.value, reference.valueType)) {
        graphError(path, `constant does not match ${reference.valueType}`);
      }
      return reference.valueType;
    case "operation-output": {
      const producer = closure.operations.get(reference.operationId);
      if (producer === undefined) {
        graphError(path, `unknown operation ${JSON.stringify(reference.operationId)}`);
      }
      const variant = closure.registry.get(producer.variant);
      const output = variant?.outputs.find((candidate) => candidate.name === reference.outputName);
      if (output === undefined) {
        graphError(
          path,
          `unknown output ${JSON.stringify(reference.outputName)} on ${JSON.stringify(reference.operationId)}`,
        );
      }
      return output.type;
    }
  }
}

function validatePredicate(
  predicate: Predicate,
  closure: Closure,
  path: string,
): void {
  if (predicate.kind === "state-assertion") {
    if (!closure.states.has(predicate.state.stateId)) {
      graphError(path, `unknown state ${JSON.stringify(predicate.state.stateId)}`);
    }
    return;
  }
  if (predicate.kind === "output-present") {
    valueRefType(predicate.value, closure, `${path}/value`);
    return;
  }
  const left = valueRefType(predicate.left, closure, `${path}/left`);
  const right = valueRefType(predicate.right, closure, `${path}/right`);
  if (left !== right) {
    graphError(path, `predicate compares incompatible types ${left} and ${right}`);
  }
  if (predicate.kind === "digest-equals" && left !== "digest") {
    graphError(path, "digest-equals requires digest operands");
  }
}

function operationOutputReferences(value: ValueRef): readonly string[] {
  return value.kind === "operation-output" ? [value.operationId] : [];
}

function predicateOutputReferences(predicate: Predicate): readonly string[] {
  if (predicate.kind === "state-assertion") {
    return [];
  }
  if (predicate.kind === "output-present") {
    return [predicate.value.operationId];
  }
  return [
    ...operationOutputReferences(predicate.left),
    ...operationOutputReferences(predicate.right),
  ];
}

function validateSequenceOrdering(
  operationIds: readonly string[],
  operations: ReadonlyMap<string, InstallProcedure["operations"][number]>,
  path: string,
): void {
  const prior = new Set<string>();
  const inSequence = new Set(operationIds);
  operationIds.forEach((operationId, index) => {
    const operation = operations.get(operationId);
    if (operation === undefined) {
      return;
    }
    const references = [
      ...operation.arguments.flatMap((argument) => operationOutputReferences(argument.value)),
      ...operation.guards.flatMap(predicateOutputReferences),
    ];
    for (const producer of references) {
      if (inSequence.has(producer) && !prior.has(producer)) {
        graphError(
          `${path}/${index}`,
          `operation ${JSON.stringify(operationId)} consumes output from non-prior operation ${JSON.stringify(producer)}`,
        );
      }
    }
    prior.add(operationId);
  });
}

function targetFor(
  procedure: InstallProcedure,
  targets: ProcedureValidationOptions["targetCatalog"],
): TargetRecord | undefined {
  if (targets === undefined) {
    return undefined;
  }
  const target = targets.find((candidate) => candidate.id === procedure.targetId);
  if (target === undefined) {
    throw fail(
      "closure-unresolved",
      `$.targetId: unknown target ${JSON.stringify(procedure.targetId)}`,
    );
  }
  return target;
}

export function validateProcedureDocument(
  procedure: InstallProcedure,
  options: ProcedureValidationOptions = {},
): InstallProcedure {
  const registry = options.registry ?? procedureRegistry;
  const registryById = registryMap(registry);
  const valueTypes = new Set(registry.valueTypes);
  const safetyClasses = new Set(registry.safetyClasses);
  const artifacts = uniqueById(procedure.artifacts, "$/artifacts");
  const partitions = uniqueById(procedure.partitions, "$/partitions");
  const backups = uniqueById(procedure.backups, "$/backups");
  const states = uniqueById(procedure.states, "$/states");
  const confirmations = uniqueById(procedure.confirmations, "$/confirmations");
  const operations = uniqueById(procedure.operations, "$/operations");
  const flows = uniqueById(procedure.flows, "$/flows");
  const recoveries = uniqueById(procedure.recovery, "$/recovery");
  const runtimeInputs = uniqueById(procedure.runtimeInputs, "$/runtimeInputs");
  targetFor(procedure, options.targetCatalog);

  const initialStates = procedure.states.filter((state) => state.initial);
  if (initialStates.length === 0) {
    graphError("$/states", "at least one initial state is required");
  }
  for (const kind of new Set(procedure.states.map((state) => state.kind))) {
    if (initialStates.filter((state) => state.kind === kind).length > 1) {
      graphError("$/states", `state dimension ${kind} has multiple initial states`);
    }
  }
  for (const [id, input] of runtimeInputs) {
    if (!valueTypes.has(input.type)) {
      graphError(
        `$/runtimeInputs/${id}/type`,
        `unknown runtime input type ${JSON.stringify(input.type)}`,
      );
    }
  }

  const closure: Closure = {
    artifacts: new Set(artifacts.keys()),
    backups: new Set(backups.keys()),
    operations,
    partitions: new Set(partitions.keys()),
    runtimeInputs: new Map(
      [...runtimeInputs].map(([id, input]) => [id, input.type]),
    ),
    states: new Set(states.keys()),
    registry: registryById,
    valueTypes,
  };

  procedure.backups.forEach((backup, index) => {
    if (!partitions.has(backup.partition.partitionId)) {
      graphError(
        `$/backups/${index}/partition/partitionId`,
        `unknown partition ${JSON.stringify(backup.partition.partitionId)}`,
      );
    }
  });

  procedure.confirmations.forEach((confirmation, index) => {
    confirmation.safetyClasses.forEach((safetyClass, safetyIndex) => {
      if (!safetyClasses.has(safetyClass)) {
        graphError(
          `$/confirmations/${index}/safetyClasses/${safetyIndex}`,
          `unknown safety class ${JSON.stringify(safetyClass)}`,
        );
      }
    });
  });

  procedure.operations.forEach((operation, operationIndex) => {
    const path = `$/operations/${operationIndex}`;
    const semantics = registryById.get(operation.variant);
    if (semantics === undefined) {
      graphError(`${path}/variant`, `unknown operation variant ${JSON.stringify(operation.variant)}`);
    }
    const argumentsByName = new Map<string, typeof operation.arguments[number]>();
    operation.arguments.forEach((argument, argumentIndex) => {
      if (argumentsByName.has(argument.inputName)) {
        graphError(
          `${path}/arguments/${argumentIndex}/inputName`,
          `duplicate input ${JSON.stringify(argument.inputName)}`,
        );
      }
      const port = semantics.inputs.find((candidate) => candidate.name === argument.inputName);
      if (port === undefined) {
        graphError(
          `${path}/arguments/${argumentIndex}/inputName`,
          `unknown input ${JSON.stringify(argument.inputName)}`,
        );
      }
      const actualType = valueRefType(
        argument.value,
        closure,
        `${path}/arguments/${argumentIndex}/value`,
      );
      if (actualType !== port.type) {
        graphError(
          `${path}/arguments/${argumentIndex}/value`,
          `input ${argument.inputName} requires ${port.type}, got ${actualType}`,
        );
      }
      argumentsByName.set(argument.inputName, argument);
    });
    for (const port of semantics.inputs) {
      if (port.required && !argumentsByName.has(port.name)) {
        graphError(`${path}/arguments`, `missing required input ${JSON.stringify(port.name)}`);
      }
    }
    operation.guards.forEach((predicate, index) => {
      validatePredicate(predicate, closure, `${path}/guards/${index}`);
    });
    operation.postconditions.forEach((predicate, index) => {
      validatePredicate(predicate, closure, `${path}/postconditions/${index}`);
    });

    const edges = new Map<string, typeof operation.failureEdges[number]>();
    operation.failureEdges.forEach((edge, edgeIndex) => {
      if (edges.has(edge.failureClass)) {
        graphError(
          `${path}/failureEdges/${edgeIndex}`,
          `duplicate failure edge ${JSON.stringify(edge.failureClass)}`,
        );
      }
      if (!semantics.failureClasses.includes(edge.failureClass)) {
        graphError(
          `${path}/failureEdges/${edgeIndex}/failureClass`,
          `failure class is not declared by ${semantics.id}`,
        );
      }
      if ("recoveryId" in edge && !recoveries.has(edge.recoveryId)) {
        graphError(
          `${path}/failureEdges/${edgeIndex}/recoveryId`,
          `unknown recovery ${JSON.stringify(edge.recoveryId)}`,
        );
      }
      edges.set(edge.failureClass, edge);
    });
    const declaredFailures = new Set(semantics.failureClasses);
    if (
      edges.size !== declaredFailures.size ||
      [...edges.keys()].some((failureClass) => !declaredFailures.has(failureClass))
    ) {
      graphError(
        `${path}/failureEdges`,
        "failure edges must exactly cover registry failure classes",
      );
    }

    const engineEdges = new Map<string, typeof operation.engineFailureEdges[number]>();
    operation.engineFailureEdges.forEach((edge, edgeIndex) => {
      if (engineEdges.has(edge.failureClass)) {
        graphError(
          `${path}/engineFailureEdges/${edgeIndex}`,
          `duplicate engine failure edge ${JSON.stringify(edge.failureClass)}`,
        );
      }
      if (!["postcondition-failed", "interrupted"].includes(edge.failureClass)) {
        graphError(
          `${path}/engineFailureEdges/${edgeIndex}/failureClass`,
          "unknown engine failure class",
        );
      }
      if ("recoveryId" in edge && !recoveries.has(edge.recoveryId)) {
        graphError(
          `${path}/engineFailureEdges/${edgeIndex}/recoveryId`,
          `unknown recovery ${JSON.stringify(edge.recoveryId)}`,
        );
      }
      engineEdges.set(edge.failureClass, edge);
    });
    if (
      engineEdges.size !== 2 ||
      !engineEdges.has("postcondition-failed") ||
      !engineEdges.has("interrupted")
    ) {
      graphError(
        `${path}/engineFailureEdges`,
        "engine failure edges must exactly cover postcondition-failed and interrupted",
      );
    }

    const fromStates = new Set(operation.fromStates.map((reference) => reference.stateId));
    for (const [index, reference] of operation.fromStates.entries()) {
      if (!states.has(reference.stateId)) {
        graphError(
          `${path}/fromStates/${index}/stateId`,
          `unknown state ${JSON.stringify(reference.stateId)}`,
        );
      }
    }
    if (operation.toState !== null) {
      if (!states.has(operation.toState.stateId)) {
        graphError(
          `${path}/toState/stateId`,
          `unknown state ${JSON.stringify(operation.toState.stateId)}`,
        );
      }
      if (fromStates.has(operation.toState.stateId)) {
        graphError(`${path}/toState`, "operation cannot transition a state to itself");
      }
      if (
        operation.postconditions.some(
          (predicate) =>
            predicate.kind === "state-assertion" &&
            predicate.state.stateId === operation.toState?.stateId &&
            predicate.expected,
        )
      ) {
        graphError(
          `${path}/postconditions`,
          "postcondition cannot assert the operation's applied target state",
        );
      }
    }

    if (operation.variant === "artifact.verify") {
      const expected = argumentsByName.get("expectedDigest")?.value;
      const knownDigests = new Set(
        procedure.artifacts.flatMap((artifact) =>
          artifact.digest.kind === "known" ? [artifact.digest.sha256] : [],
        ),
      );
      if (
        expected?.kind !== "constant" ||
        expected.valueType !== "digest" ||
        typeof expected.value !== "string" ||
        !knownDigests.has(expected.value)
      ) {
        graphError(
          `${path}/arguments`,
          "artifact.verify requires a declared known artifact digest",
        );
      }
    }
  });

  const referencedOperations = new Set<string>();
  const referencedRecoveries = new Set<string>();
  const validateOperationRefs = (
    refs: readonly { readonly operationId: string }[],
    path: string,
  ): string[] =>
    refs.map((reference, index) => {
      if (!operations.has(reference.operationId)) {
        graphError(
          `${path}/${index}/operationId`,
          `unknown operation ${JSON.stringify(reference.operationId)}`,
        );
      }
      referencedOperations.add(reference.operationId);
      return reference.operationId;
    });

  procedure.flows.forEach((flow, flowIndex) => {
    const path = `$/flows/${flowIndex}`;
    if (!states.has(flow.initialState.stateId)) {
      graphError(
        `${path}/initialState/stateId`,
        `unknown state ${JSON.stringify(flow.initialState.stateId)}`,
      );
    }
    if (states.get(flow.initialState.stateId)?.initial !== true) {
      graphError(`${path}/initialState`, "flow must start at a declared initial state");
    }
    flow.guards.forEach((predicate, index) => {
      validatePredicate(predicate, closure, `${path}/guards/${index}`);
    });
    flow.confirmations.forEach((reference, index) => {
      if (!confirmations.has(reference.confirmationId)) {
        graphError(
          `${path}/confirmations/${index}/confirmationId`,
          `unknown confirmation ${JSON.stringify(reference.confirmationId)}`,
        );
      }
    });
    const ids = validateOperationRefs(flow.steps, `${path}/steps`);
    if (new Set(ids).size !== ids.length) {
      graphError(`${path}/steps`, "duplicate operation step");
    }
    validateSequenceOrdering(ids, operations, `${path}/steps`);
  });

  procedure.recovery.forEach((recovery, recoveryIndex) => {
    const path = `$/recovery/${recoveryIndex}`;
    recovery.fromStates.forEach((reference, index) => {
      if (!states.has(reference.stateId)) {
        graphError(
          `${path}/fromStates/${index}/stateId`,
          `unknown state ${JSON.stringify(reference.stateId)}`,
        );
      }
    });
    if (!states.has(recovery.terminalState.stateId)) {
      graphError(
        `${path}/terminalState/stateId`,
        `unknown state ${JSON.stringify(recovery.terminalState.stateId)}`,
      );
    }
    const ids = validateOperationRefs(recovery.steps, `${path}/steps`);
    if (new Set(ids).size !== ids.length) {
      graphError(`${path}/steps`, "duplicate operation step");
    }
    validateSequenceOrdering(ids, operations, `${path}/steps`);
  });

  const unreferenced = [...operations.keys()].filter(
    (id) => !referencedOperations.has(id),
  );
  if (unreferenced.length > 0) {
    graphError("$/operations", `unreferenced operations ${JSON.stringify(unreferenced.sort())}`);
  }

  const enabledFlows = procedure.flows.filter((flow) => flow.enabled);
  if (procedure.enabled && enabledFlows.length !== 1) {
    graphError("$/flows", "enabled procedure must have exactly one enabled flow");
  }

  return deepFreeze(procedure);
}

export function validateProcedure(
  input: string | unknown,
  options: ProcedureValidationOptions = {},
): InstallProcedure {
  const procedure = parseAndValidate<InstallProcedure>(
    input,
    procedureSchema,
    "invalid-document",
  );
  return validateProcedureDocument(procedure, options);
}

function chooseFlow(
  procedure: InstallProcedure,
  flowId: string | undefined,
): ProcedureFlow {
  if (flowId !== undefined) {
    const flow = procedure.flows.find((candidate) => candidate.id === flowId);
    if (flow === undefined) {
      throw fail("graph-invalid", `unknown flow ${JSON.stringify(flowId)}`);
    }
    return flow;
  }
  const enabled = procedure.flows.filter((candidate) => candidate.enabled);
  if (enabled.length === 1 && enabled[0] !== undefined) {
    return enabled[0];
  }
  if (!procedure.enabled && procedure.flows.length === 1 && procedure.flows[0] !== undefined) {
    return procedure.flows[0];
  }
  throw fail("graph-invalid", "flow selection requires exactly one enabled flow");
}

function reachableRecoveryIds(
  flow: ProcedureFlow,
  operations: ReadonlyMap<string, InstallProcedure["operations"][number]>,
  recoveries: ReadonlyMap<string, ProcedureRecovery>,
): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const queue = flow.steps.flatMap(
    (step) => {
      const operation = operations.get(step.operationId);
      return [...(operation?.failureEdges ?? []), ...(operation?.engineFailureEdges ?? [])]
        .flatMap((edge) => ("recoveryId" in edge ? [edge.recoveryId] : []));
    },
  );
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
    const recovery = recoveries.get(id);
    for (const step of recovery?.steps ?? []) {
      const operation = operations.get(step.operationId);
      for (const edge of [
        ...(operation?.failureEdges ?? []),
        ...(operation?.engineFailureEdges ?? []),
      ]) {
        if ("recoveryId" in edge) {
          queue.push(edge.recoveryId);
        }
      }
    }
  }
  return result;
}

function resolveProcedure(
  input: string | unknown,
  options: PlanProcedureOptions,
): InstallProcedure {
  if (
    typeof input === "string" &&
    !input.trimStart().startsWith("{") &&
    options.procedureCatalog !== undefined
  ) {
    const match = options.procedureCatalog.find((candidate) => candidate.id === input);
    if (match === undefined) {
      throw fail("closure-unresolved", `unknown procedure ${JSON.stringify(input)}`);
    }
    return validateProcedureDocument(match, options);
  }
  return validateProcedure(input, options);
}

export function planProcedure(
  input: string | unknown,
  options: PlanProcedureOptions | string = {},
): ProcedurePlan {
  const normalizedOptions =
    typeof options === "string" ? { flowId: options } : options;
  const procedure = resolveProcedure(input, normalizedOptions);
  const flow = chooseFlow(procedure, normalizedOptions.flowId);
  const operations = uniqueById(procedure.operations, "$/operations");
  const recoveries = uniqueById(procedure.recovery, "$/recovery");
  const registry = registryMap(normalizedOptions.registry ?? procedureRegistry);
  targetFor(procedure, normalizedOptions.targetCatalog);
  const steps = [];
  for (const [index, reference] of flow.steps.entries()) {
    const operation = operations.get(reference.operationId);
    const semantics = operation === undefined ? undefined : registry.get(operation.variant);
    if (operation === undefined || semantics === undefined) {
      graphError("$/flows", "validated operation closure changed");
    }
    steps.push({
      index,
      operationId: operation.id,
      variant: operation.variant,
      safetyClass: semantics.safetyClass,
      requiredAdapterCapability: semantics.requiredAdapterCapability,
      stateEffect: semantics.stateEffect,
      enabled: operation.enabled,
      wouldExecute:
        operation.enabled || normalizedOptions.simulateDisabled === true,
    });
  }
  const reachable = [
    ...flow.steps.map((reference) => reference.operationId),
    ...reachableRecoveryIds(flow, operations, recoveries).flatMap(
      (recoveryId) =>
        recoveries.get(recoveryId)?.steps.map((reference) => reference.operationId) ?? [],
    ),
  ];
  const requiredCapabilities = [
    ...new Set(
      reachable.flatMap((operationId) => {
        const operation = operations.get(operationId);
        const semantics =
          operation === undefined ? undefined : registry.get(operation.variant);
        return operation?.enabled === true && semantics !== undefined
          ? [semantics.requiredAdapterCapability]
          : [];
      }),
    ),
  ].sort();
  const available =
    normalizedOptions.adapterCapabilities === undefined
      ? new Set(requiredCapabilities)
      : new Set(normalizedOptions.adapterCapabilities);
  return deepFreeze({
    procedureId: procedure.id,
    targetId: procedure.targetId,
    flowId: flow.id,
    procedureEnabled: procedure.enabled,
    flowEnabled: flow.enabled,
    steps,
    requiredCapabilities,
    missingCapabilities: requiredCapabilities.filter(
      (capability) => !available.has(capability),
    ),
    confirmations: flow.confirmations.map((reference) => reference.confirmationId),
  });
}

export function selectedFlow(
  procedure: InstallProcedure,
  flowId: string | undefined,
): ProcedureFlow {
  return chooseFlow(procedure, flowId);
}
