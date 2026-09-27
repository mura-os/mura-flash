import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  createReplaySession,
  loadProcedureCatalog,
} from "../dist/mura-flash.mjs";

function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

const scenarioPath = process.argv[2];
if (scenarioPath === undefined) {
  console.error("usage: node tools/replay_scenario.mjs SCENARIO");
  process.exit(2);
}

const source = fs.readFileSync(scenarioPath, "utf8");
const scenario = JSON.parse(source);
const procedure = loadProcedureCatalog().find(
  (candidate) => candidate.id === scenario.procedureId,
);
if (procedure === undefined) {
  console.error(`unknown procedure ${JSON.stringify(scenario.procedureId)}`);
  process.exit(2);
}

const result = await createReplaySession({
  procedureCatalog: [procedure],
}).replay(source);
process.stdout.write(`${JSON.stringify(canonical(result))}\n`);
