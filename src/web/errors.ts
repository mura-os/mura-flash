import contractJson from "../../contracts/v0.json";
import contractV1Json from "../../contracts/v1.json";

import type { FlashContract } from "./types";

const contract = contractJson as FlashContract;

export type ErrorCode =
  | "usage"
  | "recipe-invalid"
  | "device-missing"
  | "device-ambiguous"
  | "probe-failed"
  | "probe-timeout"
  | "safety-refusal"
  | "invalid-document"
  | "contract-mismatch"
  | "closure-unresolved"
  | "graph-invalid"
  | "capability-missing"
  | "live-destructive-policy-denied"
  | "guard-failed"
  | "confirmation-declined"
  | "artifact-fetch-failed"
  | "artifact-verification-failed"
  | "artifact-extraction-failed"
  | "transport-failed"
  | "authentication-failed"
  | "operation-timeout"
  | "device-disconnected"
  | "device-rejected"
  | "backup-failed"
  | "hash-mismatch"
  | "write-failed"
  | "readback-mismatch"
  | "restore-failed"
  | "postcondition-failed"
  | "interrupted"
  | "manual-action-declined"
  | "replay-mismatch";

export class MuraFlashError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: number;

  constructor(code: ErrorCode, detail: string, cause?: unknown) {
    super(`${code}: ${detail}`, cause === undefined ? undefined : { cause });
    this.name = "MuraFlashError";
    this.code = code;
    const v1Codes = contractV1Json.errorCodes as Readonly<Record<string, number>>;
    this.exitCode = contract.errorCodes[code] ?? v1Codes[code] ?? 5;
  }
}

export function fail(
  code: ErrorCode,
  detail: string,
  cause?: unknown,
): MuraFlashError {
  return new MuraFlashError(code, detail, cause);
}

export function detailOf(error: unknown): string {
  if (error instanceof MuraFlashError) {
    return error.message;
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "unknown error";
}
