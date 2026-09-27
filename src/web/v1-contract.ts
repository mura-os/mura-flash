import registryJson from "../../contracts/procedure-v1.json";
import registrySchema from "../../contracts/procedure-v1.schema.json";
import contractJson from "../../contracts/v1.json";
import contractSchema from "../../contracts/v1.schema.json";

import { fail } from "./errors";
import {
  deepFreeze,
  formatValidationIssues,
  validateSchema,
} from "./schema";
import type {
  ProcedureRegistry,
  RegistryOperation,
} from "./v1-types";

function assertValidEmbedded(
  value: unknown,
  schema: unknown,
  name: string,
): void {
  const issues = validateSchema(value, schema);
  if (issues.length > 0) {
    throw fail(
      "contract-mismatch",
      `invalid embedded ${name}: ${formatValidationIssues(issues)}`,
    );
  }
}

assertValidEmbedded(contractJson, contractSchema, "v1 contract");
assertValidEmbedded(registryJson, registrySchema, "procedure registry");

const expectedSchemas = new Map([
  ["org.mura.flash.target-record/v1", "catalog/target-record-v1.schema.json"],
  ["org.mura.flash.target-catalog-index/v1", "catalog/index-v1.schema.json"],
  ["org.mura.flash.install-procedure/v1", "recipes/install-procedure-v1.schema.json"],
  ["org.mura.flash.replay-scenario/v1", "replay/scenario-v1.schema.json"],
  ["org.mura.flash.backup-result/v1", "records/backup-result-v1.schema.json"],
  ["org.mura.flash.transcript-event/v1", "records/transcript-event-v1.schema.json"],
]);
const declaredSchemas = new Map(
  contractJson.documentSchemas.map((reference) => [
    reference.schema,
    reference.path,
  ]),
);
if (
  declaredSchemas.size !== expectedSchemas.size ||
  [...expectedSchemas].some(
    ([schema, path]) => declaredSchemas.get(schema) !== path,
  ) ||
  contractJson.procedureRegistry.schema !==
    "org.mura.flash.procedure-registry/v1" ||
  contractJson.procedureRegistry.path !== "contracts/procedure-v1.json"
) {
  throw fail("contract-mismatch", "v1 contract schema registry is not exact");
}

export const contractV1 = deepFreeze(contractJson);
export const procedureRegistry = deepFreeze(
  registryJson as ProcedureRegistry,
);

const valueTypes = new Set(procedureRegistry.valueTypes);
const safetyClasses = new Set(procedureRegistry.safetyClasses);
const operations = new Map<string, RegistryOperation>();

for (const operation of procedureRegistry.operations) {
  if (operations.has(operation.id)) {
    throw fail(
      "contract-mismatch",
      `duplicate registry operation ${JSON.stringify(operation.id)}`,
    );
  }
  if (!safetyClasses.has(operation.safetyClass)) {
    throw fail(
      "contract-mismatch",
      `registry operation ${operation.id} uses unknown safety class`,
    );
  }
  const inputNames = new Set<string>();
  for (const port of [...operation.inputs, ...operation.outputs]) {
    if (!valueTypes.has(port.type)) {
      throw fail(
        "contract-mismatch",
        `registry operation ${operation.id} uses unknown value type ${port.type}`,
      );
    }
  }
  for (const port of operation.inputs) {
    if (inputNames.has(port.name)) {
      throw fail(
        "contract-mismatch",
        `registry operation ${operation.id} has duplicate input ${port.name}`,
      );
    }
    inputNames.add(port.name);
  }
  const outputNames = new Set<string>();
  for (const port of operation.outputs) {
    if (outputNames.has(port.name)) {
      throw fail(
        "contract-mismatch",
        `registry operation ${operation.id} has duplicate output ${port.name}`,
      );
    }
    outputNames.add(port.name);
  }
  operations.set(operation.id, operation);
}

export const registryOperations = operations as ReadonlyMap<
  string,
  RegistryOperation
>;
