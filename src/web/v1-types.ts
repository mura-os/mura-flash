export type ScalarValue = string | number | boolean | null;

export interface TypedValue {
  readonly name: string;
  readonly type: string;
  readonly value: ScalarValue;
}

export interface TargetRecord {
  readonly schema: "org.mura.flash.target-record/v1";
  readonly id: string;
  readonly displayName: string;
  readonly vendor: string;
  readonly models: readonly string[];
  readonly codenames: readonly string[];
  readonly enabled: boolean;
  readonly hardwareQualification: "unqualified";
  readonly sourceBehavior: {
    readonly unlockState: "unsupported" | "unknown" | "reported" | "documented" | "open";
    readonly installState: "unsupported" | "incomplete" | "procedure-available";
    readonly summary: string;
  };
  readonly muraPolicy?: {
    readonly writesAllowed: boolean;
    readonly reason: string;
  };
  readonly procedureAvailability:
    | { readonly kind: "unavailable"; readonly reasonCodes: readonly string[] }
    | { readonly kind: "available"; readonly procedureIds: readonly string[] };
  readonly sourceCitations: readonly unknown[];
}

export interface RegistryPort {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
}

export interface RegistryOperation {
  readonly id: string;
  readonly safetyClass: string;
  readonly inputs: readonly RegistryPort[];
  readonly outputs: readonly RegistryPort[];
  readonly stateEffect: string;
  readonly failureClasses: readonly string[];
  readonly requiredAdapterCapability: string;
  readonly algorithmParameters: readonly {
    readonly name: string;
    readonly value: string | number | boolean | readonly string[];
  }[];
  readonly sourceCitations: readonly unknown[];
}

export interface ProcedureRegistry {
  readonly schema: "org.mura.flash.procedure-registry/v1";
  readonly valueTypes: readonly string[];
  readonly safetyClasses: readonly string[];
  readonly operations: readonly RegistryOperation[];
}

export type ValueRef =
  | { readonly kind: "artifact"; readonly artifactId: string }
  | { readonly kind: "partition"; readonly partitionId: string }
  | { readonly kind: "backup"; readonly backupId: string }
  | { readonly kind: "state"; readonly stateId: string }
  | { readonly kind: "runtime-input"; readonly inputId: string }
  | {
      readonly kind: "operation-output";
      readonly operationId: string;
      readonly outputName: string;
    }
  | {
      readonly kind: "constant";
      readonly valueType: string;
      readonly value: string | number | boolean | readonly string[];
    };

export type Predicate =
  | {
      readonly kind: "equals" | "not-equals" | "digest-equals";
      readonly left: ValueRef;
      readonly right: ValueRef;
    }
  | {
      readonly kind: "state-assertion";
      readonly state: { readonly kind: "state"; readonly stateId: string };
      readonly expected: boolean;
    }
  | {
      readonly kind: "output-present";
      readonly value: {
        readonly kind: "operation-output";
        readonly operationId: string;
        readonly outputName: string;
      };
    };

export type FailureEdge =
  | { readonly failureClass: string; readonly recoveryId: string }
  | { readonly failureClass: string; readonly terminalFailure: true };

export interface ProcedureOperation {
  readonly id: string;
  readonly variant: string;
  readonly enabled: boolean;
  readonly fromStates: readonly {
    readonly kind: "state";
    readonly stateId: string;
  }[];
  readonly toState: { readonly kind: "state"; readonly stateId: string } | null;
  readonly arguments: readonly {
    readonly inputName: string;
    readonly value: ValueRef;
  }[];
  readonly guards: readonly Predicate[];
  readonly postconditions: readonly Predicate[];
  readonly failureEdges: readonly FailureEdge[];
  readonly engineFailureEdges: readonly FailureEdge[];
  readonly idempotence:
    | "idempotent"
    | "retry-after-observation"
    | "non-idempotent"
    | "manual-decision";
  readonly sourceCitations: readonly unknown[];
}

export interface ProcedureFlow {
  readonly id: string;
  readonly enabled: boolean;
  readonly initialState: { readonly kind: "state"; readonly stateId: string };
  readonly steps: readonly {
    readonly kind: "operation";
    readonly operationId: string;
  }[];
  readonly guards: readonly Predicate[];
  readonly confirmations: readonly {
    readonly kind: "confirmation";
    readonly confirmationId: string;
  }[];
}

export interface ProcedureRecovery {
  readonly id: string;
  readonly fromStates: readonly {
    readonly kind: "state";
    readonly stateId: string;
  }[];
  readonly steps: readonly {
    readonly kind: "operation";
    readonly operationId: string;
  }[];
  readonly terminalState: { readonly kind: "state"; readonly stateId: string };
}

export interface InstallProcedure {
  readonly schema: "org.mura.flash.install-procedure/v1";
  readonly id: string;
  readonly targetId: string;
  readonly enabled: boolean;
  readonly sourceBehavior: {
    readonly summary: string;
    readonly evidenceLevel: string;
  };
  readonly sourceGaps: readonly string[];
  readonly sourceParity: { readonly path: string };
  readonly muraPolicy?: {
    readonly writeBoundary: string;
    readonly liveDestructiveAllowed: boolean;
  };
  readonly states: readonly {
    readonly id: string;
    readonly kind: "device-mode" | "security" | "storage" | "flow";
    readonly initial: boolean;
  }[];
  readonly runtimeInputs: readonly {
    readonly id: string;
    readonly type: string;
    readonly required: boolean;
  }[];
  readonly artifacts: readonly {
    readonly id: string;
    readonly role: string;
    readonly source:
      | { readonly kind: "remote"; readonly uri: string }
      | { readonly kind: "local"; readonly path: string };
    readonly digest:
      | { readonly kind: "known"; readonly sha256: string }
      | { readonly kind: "unknown"; readonly reason: string };
  }[];
  readonly partitions: readonly {
    readonly id: string;
    readonly deviceName: string;
    readonly slot: string;
    readonly unitBound: boolean;
    readonly protected: boolean;
    readonly qualifiedForWrite: boolean;
  }[];
  readonly backups: readonly {
    readonly id: string;
    readonly partition: { readonly kind: "partition"; readonly partitionId: string };
    readonly requiredBeforeWrites: boolean;
    readonly minimumMatchingReads: number;
    readonly unitBound: boolean;
  }[];
  readonly confirmations: readonly {
    readonly id: string;
    readonly safetyClasses: readonly string[];
    readonly prompt: string;
  }[];
  readonly operations: readonly ProcedureOperation[];
  readonly flows: readonly ProcedureFlow[];
  readonly recovery: readonly ProcedureRecovery[];
  readonly sourceCitations: readonly unknown[];
}

export interface ReplayScenario {
  readonly schema: "org.mura.flash.replay-scenario/v1";
  readonly id: string;
  readonly procedureId: string;
  readonly flowId: string;
  readonly simulateDisabled: true;
  readonly clock: {
    readonly startTimestamp: string;
    readonly tickMs: number;
  };
  readonly operationDurations: readonly {
    readonly operationId: string;
    readonly durationMs: number;
  }[];
  readonly adapterCapabilities: readonly string[];
  readonly inputs: readonly TypedValue[];
  readonly responses: readonly (
    | {
        readonly kind: "success";
        readonly operationId: string;
        readonly outputs: readonly TypedValue[];
      }
    | {
        readonly kind: "failure";
        readonly operationId: string;
        readonly failureClass: string;
      }
    | {
        readonly kind: "interruption";
        readonly afterOperationId: string;
      }
  )[];
  readonly expected: {
    readonly terminalStateId: string;
    readonly eventKinds: readonly string[];
    readonly errorCode: string | null;
  };
}

export interface PlannedStep {
  readonly index: number;
  readonly operationId: string;
  readonly variant: string;
  readonly safetyClass: string;
  readonly requiredAdapterCapability: string;
  readonly stateEffect: string;
  readonly enabled: boolean;
  readonly wouldExecute: boolean;
}

export interface ProcedurePlan {
  readonly procedureId: string;
  readonly targetId: string;
  readonly flowId: string;
  readonly procedureEnabled: boolean;
  readonly flowEnabled: boolean;
  readonly steps: readonly PlannedStep[];
  readonly requiredCapabilities: readonly string[];
  readonly missingCapabilities: readonly string[];
  readonly confirmations: readonly string[];
}

export type TranscriptPayload =
  | { readonly kind: "session-start"; readonly procedureId: string; readonly flowId: string }
  | { readonly kind: "operation-start"; readonly operationId: string; readonly variant: string }
  | {
      readonly kind: "operation-would-execute";
      readonly operationId: string;
      readonly variant: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "operation-success";
      readonly operationId: string;
      readonly outputs: readonly TypedValue[];
      readonly durationMs: number;
    }
  | {
      readonly kind: "operation-failure";
      readonly operationId: string;
      readonly failureClass: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "state-transition";
      readonly fromStateId: string;
      readonly toStateId: string;
      readonly operationId: string;
    }
  | { readonly kind: "confirmation"; readonly confirmationId: string; readonly accepted: boolean }
  | { readonly kind: "policy-gate"; readonly gate: string; readonly allowed: boolean }
  | { readonly kind: "recovery-start"; readonly recoveryId: string; readonly trigger: string }
  | { readonly kind: "session-end"; readonly terminalStateId: string; readonly errorCode: string | null };

export interface TranscriptEvent {
  readonly schema: "org.mura.flash.transcript-event/v1";
  readonly sessionId: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly previousHash: string | null;
  readonly payload: TranscriptPayload;
  readonly eventHash: string;
}

export type TargetCatalogV1 = readonly TargetRecord[];
export type ProcedureCatalog = readonly InstallProcedure[];

export interface CatalogIndexEntry {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  readonly canonicalSize: number;
  readonly targetId?: string;
}

export interface CatalogIndexV1 {
  readonly schema: "org.mura.flash.target-catalog-index/v1";
  readonly targets: readonly CatalogIndexEntry[];
  readonly procedures: readonly (CatalogIndexEntry & {
    readonly targetId: string;
  })[];
}

export interface ProcedureValidationOptions {
  readonly targetCatalog?: TargetCatalogV1;
  readonly registry?: ProcedureRegistry;
}

export interface PlanProcedureOptions extends ProcedureValidationOptions {
  readonly procedureCatalog?: ProcedureCatalog;
  readonly flowId?: string;
  readonly adapterCapabilities?: ReadonlySet<string> | readonly string[];
  readonly simulateDisabled?: boolean;
}

export interface ReplaySessionOptions extends ProcedureValidationOptions {
  readonly procedureCatalog?: ProcedureCatalog;
  readonly sessionId?: string;
}

export interface ReplayResult {
  readonly scenarioId: string;
  readonly procedureId: string;
  readonly flowId: string;
  readonly terminalStateId: string;
  readonly errorCode: string | null;
  readonly matchedExpected: boolean;
  readonly mismatches: readonly string[];
  readonly plan: ProcedurePlan;
  readonly events: readonly TranscriptEvent[];
  readonly stateEffects: readonly {
    readonly operationId: string;
    readonly stateEffect: string;
    readonly outputs: readonly TypedValue[];
  }[];
}
