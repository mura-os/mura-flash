import contractJson from "../../contracts/v0.json";
import builtInRecipeTexts from "virtual:mura-recipes";

import { fail } from "./errors";
import { parseJsonStrict } from "./json";
import type {
  Catalog,
  FlashContract,
  InspectionRecipe,
  ProbeDefinition,
} from "./types";

const expectedExports = [
  "loadCatalog",
  "getTarget",
  "validateRecipe",
  "createBrowserSession",
  "redactTranscript",
] as const;

const idPattern = /^[a-z][a-z0-9.-]{0,79}$/u;
const recipeFields = [
  "schema",
  "id",
  "displayName",
  "vendor",
  "models",
  "codenames",
  "builds",
  "evidenceLevel",
  "hardwareStatus",
  "authenticationStatus",
  "writesEnabled",
  "frontends",
  "transports",
  "probes",
  "redactFacts",
  "blockers",
  "unknowns",
  "sources",
] as const;
const contractFields = [
  "schema",
  "targetIds",
  "probeIds",
  "deniedOperationClasses",
  "limits",
  "errorCodes",
  "cli",
  "esmExports",
] as const;

interface ValidationIssue {
  readonly path: string;
  readonly keyword: string;
  readonly message: string;
}

type JsonObject = Record<string, unknown>;

function addIssue(
  issues: ValidationIssue[],
  path: string,
  keyword: string,
  message: string,
): void {
  issues.push({ path, keyword, message });
}

function childPath(path: string, property: string | number): string {
  return `${path}/${String(property)
    .replaceAll("~", "~0")
    .replaceAll("/", "~1")}`;
}

function objectValue(
  value: unknown,
  path: string,
  required: readonly string[],
  allowed: readonly string[],
  issues: ValidationIssue[],
): JsonObject | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    addIssue(issues, path, "type", "must be an object");
    return undefined;
  }

  const object = value as JsonObject;
  const allowedFields = new Set(allowed);
  for (const key of Object.keys(object).sort()) {
    if (!allowedFields.has(key)) {
      addIssue(
        issues,
        path,
        "additionalProperties",
        `unknown field ${JSON.stringify(key)}`,
      );
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(object, key)) {
      addIssue(
        issues,
        path,
        "required",
        `missing required field ${JSON.stringify(key)}`,
      );
    }
  }
  return object;
}

function arrayValue(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  minimum = 0,
): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "type", "must be an array");
    return undefined;
  }
  if (value.length < minimum) {
    addIssue(
      issues,
      path,
      "minItems",
      `must contain at least ${minimum} item${minimum === 1 ? "" : "s"}`,
    );
  }
  return value;
}

function stringValue(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  minimum?: number,
  maximum?: number,
): value is string {
  if (typeof value !== "string") {
    addIssue(issues, path, "type", "must be a string");
    return false;
  }
  const length = [...value].length;
  if (minimum !== undefined && length < minimum) {
    addIssue(
      issues,
      path,
      "minLength",
      `must contain at least ${minimum} character${minimum === 1 ? "" : "s"}`,
    );
  }
  if (maximum !== undefined && length > maximum) {
    addIssue(
      issues,
      path,
      "maxLength",
      `must contain at most ${maximum} characters`,
    );
  }
  return true;
}

function idValue(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (stringValue(value, path, issues) && !idPattern.test(value)) {
    addIssue(
      issues,
      path,
      "pattern",
      `must match ${JSON.stringify(idPattern.source)}`,
    );
  }
}

function enumValue(
  value: unknown,
  path: string,
  allowed: readonly unknown[],
  issues: ValidationIssue[],
): void {
  if (!allowed.includes(value)) {
    addIssue(
      issues,
      path,
      "enum",
      `must be one of ${allowed.map((item) => JSON.stringify(item)).join(", ")}`,
    );
  }
}

function constValue(
  value: unknown,
  path: string,
  expected: unknown,
  issues: ValidationIssue[],
): void {
  if (!Object.is(value, expected)) {
    addIssue(
      issues,
      path,
      "const",
      `must equal ${JSON.stringify(expected)}`,
    );
  }
}

function canonicalJson(
  value: unknown,
  ancestors = new Set<object>(),
): string {
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      return '"<cycle>"';
    }
    ancestors.add(value);
    const result = `[${value
      .map((item) => canonicalJson(item, ancestors))
      .join(",")}]`;
    ancestors.delete(value);
    return result;
  }
  if (value !== null && typeof value === "object") {
    if (ancestors.has(value)) {
      return '"<cycle>"';
    }
    ancestors.add(value);
    const object = value as JsonObject;
    const result = `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(object[key], ancestors)}`,
      )
      .join(",")}}`;
    ancestors.delete(value);
    return result;
  }
  return JSON.stringify(value) ?? String(value);
}

function uniqueItems(
  values: readonly unknown[],
  path: string,
  issues: ValidationIssue[],
): void {
  const seen = new Map<string, number>();
  for (const [index, value] of values.entries()) {
    const key = canonicalJson(value);
    const previous = seen.get(key);
    if (previous !== undefined) {
      addIssue(
        issues,
        path,
        "uniqueItems",
        `duplicate item at index ${index} (first seen at index ${previous})`,
      );
    } else {
      seen.set(key, index);
    }
  }
}

function stringList(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: {
    readonly minimumItems?: number;
    readonly minimumLength?: number;
    readonly maximumLength?: number;
    readonly ids?: boolean;
    readonly allowed?: readonly string[];
    readonly urls?: boolean;
  } = {},
): void {
  const values = arrayValue(
    value,
    path,
    issues,
    options.minimumItems,
  );
  if (values === undefined) {
    return;
  }
  uniqueItems(values, path, issues);
  for (const [index, item] of values.entries()) {
    const itemPath = childPath(path, index);
    if (options.ids === true) {
      idValue(item, itemPath, issues);
    } else if (
      stringValue(
        item,
        itemPath,
        issues,
        options.minimumLength,
        options.maximumLength,
      )
    ) {
      if (options.allowed !== undefined) {
        enumValue(item, itemPath, options.allowed, issues);
      }
      if (options.urls === true && !uriIsValid(item)) {
        addIssue(issues, itemPath, "format", "must be a valid URI");
      }
    }
  }
}

function uriIsValid(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol.length > 1;
  } catch {
    return false;
  }
}

function validateProbeDefinition(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  const object = objectValue(
    value,
    path,
    ["id", "transport", "fact"],
    ["id", "transport", "fact", "sensitive"],
    issues,
  );
  if (object === undefined) {
    return;
  }
  if (Object.hasOwn(object, "id")) {
    idValue(object["id"], childPath(path, "id"), issues);
  }
  if (Object.hasOwn(object, "transport")) {
    enumValue(
      object["transport"],
      childPath(path, "transport"),
      ["adb", "fastboot"],
      issues,
    );
  }
  if (Object.hasOwn(object, "fact")) {
    idValue(object["fact"], childPath(path, "fact"), issues);
  }
  if (
    Object.hasOwn(object, "sensitive") &&
    typeof object["sensitive"] !== "boolean"
  ) {
    addIssue(
      issues,
      childPath(path, "sensitive"),
      "type",
      "must be a boolean",
    );
  }
}

function validateContract(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const object = objectValue(
    value,
    "$",
    contractFields,
    contractFields,
    issues,
  );
  if (object === undefined) {
    return issues;
  }

  if (Object.hasOwn(object, "schema")) {
    constValue(
      object["schema"],
      "$/schema",
      "org.mura.flash.contract/v0",
      issues,
    );
  }
  if (Object.hasOwn(object, "targetIds")) {
    stringList(object["targetIds"], "$/targetIds", issues, {
      minimumItems: 1,
      ids: true,
    });
  }
  if (Object.hasOwn(object, "probeIds")) {
    const probes = arrayValue(object["probeIds"], "$/probeIds", issues, 1);
    if (probes !== undefined) {
      uniqueItems(probes, "$/probeIds", issues);
      for (const [index, probe] of probes.entries()) {
        validateProbeDefinition(probe, `$/probeIds/${index}`, issues);
      }
    }
  }
  if (Object.hasOwn(object, "deniedOperationClasses")) {
    stringList(
      object["deniedOperationClasses"],
      "$/deniedOperationClasses",
      issues,
      {
        minimumItems: 1,
        allowed: [
          "device-transition",
          "device-code-execution",
          "device-write",
          "arbitrary-command",
        ],
      },
    );
  }
  if (Object.hasOwn(object, "limits")) {
    const limits = objectValue(
      object["limits"],
      "$/limits",
      [
        "probeTimeoutSeconds",
        "reconnectTimeoutSeconds",
        "maxOutputBytes",
        "maxDevices",
      ],
      [
        "probeTimeoutSeconds",
        "reconnectTimeoutSeconds",
        "maxOutputBytes",
        "maxDevices",
      ],
      issues,
    );
    if (limits !== undefined) {
      const expectedLimits: Readonly<Record<string, number>> = {
        probeTimeoutSeconds: 10,
        reconnectTimeoutSeconds: 10,
        maxOutputBytes: 1048576,
        maxDevices: 1,
      };
      for (const [name, expected] of Object.entries(expectedLimits)) {
        if (Object.hasOwn(limits, name)) {
          constValue(limits[name], childPath("$/limits", name), expected, issues);
        }
      }
    }
  }
  if (Object.hasOwn(object, "errorCodes")) {
    const errorCodes = objectValue(
      object["errorCodes"],
      "$/errorCodes",
      [],
      Object.keys(
        object["errorCodes"] !== null &&
          typeof object["errorCodes"] === "object" &&
          !Array.isArray(object["errorCodes"])
          ? object["errorCodes"]
          : {},
      ),
      issues,
    );
    if (errorCodes !== undefined) {
      const entries = Object.entries(errorCodes);
      if (entries.length === 0) {
        addIssue(
          issues,
          "$/errorCodes",
          "minProperties",
          "must contain at least 1 field",
        );
      }
      for (const [name, code] of entries) {
        const path = childPath("$/errorCodes", name);
        if (!Number.isInteger(code)) {
          addIssue(issues, path, "type", "must be an integer");
        } else if ((code as number) < 2 || (code as number) > 5) {
          addIssue(issues, path, "range", "must be between 2 and 5");
        }
      }
    }
  }
  if (Object.hasOwn(object, "cli")) {
    const cli = objectValue(
      object["cli"],
      "$/cli",
      ["commands", "jsonFlag"],
      ["commands", "jsonFlag"],
      issues,
    );
    if (cli !== undefined) {
      if (Object.hasOwn(cli, "commands")) {
        const commands = arrayValue(cli["commands"], "$/cli/commands", issues);
        if (
          commands !== undefined &&
          (commands.length !== 4 ||
            !["targets", "show", "validate", "inspect"].every(
              (command, index) => commands[index] === command,
            ))
        ) {
          addIssue(
            issues,
            "$/cli/commands",
            "const",
            'must equal ["targets","show","validate","inspect"]',
          );
        }
      }
      if (Object.hasOwn(cli, "jsonFlag")) {
        constValue(cli["jsonFlag"], "$/cli/jsonFlag", "--json", issues);
      }
    }
  }
  if (Object.hasOwn(object, "esmExports")) {
    const exports = arrayValue(object["esmExports"], "$/esmExports", issues);
    if (
      exports !== undefined &&
      (exports.length !== expectedExports.length ||
        !expectedExports.every((name, index) => exports[index] === name))
    ) {
      addIssue(
        issues,
        "$/esmExports",
        "const",
        `must equal ${JSON.stringify(expectedExports)}`,
      );
    }
  }
  return issues;
}

function validateBuild(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  const object = objectValue(
    value,
    path,
    ["id", "status"],
    ["id", "status", "note"],
    issues,
  );
  if (object === undefined) {
    return;
  }
  if (Object.hasOwn(object, "id")) {
    stringValue(object["id"], `${path}/id`, issues, 1, 100);
  }
  if (Object.hasOwn(object, "status")) {
    enumValue(
      object["status"],
      `${path}/status`,
      [
        "eligible-reported",
        "ineligible-reported",
        "inspect-only",
        "unknown",
        "unsupported",
      ],
      issues,
    );
  }
  if (Object.hasOwn(object, "note")) {
    stringValue(object["note"], `${path}/note`, issues, undefined, 500);
  }
}

function validateRecipeShape(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const object = objectValue(
    value,
    "$",
    recipeFields,
    recipeFields,
    issues,
  );
  if (object === undefined) {
    return issues;
  }

  if (Object.hasOwn(object, "schema")) {
    constValue(
      object["schema"],
      "$/schema",
      "org.mura.flash.inspection-recipe/v1",
      issues,
    );
  }
  if (Object.hasOwn(object, "id")) {
    idValue(object["id"], "$/id", issues);
  }
  if (Object.hasOwn(object, "displayName")) {
    stringValue(object["displayName"], "$/displayName", issues, 1, 100);
  }
  if (Object.hasOwn(object, "vendor")) {
    stringValue(object["vendor"], "$/vendor", issues, 1, 80);
  }
  for (const name of ["models", "codenames", "blockers", "unknowns"] as const) {
    if (Object.hasOwn(object, name)) {
      stringList(object[name], childPath("$", name), issues, {
        minimumLength: 1,
        maximumLength: 500,
      });
    }
  }
  if (Object.hasOwn(object, "builds")) {
    const builds = arrayValue(object["builds"], "$/builds", issues);
    if (builds !== undefined) {
      for (const [index, build] of builds.entries()) {
        validateBuild(build, `$/builds/${index}`, issues);
      }
    }
  }
  if (Object.hasOwn(object, "evidenceLevel")) {
    enumValue(
      object["evidenceLevel"],
      "$/evidenceLevel",
      [
        "source-documented",
        "vendor-documented",
        "community-reproduced",
        "community-reported",
      ],
      issues,
    );
  }
  if (Object.hasOwn(object, "hardwareStatus")) {
    enumValue(
      object["hardwareStatus"],
      "$/hardwareStatus",
      ["unqualified", "unsupported"],
      issues,
    );
  }
  if (Object.hasOwn(object, "authenticationStatus")) {
    constValue(
      object["authenticationStatus"],
      "$/authenticationStatus",
      "test-only",
      issues,
    );
  }
  if (Object.hasOwn(object, "writesEnabled")) {
    constValue(object["writesEnabled"], "$/writesEnabled", false, issues);
  }
  if (Object.hasOwn(object, "frontends")) {
    stringList(object["frontends"], "$/frontends", issues, {
      minimumItems: 1,
      allowed: ["python", "webusb"],
    });
  }
  if (Object.hasOwn(object, "transports")) {
    stringList(object["transports"], "$/transports", issues, {
      minimumItems: 1,
      allowed: ["adb", "fastboot", "manual"],
    });
  }
  for (const name of ["probes", "redactFacts"] as const) {
    if (Object.hasOwn(object, name)) {
      stringList(object[name], childPath("$", name), issues, { ids: true });
    }
  }
  if (Object.hasOwn(object, "sources")) {
    stringList(object["sources"], "$/sources", issues, {
      minimumItems: 1,
      urls: true,
    });
  }
  return issues;
}

function formatValidationErrors(errors: readonly ValidationIssue[]): string {
  return [...errors]
    .sort((left, right) => {
      if (left.path !== right.path) {
        return left.path < right.path ? -1 : 1;
      }
      if (left.keyword !== right.keyword) {
        return left.keyword < right.keyword ? -1 : 1;
      }
      return left.message < right.message ? -1 : left.message > right.message ? 1 : 0;
    })
    .map((error) => `${error.path}: ${error.message}`)
    .join("; ");
}

const contractErrors = validateContract(contractJson);
if (contractErrors.length > 0) {
  throw fail(
    "safety-refusal",
    `invalid embedded contract: ${formatValidationErrors(contractErrors)}`,
  );
}

const contract = contractJson as FlashContract;

if (
  contract.esmExports.length !== expectedExports.length ||
  !contract.esmExports.every((name, index) => name === expectedExports[index])
) {
  throw fail("safety-refusal", "embedded contract export surface mismatch");
}

const probesById = new Map<string, ProbeDefinition>(
  contract.probeIds.map((probe) => [probe.id, probe]),
);

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function validateSemantics(recipe: InspectionRecipe): void {
  if (!contract.targetIds.includes(recipe.id)) {
    throw fail(
      "recipe-invalid",
      `$.id: target ${JSON.stringify(recipe.id)} is not in the v0 contract`,
    );
  }

  const selectedFacts = new Set<string>();
  for (const [index, probeId] of recipe.probes.entries()) {
    const probe = probesById.get(probeId);
    if (probe === undefined) {
      throw fail(
        "recipe-invalid",
        `$.probes[${index}]: probe ${JSON.stringify(probeId)} is not allowlisted`,
      );
    }
    if (!recipe.transports.includes(probe.transport)) {
      throw fail(
        "recipe-invalid",
        `$.probes[${index}]: ${probe.transport} is absent from transports`,
      );
    }
    selectedFacts.add(probe.fact);
    if (probe.sensitive === true && !recipe.redactFacts.includes(probe.fact)) {
      throw fail(
        "recipe-invalid",
        `$.redactFacts: sensitive fact ${JSON.stringify(probe.fact)} is missing`,
      );
    }
  }

  for (const [index, fact] of recipe.redactFacts.entries()) {
    if (!selectedFacts.has(fact)) {
      throw fail(
        "recipe-invalid",
        `$.redactFacts[${index}]: fact ${JSON.stringify(
          fact,
        )} is not collected by this recipe`,
      );
    }
  }
}

export function validateRecipe(input: string | unknown): InspectionRecipe {
  const value = typeof input === "string" ? parseJsonStrict(input) : input;
  const errors = validateRecipeShape(value);
  if (errors.length > 0) {
    throw fail(
      "recipe-invalid",
      formatValidationErrors(errors),
    );
  }
  const recipe = value as InspectionRecipe;
  validateSemantics(recipe);
  return deepFreeze(recipe);
}

function normalizeSources(
  sources: string | unknown | readonly (string | unknown)[],
): readonly (string | unknown)[] {
  return Array.isArray(sources) ? sources : [sources];
}

let defaultCatalog: Catalog | undefined;

export function loadCatalog(
  sources?: string | unknown | readonly (string | unknown)[],
): Catalog {
  if (sources === undefined && defaultCatalog !== undefined) {
    return defaultCatalog;
  }

  const usingBuiltIns = sources === undefined;
  const recipes = normalizeSources(
    sources ?? builtInRecipeTexts,
  ).map((source) => validateRecipe(source));
  const seen = new Set<string>();
  for (const recipe of recipes) {
    if (seen.has(recipe.id)) {
      throw fail(
        "recipe-invalid",
        `duplicate target recipe ${JSON.stringify(recipe.id)}`,
      );
    }
    seen.add(recipe.id);
  }

  if (usingBuiltIns) {
    const missing = contract.targetIds.filter((id) => !seen.has(id));
    if (missing.length > 0) {
      throw fail(
        "recipe-invalid",
        `catalog is missing contract targets: ${missing.join(", ")}`,
      );
    }
  }

  const catalog = deepFreeze(
    [...recipes].sort((left, right) => left.id.localeCompare(right.id)),
  );
  if (usingBuiltIns) {
    defaultCatalog = catalog;
  }
  return catalog;
}

export function getTarget(id: string, catalog?: Catalog): InspectionRecipe;
export function getTarget(catalog: Catalog, id: string): InspectionRecipe;
export function getTarget(
  idOrCatalog: string | Catalog,
  catalogOrId?: Catalog | string,
): InspectionRecipe {
  const id = typeof idOrCatalog === "string" ? idOrCatalog : catalogOrId;
  const catalog =
    typeof idOrCatalog === "string"
      ? (catalogOrId as Catalog | undefined) ?? loadCatalog()
      : idOrCatalog;
  if (typeof id !== "string") {
    throw fail("usage", "target ID is required");
  }
  const target = catalog.find((recipe) => recipe.id === id);
  if (target === undefined) {
    throw fail("usage", `unknown target ${JSON.stringify(id)}`);
  }
  return target;
}

export { contract, probesById };
