import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import * as api from "../../dist/mura-flash.mjs";
import { recipe } from "./fixtures.mjs";

const sharedFixtureRoot = new URL("../fixtures/recipes/", import.meta.url);

test("exports only the contracted ESM surface", () => {
  assert.deepEqual(Object.keys(api).sort(), [
    "createBrowserSession",
    "createReplaySession",
    "getProcedure",
    "getTarget",
    "loadCatalog",
    "loadProcedureCatalog",
    "loadTargetCatalog",
    "planProcedure",
    "redactTranscript",
    "validateProcedure",
    "validateRecipe",
    "validateReplayScenario",
  ]);
});

test("contains no CSP-blocked dynamic code generation", () => {
  for (const name of ["mura-flash.mjs", "mura-flash.min.mjs"]) {
    const distribution = fs.readFileSync(
      new URL(`../../dist/${name}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(distribution, /\b(?:eval|Function)\s*\(/u, name);
  }
});

test("loads the complete committed target catalog", () => {
  const catalog = api.loadCatalog();
  assert.equal(catalog.length, 15);
  assert.equal(catalog[0].id, "htc-vive-xr-elite-kyoto");
});

test("validates and freezes a recipe", () => {
  const validated = api.validateRecipe(JSON.stringify(recipe()));
  assert.equal(validated.id, "oculus-go-pacific");
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.probes), true);
});

test("rejects duplicate JSON keys before schema validation", () => {
  const source = JSON.stringify(recipe()).replace(
    '"id":"oculus-go-pacific"',
    '"id":"oculus-go-pacific","id":"quest-1-monterey"',
  );
  assert.throws(
    () => api.validateRecipe(source),
    (error) =>
      error.code === "recipe-invalid" &&
      error.message.includes('duplicate key "id"'),
  );
});

test("rejects unknown fields and non-allowlisted probes", () => {
  assert.throws(
    () => api.validateRecipe({ ...recipe(), unexpected: true }),
    (error) =>
      error.code === "recipe-invalid" &&
      error.message.includes('unknown field "unexpected"'),
  );
  assert.throws(
    () =>
      api.validateRecipe(
        recipe({
          probes: ["adb.model", "adb.not-allowed"],
          redactFacts: [],
        }),
      ),
    (error) =>
      error.code === "recipe-invalid" &&
      error.message.includes("is not allowlisted"),
  );
});

test("strictly rejects malformed recipe structures", () => {
  const cases = [
    {
      value: recipe({ models: "Oculus Go" }),
      message: "$/models: must be an array",
    },
    {
      value: (() => {
        const { vendor: _vendor, ...missingVendor } = recipe();
        return missingVendor;
      })(),
      message: '$: missing required field "vendor"',
    },
    {
      value: recipe({
        builds: [{ id: "all", status: "future-status" }],
      }),
      message: "$/builds/0/status: must be one of",
    },
    {
      value: recipe({ sources: ["not a URL"] }),
      message: "$/sources/0: must be a valid URI",
    },
  ];

  for (const { value, message } of cases) {
    assert.throws(
      () => api.validateRecipe(value),
      (error) =>
        error.code === "recipe-invalid" && error.message.includes(message),
      message,
    );
  }
});

test("requires sensitive facts to be redacted", () => {
  assert.throws(
    () => api.validateRecipe(recipe({ redactFacts: [] })),
    (error) =>
      error.code === "recipe-invalid" &&
      error.message.includes('sensitive fact "vbmeta-digest" is missing'),
  );
});

test("loads a sorted catalog and resolves either argument order", () => {
  const second = recipe({
    id: "quest-1-monterey",
    displayName: "Quest",
  });
  const catalog = api.loadCatalog([second, recipe()]);
  assert.deepEqual(
    catalog.map((target) => target.id),
    ["oculus-go-pacific", "quest-1-monterey"],
  );
  assert.equal(api.getTarget("quest-1-monterey", catalog), second);
  assert.equal(api.getTarget(catalog, "oculus-go-pacific").displayName, "Oculus Go");
});

test("rejects duplicate target recipes", () => {
  assert.throws(
    () => api.loadCatalog([recipe(), recipe()]),
    (error) =>
      error.code === "recipe-invalid" &&
      error.message.includes("duplicate target recipe"),
  );
});

test("agrees with the shared cross-frontend recipe fixtures", () => {
  const manifest = JSON.parse(
    fs.readFileSync(new URL("manifest.json", sharedFixtureRoot), "utf8"),
  );
  for (const [relativePath, expectedError] of Object.entries(
    manifest.fixtures,
  )) {
    const source = fs.readFileSync(
      new URL(relativePath, sharedFixtureRoot),
      "utf8",
    );
    if (expectedError === null) {
      assert.doesNotThrow(() => api.validateRecipe(source), relativePath);
    } else {
      assert.throws(
        () => api.validateRecipe(source),
        (error) => error.code === expectedError,
        relativePath,
      );
    }
  }
});
