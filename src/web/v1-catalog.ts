import indexSchema from "../../catalog/index-v1.schema.json";
import targetSchema from "../../catalog/target-record-v1.schema.json";
import procedureSchema from "../../recipes/install-procedure-v1.schema.json";
import builtInProcedureTexts from "virtual:mura-v1-procedures";
import rawV1Data from "virtual:mura-v1-raw-data";

import { fail } from "./errors";
import { canonicalJson, deepFreeze, parseAndValidate } from "./schema";
import { sha256Utf8 } from "./sha256";
import { validateProcedureDocument } from "./procedure";
import type {
  CatalogIndexEntry,
  CatalogIndexV1,
  InstallProcedure,
  ProcedureCatalog,
  TargetCatalogV1,
  TargetRecord,
} from "./v1-types";

function compareIds(
  left: { readonly id: string },
  right: { readonly id: string },
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function normalizeSources(
  sources: string | unknown | readonly (string | unknown)[],
): readonly (string | unknown)[] {
  return Array.isArray(sources) ? sources : [sources];
}

function uniqueCatalog<T extends { readonly id: string }>(
  documents: readonly T[],
  kind: string,
): readonly T[] {
  const seen = new Set<string>();
  for (const document of documents) {
    if (seen.has(document.id)) {
      throw fail(
        "closure-unresolved",
        `duplicate ${kind} ${JSON.stringify(document.id)}`,
      );
    }
    seen.add(document.id);
  }
  return deepFreeze([...documents].sort(compareIds));
}

let defaultTargetCatalog: TargetCatalogV1 | undefined;
let defaultProcedureCatalog: ProcedureCatalog | undefined;

const rawByPath = new Map(rawV1Data.map((entry) => [entry.path, entry.text]));
const builtInIndex = deepFreeze(
  parseAndValidate<CatalogIndexV1>(
    rawByPath.get("catalog/index-v1.json"),
    indexSchema,
    "contract-mismatch",
  ),
);
for (const [name, entries] of [
  ["targets", builtInIndex.targets],
  ["procedures", builtInIndex.procedures],
] as const) {
  const ids = entries.map((entry) => entry.id);
  const sorted = [...ids].sort();
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id, index) => id !== sorted[index])
  ) {
    throw fail("contract-mismatch", `${name} index IDs must be unique and sorted`);
  }
}
const builtInTargetTexts = builtInIndex.targets.map((entry) => {
  const text = rawByPath.get(entry.path);
  if (text === undefined) {
    throw fail("contract-mismatch", `indexed target path is missing: ${entry.path}`);
  }
  return text;
});

function verifyIndexEntry(
  document: { readonly id: string },
  entry: CatalogIndexEntry,
  expectedPath: string,
): void {
  if (entry.id !== document.id || entry.path !== expectedPath) {
    throw fail(
      "contract-mismatch",
      `catalog index binding mismatch for ${JSON.stringify(document.id)}`,
    );
  }
  const canonical = canonicalJson(document);
  const size = new TextEncoder().encode(canonical).byteLength;
  if (entry.canonicalSize !== size || entry.sha256 !== sha256Utf8(canonical)) {
    throw fail(
      "contract-mismatch",
      `catalog index digest mismatch for ${JSON.stringify(document.id)}`,
    );
  }
}

function verifyTargetClosure(targets: TargetCatalogV1): void {
  const targetById = new Map(targets.map((target) => [target.id, target]));
  if (
    targetById.size !== builtInIndex.targets.length ||
    builtInIndex.targets.some((entry) => !targetById.has(entry.id))
  ) {
    throw fail("contract-mismatch", "target index does not exactly match bundled targets");
  }
  for (const entry of builtInIndex.targets) {
    const target = targetById.get(entry.id);
    if (target === undefined) {
      throw fail("contract-mismatch", `indexed target is missing: ${entry.id}`);
    }
    verifyIndexEntry(target, entry, `catalog/targets/${target.id}.json`);
  }
}

function verifyProcedureClosure(
  procedures: ProcedureCatalog,
  targets: TargetCatalogV1,
): void {
  const procedureById = new Map(
    procedures.map((procedure) => [procedure.id, procedure]),
  );
  if (
    procedureById.size !== builtInIndex.procedures.length ||
    builtInIndex.procedures.some((entry) => !procedureById.has(entry.id))
  ) {
    throw fail(
      "contract-mismatch",
      "procedure index does not exactly match bundled procedures",
    );
  }
  for (const entry of builtInIndex.procedures) {
    const procedure = procedureById.get(entry.id);
    if (procedure === undefined || procedure.targetId !== entry.targetId) {
      throw fail("contract-mismatch", `indexed procedure binding mismatch: ${entry.id}`);
    }
    verifyIndexEntry(
      procedure,
      entry,
      `recipes/procedures/${procedure.id}.json`,
    );
  }
  for (const target of targets) {
    const actual = procedures
      .filter((procedure) => procedure.targetId === target.id)
      .map((procedure) => procedure.id)
      .sort();
    const declared =
      target.procedureAvailability.kind === "available"
        ? [...target.procedureAvailability.procedureIds].sort()
        : [];
    if (canonicalJson(actual) !== canonicalJson(declared)) {
      throw fail(
        "closure-unresolved",
        `target ${target.id} procedure availability does not match catalog`,
      );
    }
  }
}

export function loadTargetCatalog(
  sources?: string | unknown | readonly (string | unknown)[],
): TargetCatalogV1 {
  if (sources === undefined && defaultTargetCatalog !== undefined) {
    return defaultTargetCatalog;
  }
  const documents = normalizeSources(sources ?? builtInTargetTexts).map(
    (source) =>
      deepFreeze(
        parseAndValidate<TargetRecord>(
          source,
          targetSchema,
          "invalid-document",
        ),
      ),
  );
  const catalog = uniqueCatalog(documents, "target record");
  if (sources === undefined) {
    verifyTargetClosure(catalog);
    defaultTargetCatalog = catalog;
  }
  return catalog;
}

export function loadProcedureCatalog(
  sources?: string | unknown | readonly (string | unknown)[],
): ProcedureCatalog {
  if (sources === undefined && defaultProcedureCatalog !== undefined) {
    return defaultProcedureCatalog;
  }
  const targets = sources === undefined ? loadTargetCatalog() : undefined;
  const documents = normalizeSources(sources ?? builtInProcedureTexts).map(
    (source) => {
      const parsed = parseAndValidate<InstallProcedure>(
        source,
        procedureSchema,
        "invalid-document",
      );
      return validateProcedureDocument(
        parsed,
        targets === undefined ? {} : { targetCatalog: targets },
      );
    },
  );
  const catalog = uniqueCatalog(documents, "procedure");
  if (sources === undefined) {
    verifyProcedureClosure(catalog, targets as TargetCatalogV1);
    defaultProcedureCatalog = catalog;
  }
  return catalog;
}

export function getProcedure(
  id: string,
  catalog?: ProcedureCatalog,
): InstallProcedure;
export function getProcedure(
  catalog: ProcedureCatalog,
  id: string,
): InstallProcedure;
export function getProcedure(
  idOrCatalog: string | ProcedureCatalog,
  catalogOrId?: ProcedureCatalog | string,
): InstallProcedure {
  const id = typeof idOrCatalog === "string" ? idOrCatalog : catalogOrId;
  const catalog =
    typeof idOrCatalog === "string"
      ? (catalogOrId as ProcedureCatalog | undefined) ?? loadProcedureCatalog()
      : idOrCatalog;
  if (typeof id !== "string") {
    throw fail("invalid-document", "procedure ID is required");
  }
  const procedure = catalog.find((candidate) => candidate.id === id);
  if (procedure === undefined) {
    throw fail("closure-unresolved", `unknown procedure ${JSON.stringify(id)}`);
  }
  return procedure;
}
