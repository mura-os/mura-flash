import { contract } from "./catalog";

const redaction = "[REDACTED]";
const sensitiveKeys =
  /^(?:authorization|credential|privateKey|secret|serial|serialNumber|token)$/iu;
const privateKeyPattern =
  /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gu;
const labeledSecretPattern =
  /\b(authorization|credential|secret|serial|token)(\s*[:=]\s*)([^\s,;]+)/giu;

function redactString(value: string): string {
  return value
    .replace(privateKeyPattern, redaction)
    .replace(labeledSecretPattern, `$1$2${redaction}`);
}

function redactValue(
  value: unknown,
  redactFacts: ReadonlySet<string>,
  seen: WeakMap<object, unknown>,
): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  const previous = seen.get(value);
  if (previous !== undefined) {
    return previous;
  }

  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    for (const item of value) {
      result.push(redactValue(item, redactFacts, seen));
    }
    return result;
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  seen.set(value, result);
  const fact = typeof source["fact"] === "string" ? source["fact"] : undefined;
  for (const [key, child] of Object.entries(source)) {
    if (
      sensitiveKeys.test(key) ||
      (key === "value" && fact !== undefined && redactFacts.has(fact))
    ) {
      result[key] = redaction;
    } else {
      result[key] = redactValue(child, redactFacts, seen);
    }
  }
  return result;
}

export function redactTranscript<T>(
  transcript: T,
  additionalFacts: readonly string[] = [],
): T {
  const sensitiveFacts = new Set(
    contract.probeIds
      .filter((probe) => probe.sensitive === true)
      .map((probe) => probe.fact),
  );
  for (const fact of additionalFacts) {
    sensitiveFacts.add(fact);
  }
  return redactValue(
    transcript,
    sensitiveFacts,
    new WeakMap<object, unknown>(),
  ) as T;
}
