const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const realCore = require("./core.js");

const contentSource = fs.readFileSync(path.join(__dirname, "content.js"), "utf8");
const FROM = "0x1234567890abcdef1234567890abcdef12345678";

function uuidFor(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function observation(index = 0, overrides = {}) {
  return {
    version: 1,
    observationId: uuidFor(index),
    method: "personal_sign",
    observedAt: 1_000_000,
    target: { type: "personal_sign", data: "hello", from: FROM },
    ...overrides,
  };
}

function createHarness({ holdStorage = false, requiresApi = false } = {}) {
  const listeners = new Map();
  const nodeListeners = new Map();
  let storageHeld = holdStorage;
  const pendingStorage = [];
  const pendingFetches = [];
  let current = 1_000_000;
  const effects = {
    storageReads: 0,
    storageWrites: 0,
    fetches: 0,
    dom: 0,
    renders: 0,
    decisions: 0,
    processed: 0,
  };
  const storageArea = {
    get(defaults, callback) {
      effects.storageReads += 1;
      if (storageHeld) pendingStorage.push(() => callback(defaults));
      else callback(defaults);
    },
    set(_value, callback) {
      effects.storageWrites += 1;
      if (!callback) return;
      if (storageHeld) pendingStorage.push(callback);
      else callback();
    },
  };
  const window = {
    location: { href: "https://example.test/app" },
    SigilExtensionCore: {
      ...realCore,
      createObservationGate: () => realCore.createObservationGate({ now: () => current }),
      normalizeSettings: (value) => value,
      getAnalysisInput: () => ({ kind: "simulation", value: "hello" }),
      localPreScreen: () => {
        effects.processed += 1;
        return {
          action: requiresApi ? "show" : "proceed",
          requiresApi,
          verdict: "caution",
          warnings: [],
        };
      },
      createHistoryEntry: (value) => value,
      trimHistory: (value) => value,
      createSessionEvent: (value) => value,
      recordSessionEvent: (value) => value,
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatchEvent(event) {
      if (event.type === "sigil:decision") effects.decisions += 1;
      const listener = listeners.get(event.type);
      if (listener) listener(event);
      return true;
    },
  };
  const nodes = new Map();
  const createNode = (id = "") => ({
    id,
    classList: { add() {}, remove() {} },
    addEventListener(name, listener) {
      nodeListeners.set(`${id}:${name}`, listener);
    },
    remove() {},
    set innerHTML(_value) {
      if (id === "content") effects.renders += 1;
    },
  });
  const shadow = {
    set innerHTML(_value) {},
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, createNode(id));
      return nodes.get(id);
    },
  };
  const document = {};
  Object.defineProperty(document, "createElement", {
    get() {
      effects.dom += 1;
      return () => ({
        id: "",
        style: { cssText: "" },
        attachShadow: () => shadow,
        remove() {},
      });
    },
  });
  Object.defineProperty(document, "documentElement", {
    get() {
      effects.dom += 1;
      return { appendChild() {} };
    },
  });
  const context = vm.createContext({
    window,
    document,
    chrome: { storage: { local: storageArea, sync: storageArea } },
    fetch: () => {
      effects.fetches += 1;
      return new Promise((resolve) => { pendingFetches.push(resolve); });
    },
    URL,
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail; }
    },
    Date: class extends Date { static now() { return current; } },
    Math,
    setTimeout: () => 0,
    clearTimeout: () => {},
    console,
  });
  vm.runInContext(contentSource, context, { filename: "content.js" });

  return {
    effects,
    dispatch(detail) {
      window.dispatchEvent({ type: "sigil:observation", detail });
    },
    reset() {
      for (const key of Object.keys(effects)) effects[key] = 0;
    },
    resolveFetch(index = 0, payload = { id: "analysis-id", verdict: "safe", warnings: [] }) {
      const resolve = pendingFetches[index];
      if (resolve) resolve({ ok: true, json: async () => payload });
    },
    releaseStorage() {
      storageHeld = false;
      while (pendingStorage.length > 0) pendingStorage.shift()();
    },
    advanceTime(milliseconds) {
      current += milliseconds;
    },
    click(id) {
      nodeListeners.get(`${id}:click`)?.();
    },
  };
}

function assertNoIntakeEffects(effects) {
  assert.deepEqual(effects, {
    storageReads: 0,
    storageWrites: 0,
    fetches: 0,
    dom: 0,
    renders: 0,
    decisions: 0,
    processed: 0,
  });
}

test("invalid UUID, stale, and oversized observations stop before every side effect", () => {
  const invalidDetails = [
    observation(0, { observationId: "invalid" }),
    observation(1, { observedAt: 969_999 }),
    observation(2, {
      method: "eth_signTypedData_v4",
      target: { type: "typed_data", data: { first: "a".repeat(32768), second: "a".repeat(32768) }, from: FROM },
    }),
  ];

  for (const detail of invalidDetails) {
    const harness = createHarness();
    harness.dispatch(detail);
    assertNoIntakeEffects(harness.effects);
  }
});

test("duplicate observation stops before storage, fetch, DOM, and queue work", async () => {
  const harness = createHarness();
  harness.dispatch(observation());
  await new Promise((resolve) => setImmediate(resolve));
  harness.reset();
  harness.dispatch(observation());
  assertNoIntakeEffects(harness.effects);
});

test("queue saturation rejects the ninth observation before side effects or later queue work", async () => {
  const harness = createHarness({ holdStorage: true });
  for (let index = 0; index < 8; index += 1) harness.dispatch(observation(index));
  harness.reset();
  harness.dispatch(observation(8));
  assertNoIntakeEffects(harness.effects);

  harness.releaseStorage();
  for (let index = 0; index < 20; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(harness.effects.processed, 8);
});

test("rate saturation rejects the thirteenth observation before side effects", async () => {
  const harness = createHarness();
  for (let index = 0; index < 12; index += 1) {
    harness.dispatch(observation(index));
    await new Promise((resolve) => setImmediate(resolve));
  }
  harness.reset();
  harness.dispatch(observation(12));
  assertNoIntakeEffects(harness.effects);
});

test("one accepted observation reaches the first settings storage read", () => {
  const harness = createHarness({ holdStorage: true });
  harness.dispatch(observation());
  assert.equal(harness.effects.storageReads, 1);
  assert.equal(harness.effects.storageWrites, 0);
  assert.equal(harness.effects.fetches, 0);
  assert.equal(harness.effects.dom, 0);
});

test("matching observation id allows a deferred API result to update the active advisory", async () => {
  const harness = createHarness({ requiresApi: true });
  harness.dispatch(observation());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.effects.fetches, 1);
  assert.equal(harness.effects.renders, 1);

  harness.resolveFetch(0);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(harness.effects.renders, 2);
  assert.ok(harness.effects.storageWrites > 0);
});

test("an old async result cannot update a newer observation that reuses the same id", async () => {
  const harness = createHarness({ requiresApi: true });
  harness.dispatch(observation());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.effects.renders, 1);

  harness.click("proceedBtn");
  harness.advanceTime(realCore.OBSERVATION_LIMITS.seenTtlMs);
  harness.dispatch(observation(0, { observedAt: 1_000_000 + realCore.OBSERVATION_LIMITS.seenTtlMs }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.effects.renders, 2);
  assert.equal(harness.effects.fetches, 2);

  harness.resolveFetch(0, { id: "stale-analysis", verdict: "safe", warnings: [] });
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.effects.renders, 2);
});

test("source gates observations before queueing and never queues raw event detail", () => {
  assert.match(contentSource, /addEventListener\("sigil:observation"/);
  assert.doesNotMatch(contentSource, /addEventListener\("sigil:intercept"/);
  assert.doesNotMatch(contentSource, /requestQueue\.push\(event\.detail\)/);
  assert.match(contentSource, /const decision = observationGate\.accept[\s\S]*requestQueue\.push\(decision\.observation\)/);
  assert.ok(contentSource.indexOf("observationGate.accept") < contentSource.indexOf("requestQueue.push"));
  assert.doesNotMatch(contentSource, /activeRequest\?\.requestId/);
});
