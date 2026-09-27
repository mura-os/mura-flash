import assert from "node:assert/strict";
import test from "node:test";

import {
  createBrowserSession,
  loadCatalog,
  redactTranscript,
} from "../../dist/mura-flash.mjs";
import { FakeAdapter, recipe } from "./fixtures.mjs";

const fixedNow = () => new Date("2026-01-02T03:04:05.000Z");

test("runs only compiled-in read-only facts through an injected adapter", async () => {
  const adapter = new FakeAdapter();
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
    now: fixedNow,
  });

  const report = await session.inspect("oculus-go-pacific");
  assert.deepEqual(adapter.reads, ["model", "vbmeta-digest"]);
  assert.deepEqual(report.facts, {
    model: "Oculus Go",
    "vbmeta-digest": "[REDACTED]",
  });
  assert.equal(report.transcript[0].at, "2026-01-02T03:04:05.000Z");
  assert.equal(report.transcript[1].value, "[REDACTED]");
  assert.equal(session.transcript[1].value, "[REDACTED]");
  assert.equal(adapter.closed, 1);
  assert.deepEqual(Object.keys(session).sort(), []);
});

test("enforces the one-device limit", async () => {
  const adapter = new FakeAdapter({
    devices: [
      { serial: "one", vendorId: 1, productId: 2 },
      { serial: "two", vendorId: 1, productId: 2 },
    ],
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    createAdbTransport: () => adapter,
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "device-ambiguous",
  );
  assert.equal(adapter.reads.length, 0);
  assert.equal(adapter.closed, 1);
});

test("rejects a different unit on reconnect", async () => {
  const adapters = [
    new FakeAdapter({
      devices: [{ serial: "one", vendorId: 1, productId: 2 }],
    }),
    new FakeAdapter({
      devices: [{ serial: "two", vendorId: 1, productId: 2 }],
    }),
  ];
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    createAdbTransport: () => adapters.shift(),
  });

  await session.inspect("oculus-go-pacific");
  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) =>
      error.code === "safety-refusal" &&
      error.message.includes("does not match the original unit"),
  );
});

test("rejects same-transport substitution before reconnect", async () => {
  const adapters = [
    new FakeAdapter({
      devices: [{ serial: "unit-one", vendorId: 1, productId: 2 }],
    }),
    new FakeAdapter({
      devices: [{ serial: "unit-two", vendorId: 1, productId: 2 }],
    }),
  ];
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapters.shift() },
  });

  await session.inspect("oculus-go-pacific");
  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "safety-refusal",
  );
  assert.equal(adapters.length, 0);
});

test("binds one stable serial across ADB and fastboot", async () => {
  const dualRecipe = recipe({
    transports: ["adb", "fastboot"],
    probes: ["adb.model", "fastboot.product"],
    redactFacts: [],
  });
  const adb = new FakeAdapter({
    devices: [{ serial: "same-unit", vendorId: 1, productId: 2 }],
  });
  const fastboot = new FakeAdapter({
    kind: "fastboot",
    devices: [{ serial: "same-unit", vendorId: 9, productId: 10 }],
    facts: { product: "pacific" },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([dualRecipe]),
    transports: { adb: () => adb, fastboot: () => fastboot },
  });

  await session.inspect("oculus-go-pacific", { transport: "adb" });
  const report = await session.inspect("oculus-go-pacific", {
    transport: "fastboot",
  });
  assert.deepEqual(report.facts, { product: "pacific" });
});

test("rejects cross-transport substitution", async () => {
  const dualRecipe = recipe({
    transports: ["adb", "fastboot"],
    probes: ["adb.model", "fastboot.product"],
    redactFacts: [],
  });
  const session = createBrowserSession({
    catalog: loadCatalog([dualRecipe]),
    transports: {
      adb: () =>
        new FakeAdapter({
          devices: [{ serial: "adb-unit", vendorId: 1, productId: 2 }],
        }),
      fastboot: () =>
        new FakeAdapter({
          kind: "fastboot",
          devices: [{ serial: "other-unit", vendorId: 1, productId: 2 }],
          facts: { product: "pacific" },
        }),
    },
  });

  await session.inspect("oculus-go-pacific", { transport: "adb" });
  await assert.rejects(
    session.inspect("oculus-go-pacific", { transport: "fastboot" }),
    (error) => error.code === "safety-refusal",
  );
});

test("rejects identical serial-less device identities", async () => {
  const adapter = new FakeAdapter({
    devices: [{ vendorId: 1, productId: 2 }],
    connectedDevice: { vendorId: 1, productId: 2 },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) =>
      error.code === "safety-refusal" &&
      error.message.includes("stable serial"),
  );
  assert.equal(adapter.connects.length, 0);
});

test("rejects a connection that substitutes the selected serial", async () => {
  const adapter = new FakeAdapter({
    devices: [{ serial: "selected", vendorId: 1, productId: 2 }],
    connectedDevice: { serial: "substitute", vendorId: 1, productId: 2 },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "safety-refusal",
  );
  assert.equal(adapter.reads.length, 0);
});

test("enforces the aggregate output limit", async () => {
  const adapter = new FakeAdapter({
    facts: {
      model: "x".repeat(1048577),
      "vbmeta-digest": "digest",
    },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    createAdbTransport: () => adapter,
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "safety-refusal",
  );
  assert.equal(adapter.reads.length, 1);
});

test("passes the remaining cumulative byte budget to each probe", async () => {
  const adapter = new FakeAdapter({
    facts: { model: "four", "vbmeta-digest": "123456" },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });

  await session.inspect("oculus-go-pacific");
  assert.deepEqual(adapter.budgets, [1048576, 1048572]);
});

test("does not start another probe after the output budget is exhausted", async () => {
  const adapter = new FakeAdapter({
    facts: {
      model: "x".repeat(1048576),
      "vbmeta-digest": "must-not-be-read",
    },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "safety-refusal",
  );
  assert.deepEqual(adapter.reads, ["model"]);
});

test("rejects chunked output once its encoded size exceeds the budget", async () => {
  const adapter = new FakeAdapter({
    chunks: {
      model: ["x".repeat(1048575), "é"],
    },
  });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });

  await assert.rejects(
    session.inspect("oculus-go-pacific"),
    (error) => error.code === "probe-failed",
  );
  assert.deepEqual(adapter.reads, ["model"]);
});

test("aborts and closes a never-resolving probe on timeout", async () => {
  const adapter = new FakeAdapter({ neverFacts: ["model"] });
  const session = createBrowserSession({
    catalog: loadCatalog([recipe()]),
    transports: { adb: () => adapter },
  });
  const originalSetTimeout = globalThis.setTimeout;
  let timers = 0;
  globalThis.setTimeout = (callback, delay, ...arguments_) => {
    timers += 1;
    if (timers === 3) {
      queueMicrotask(() => callback(...arguments_));
      return undefined;
    }
    return originalSetTimeout(callback, delay, ...arguments_);
  };

  try {
    await assert.rejects(
      session.inspect("oculus-go-pacific"),
      (error) => error.code === "probe-timeout",
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
  assert.deepEqual(adapter.aborted, ["model"]);
  assert.equal(adapter.closed, 1);
});

test("redacts structured and textual secrets without mutating input", () => {
  const input = [
    {
      fact: "vbmeta-digest",
      value: "abc",
      error: "token=secret-value",
      serialNumber: "device-serial",
    },
  ];
  const output = redactTranscript(input);
  assert.equal(output[0].value, "[REDACTED]");
  assert.equal(output[0].error, "token=[REDACTED]");
  assert.equal(output[0].serialNumber, "[REDACTED]");
  assert.equal(input[0].value, "abc");
});
