import { fail } from "./errors";
import { parseJsonStrict } from "./json";
import type { ErrorCode } from "./errors";

export interface ValidationIssue {
  readonly path: string;
  readonly keyword: string;
  readonly message: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pointer(path: string, key: string | number): string {
  return `${path}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

function codePointCompare(left: string, right: string): number {
  const leftPoints = [...left];
  const rightPoints = [...right];
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const leftPoint = leftPoints[index]?.codePointAt(0) ?? 0;
    const rightPoint = rightPoints[index]?.codePointAt(0) ?? 0;
    if (leftPoint !== rightPoint) {
      return leftPoint - rightPoint;
    }
  }
  return leftPoints.length - rightPoints.length;
}

export function canonicalJson(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw fail("invalid-document", "canonical JSON requires safe integers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (isObject(value)) {
    return `{${Object.keys(value)
      .sort(codePointCompare)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw fail("invalid-document", `value of type ${typeof value} is not JSON`);
}

function sameJson(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function resolveReference(root: JsonObject, reference: string): unknown {
  if (!reference.startsWith("#/")) {
    return undefined;
  }
  let current: unknown = root;
  for (const raw of reference.slice(2).split("/")) {
    const key = raw.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!isObject(current) || !Object.hasOwn(current, key)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

function matchesType(value: unknown, expected: string): boolean {
  switch (expected) {
    case "array":
      return Array.isArray(value);
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return Number.isSafeInteger(value);
    case "null":
      return value === null;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "object":
      return isObject(value);
    case "string":
      return typeof value === "string";
    default:
      return false;
  }
}

function issue(
  issues: ValidationIssue[],
  path: string,
  keyword: string,
  message: string,
): void {
  issues.push({ path, keyword, message });
}

function validateNode(
  value: unknown,
  schema: unknown,
  root: JsonObject,
  path: string,
  issues: ValidationIssue[],
  references: Set<string>,
): void {
  if (typeof schema === "boolean") {
    if (!schema) {
      issue(issues, path, "falseSchema", "is not allowed");
    }
    return;
  }
  if (!isObject(schema)) {
    issue(issues, path, "schema", "schema node must be an object");
    return;
  }

  if (typeof schema["$ref"] === "string") {
    const reference = schema["$ref"];
    if (references.has(reference)) {
      issue(issues, path, "$ref", `cyclic reference ${JSON.stringify(reference)}`);
      return;
    }
    const target = resolveReference(root, reference);
    if (target === undefined) {
      issue(issues, path, "$ref", `unresolved reference ${JSON.stringify(reference)}`);
      return;
    }
    const nextReferences = new Set(references);
    nextReferences.add(reference);
    validateNode(value, target, root, path, issues, nextReferences);
    return;
  }

  if (Object.hasOwn(schema, "const") && !sameJson(value, schema["const"])) {
    issue(issues, path, "const", `must equal ${JSON.stringify(schema["const"])}`);
  }
  if (
    Array.isArray(schema["enum"]) &&
    !schema["enum"].some((candidate) => sameJson(value, candidate))
  ) {
    issue(issues, path, "enum", "must be one of the declared values");
  }

  const expectedType = schema["type"];
  if (
    typeof expectedType === "string" &&
    !matchesType(value, expectedType)
  ) {
    issue(issues, path, "type", `must be ${expectedType}`);
    return;
  }

  if (Array.isArray(schema["oneOf"])) {
    let matches = 0;
    let best: ValidationIssue[] = [];
    for (const branch of schema["oneOf"]) {
      const branchIssues: ValidationIssue[] = [];
      validateNode(value, branch, root, path, branchIssues, references);
      if (branchIssues.length === 0) {
        matches += 1;
      } else if (best.length === 0 || branchIssues.length < best.length) {
        best = branchIssues;
      }
    }
    if (matches !== 1) {
      issue(issues, path, "oneOf", `must match exactly one schema (matched ${matches})`);
      if (matches === 0) {
        issues.push(...best);
      }
    }
  }

  if (Array.isArray(schema["allOf"])) {
    for (const branch of schema["allOf"]) {
      validateNode(value, branch, root, path, issues, references);
    }
  }

  if (schema["not"] !== undefined) {
    const prohibitedIssues: ValidationIssue[] = [];
    validateNode(value, schema["not"], root, path, prohibitedIssues, references);
    if (prohibitedIssues.length === 0) {
      issue(issues, path, "not", "must not match the prohibited schema");
    }
  }

  if (schema["if"] !== undefined) {
    const conditionalIssues: ValidationIssue[] = [];
    validateNode(value, schema["if"], root, path, conditionalIssues, references);
    const selected =
      conditionalIssues.length === 0 ? schema["then"] : schema["else"];
    if (selected !== undefined) {
      validateNode(value, selected, root, path, issues, references);
    }
  }

  if (typeof value === "string") {
    if (
      typeof schema["minLength"] === "number" &&
      [...value].length < schema["minLength"]
    ) {
      issue(issues, path, "minLength", `must contain at least ${schema["minLength"]} characters`);
    }
    if (
      typeof schema["maxLength"] === "number" &&
      [...value].length > schema["maxLength"]
    ) {
      issue(issues, path, "maxLength", `must contain at most ${schema["maxLength"]} characters`);
    }
    if (typeof schema["pattern"] === "string") {
      try {
        if (!new RegExp(schema["pattern"], "u").test(value)) {
          issue(issues, path, "pattern", `must match ${JSON.stringify(schema["pattern"])}`);
        }
      } catch {
        issue(issues, path, "schema", "schema contains an invalid pattern");
      }
    }
    if (schema["format"] === "uri") {
      try {
        const parsed = new URL(value);
        if (parsed.protocol.length < 2) {
          throw new TypeError("missing URI scheme");
        }
      } catch {
        issue(issues, path, "format", "must be a valid URI");
      }
    }
  }

  if (typeof value === "number") {
    if (typeof schema["minimum"] === "number" && value < schema["minimum"]) {
      issue(issues, path, "minimum", `must be at least ${schema["minimum"]}`);
    }
    if (typeof schema["maximum"] === "number" && value > schema["maximum"]) {
      issue(issues, path, "maximum", `must be at most ${schema["maximum"]}`);
    }
  }

  if (Array.isArray(value)) {
    if (
      typeof schema["minItems"] === "number" &&
      value.length < schema["minItems"]
    ) {
      issue(issues, path, "minItems", `must contain at least ${schema["minItems"]} items`);
    }
    if (
      typeof schema["maxItems"] === "number" &&
      value.length > schema["maxItems"]
    ) {
      issue(issues, path, "maxItems", `must contain at most ${schema["maxItems"]} items`);
    }
    if (schema["uniqueItems"] === true) {
      const seen = new Set<string>();
      for (const item of value) {
        let key: string;
        try {
          key = canonicalJson(item);
        } catch {
          key = `invalid:${seen.size}`;
        }
        if (seen.has(key)) {
          issue(issues, path, "uniqueItems", "must not contain duplicate items");
          break;
        }
        seen.add(key);
      }
    }
    if (schema["items"] !== undefined) {
      value.forEach((item, index) => {
        validateNode(item, schema["items"], root, pointer(path, index), issues, references);
      });
    }
  }

  if (isObject(value)) {
    const properties = isObject(schema["properties"])
      ? schema["properties"]
      : {};
    if (Array.isArray(schema["required"])) {
      for (const key of schema["required"]) {
        if (typeof key === "string" && !Object.hasOwn(value, key)) {
          issue(issues, path, "required", `missing required field ${JSON.stringify(key)}`);
        }
      }
    }
    for (const key of Object.keys(value).sort(codePointCompare)) {
      if (Object.hasOwn(properties, key)) {
        validateNode(value[key], properties[key], root, pointer(path, key), issues, references);
      } else if (schema["additionalProperties"] === false) {
        issue(issues, path, "additionalProperties", `unknown field ${JSON.stringify(key)}`);
      } else if (isObject(schema["additionalProperties"])) {
        validateNode(
          value[key],
          schema["additionalProperties"],
          root,
          pointer(path, key),
          issues,
          references,
        );
      }
    }
    if (
      typeof schema["minProperties"] === "number" &&
      Object.keys(value).length < schema["minProperties"]
    ) {
      issue(issues, path, "minProperties", `must contain at least ${schema["minProperties"]} fields`);
    }
  }
}

export function validateSchema(value: unknown, schema: unknown): ValidationIssue[] {
  if (!isObject(schema)) {
    return [{ path: "$", keyword: "schema", message: "root schema must be an object" }];
  }
  const issues: ValidationIssue[] = [];
  validateNode(value, schema, schema, "$", issues, new Set<string>());
  return issues;
}

export function formatValidationIssues(issues: readonly ValidationIssue[]): string {
  return [...issues]
    .sort((left, right) => {
      const pathOrder = codePointCompare(left.path, right.path);
      if (pathOrder !== 0) {
        return pathOrder;
      }
      const keywordOrder = codePointCompare(left.keyword, right.keyword);
      return keywordOrder !== 0
        ? keywordOrder
        : codePointCompare(left.message, right.message);
    })
    .map((item) => `${item.path}: ${item.message}`)
    .join("; ");
}

export function parseAndValidate<T>(
  input: string | unknown,
  schema: unknown,
  errorCode: ErrorCode = "invalid-document",
): T {
  const value =
    typeof input === "string" ? parseJsonStrict(input, errorCode) : input;
  const issues = validateSchema(value, schema);
  if (issues.length > 0) {
    throw fail(errorCode, formatValidationIssues(issues));
  }
  return value as T;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}
