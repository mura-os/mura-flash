export type TransportKind = "adb" | "fastboot";

export interface ProbeDefinition {
  readonly id: string;
  readonly transport: TransportKind;
  readonly fact: string;
  readonly sensitive?: boolean;
}

export interface FlashContract {
  readonly schema: "org.mura.flash.contract/v0";
  readonly targetIds: readonly string[];
  readonly probeIds: readonly ProbeDefinition[];
  readonly deniedOperationClasses: readonly string[];
  readonly limits: {
    readonly probeTimeoutSeconds: 10;
    readonly reconnectTimeoutSeconds: 10;
    readonly maxOutputBytes: 1048576;
    readonly maxDevices: 1;
  };
  readonly errorCodes: Readonly<Record<string, number>>;
  readonly esmExports: readonly string[];
}

export interface InspectionRecipe {
  readonly schema: "org.mura.flash.inspection-recipe/v1";
  readonly id: string;
  readonly displayName: string;
  readonly vendor: string;
  readonly models: readonly string[];
  readonly codenames: readonly string[];
  readonly builds: readonly {
    readonly id: string;
    readonly status:
      | "eligible-reported"
      | "ineligible-reported"
      | "inspect-only"
      | "unknown"
      | "unsupported";
    readonly note?: string;
  }[];
  readonly evidenceLevel:
    | "source-documented"
    | "vendor-documented"
    | "community-reproduced"
    | "community-reported";
  readonly hardwareStatus: "unqualified" | "unsupported";
  readonly authenticationStatus: "test-only";
  readonly writesEnabled: false;
  readonly frontends: readonly ("python" | "webusb")[];
  readonly transports: readonly (TransportKind | "manual")[];
  readonly probes: readonly string[];
  readonly redactFacts: readonly string[];
  readonly blockers: readonly string[];
  readonly unknowns: readonly string[];
  readonly sources: readonly string[];
}

export type Catalog = readonly InspectionRecipe[];

export interface DeviceIdentity {
  readonly serial?: string;
  readonly vendorId?: number;
  readonly productId?: number;
}

export interface ProbeAdapter {
  readonly kind: TransportKind;
  listDevices(): Promise<readonly DeviceIdentity[]>;
  connect(device: DeviceIdentity): Promise<DeviceIdentity>;
  readFact(
    fact: string,
    signal: AbortSignal,
    maxBytes: number,
  ): Promise<string | null>;
  close(): Promise<void>;
}

export type ProbeAdapterFactory = () => ProbeAdapter | Promise<ProbeAdapter>;

export interface BrowserSessionOptions {
  readonly catalog?: Catalog;
  readonly transports?: Partial<Record<TransportKind, ProbeAdapterFactory>>;
  readonly createAdbTransport?: ProbeAdapterFactory;
  readonly createFastbootTransport?: ProbeAdapterFactory;
  readonly now?: () => Date;
}

export interface InspectOptions {
  readonly transport?: TransportKind;
}

export interface TranscriptEntry {
  readonly at: string;
  readonly transport: TransportKind;
  readonly probeId: string;
  readonly fact: string;
  readonly status: "ok" | "error";
  readonly value?: string | null;
  readonly error?: string;
}

export interface InspectionReport {
  readonly targetId: string;
  readonly transport: TransportKind;
  readonly facts: Readonly<Record<string, string | null>>;
  readonly transcript: readonly TranscriptEntry[];
}
