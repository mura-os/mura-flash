import contractJson from "../../contracts/v0.json";

import type { FlashContract } from "./types";

const contract = contractJson as FlashContract;

export type ErrorCode =
  | "usage"
  | "recipe-invalid"
  | "device-missing"
  | "device-ambiguous"
  | "probe-failed"
  | "probe-timeout"
  | "safety-refusal";

export class MuraFlashError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: number;

  constructor(code: ErrorCode, detail: string, cause?: unknown) {
    super(`${code}: ${detail}`, cause === undefined ? undefined : { cause });
    this.name = "MuraFlashError";
    this.code = code;
    this.exitCode = contract.errorCodes[code] ?? 5;
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
