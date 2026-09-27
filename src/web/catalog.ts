import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";

import contractJson from "../../contracts/v0.json";
import contractSchema from "../../contracts/v0.schema.json";
import recipeSchema from "../../recipes/inspection-recipe-v1.schema.json";
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

function uriIsValid(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol.length > 1;
  } catch {
    return false;
  }
}

function validator(schema: object): ValidateFunction {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    validateFormats: true,
    formats: {
      uri: {
        type: "string",
        validate: uriIsValid,
      },
    },
  });
  return ajv.compile(schema);
}

const validateContractSchema = validator(contractSchema);
const validateRecipeSchema = validator(recipeSchema);
const contract = contractJson as FlashContract;

function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
  return [...(errors ?? [])]
    .sort((left, right) => {
      const byPath = left.instancePath.localeCompare(right.instancePath);
      return byPath === 0
        ? left.keyword.localeCompare(right.keyword)
        : byPath;
    })
    .map((error) => {
      const path = error.instancePath.length === 0 ? "$" : `$${error.instancePath}`;
      if (
        error.keyword === "additionalProperties" &&
        "additionalProperty" in error.params
      ) {
        return `${path}: unknown field ${JSON.stringify(
          error.params["additionalProperty"],
        )}`;
      }
      return `${path}: ${error.message ?? error.keyword}`;
    })
    .join("; ");
}

if (!validateContractSchema(contractJson)) {
  throw fail(
    "safety-refusal",
    `invalid embedded contract: ${formatValidationErrors(
      validateContractSchema.errors,
    )}`,
  );
}

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
  if (!validateRecipeSchema(value)) {
    throw fail(
      "recipe-invalid",
      formatValidationErrors(validateRecipeSchema.errors),
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
