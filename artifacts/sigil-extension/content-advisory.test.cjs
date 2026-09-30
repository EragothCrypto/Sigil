const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const realCore = require("./core.js");

const source = fs.readFileSync(path.join(__dirname, "content.js"), "utf8");
const FROM = "0x1234567890abcdef1234567890abcdef12345678";

function observation(index) {
  return {
    version: 1,
    observationId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    method: "personal_sign",
    observedAt: 1_000_000,
    target: { type: "personal_sign", data: `message-${index}`, from: FROM },
  };
}

function createHarness() {
  const windowListeners = new Map();
  const nodeListeners = new Map();
  const fetchResolvers = [];
  const timers = new Map();
  let timerId = 0;
  const effects = { processed: 0, fetches: 0, renders: 0, writes: 0 };

  const storage = {
    get(defaults, callback) { callback(defaults); },
    set(_value, callback) {
      effects.writes += 1;
      callback?.();
    },
  };
  const nodes = new Map();
  const createNode = (id) => ({
    classList: { add() {}, remove() {} },
    addEventListener(name, listener) { nodeListeners.set(`${id}:${name}`, listener); },
    set innerHTML(_value) { if (id === "content") effects.renders += 1; },
  });
  const shadow = {
    set innerHTML(_value) {},
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, createNode(id));
      return nodes.get(id);
    },
  };
  const window = {
    location: { href: "https://example.test/app" },
    SigilExtensionCore: {
      ...realCore,
      createObservationGate: () => realCore.createObservationGate({ now: () => 1_000_000 }),
      localPreScreen: () => {
        effects.processed += 1;
        return { display: "show", requiresApi: true, verdict: "caution", riskScore: 40, warnings: [] };
      },
    },
    addEventListener(name, listener) { windowListeners.set(name, listener); },
    dispatchEvent(event) {
      windowListeners.get(event.type)?.(event);
      return true;
    },
  };
  const document = {
    createElement() {
      return {
        id: "",
        style: { cssText: "" },
        attachShadow: () => shadow,
        remove() {},
      };
    },
    documentElement: { appendChild() {} },
  };
  const context = vm.createContext({
    window,
    document,
    chrome: { storage: { local: storage, sync: storage } },
    fetch: () => {
      effects.fetches += 1;
      return new Promise((resolve) => fetchResolvers.push(resolve));
    },
    URL,
    Date: class extends Date { static now() { return 1_000_000; } },
    Math,
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, delay, cleared: false });
      return id;
    },
    clearTimeout(id) {
      const timer = timers.get(id);
      if (timer) timer.cleared = true;
    },
    console,
  });
  vm.runInContext(source, context, { filename: "content.js" });

  return {
    effects,
    dispatch(value) { window.dispatchEvent({ type: "sigil:observation", detail: value }); },
    resolveFetch(index, payload = { id: `analysis-${index}`, verdict: "safe", riskScore: 5, warnings: [] }) {
      fetchResolvers[index]?.({ ok: true, json: async () => payload });
    },
    fireTimer(id) { timers.get(id)?.callback(); },
    timer(id) { return timers.get(id); },
    listener(id) { return nodeListeners.get(`${id}:click`); },
  };
}

async function settle(turns = 4) {
  for (let index = 0; index < turns; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

test("stale API and timer callbacks cannot mutate or close the next advisory", async () => {
  const harness = createHarness();
  harness.dispatch(observation(1));
  harness.dispatch(observation(2));
  harness.dispatch(observation(3));
  await settle();

  assert.equal(harness.effects.processed, 1);
  assert.equal(harness.effects.fetches, 1);
  assert.equal(harness.effects.renders, 1);
  assert.equal(harness.timer(1).delay, 45000);

  harness.fireTimer(1);
  await settle();
  assert.equal(harness.effects.processed, 2);
  assert.equal(harness.effects.fetches, 2);
  assert.equal(harness.effects.renders, 2);
  const secondDismiss = harness.listener("dismissBtn");
  const writesBeforeStale = harness.effects.writes;

  harness.resolveFetch(0);
  harness.fireTimer(1);
  await settle();
  assert.equal(harness.effects.renders, 2);
  assert.equal(harness.effects.writes, writesBeforeStale);
  assert.equal(harness.timer(2).cleared, false);
  assert.equal(harness.effects.processed, 2);

  await secondDismiss();
  await settle();
  assert.equal(harness.timer(2).cleared, true);
  assert.equal(harness.effects.processed, 3);

  await secondDismiss();
  await settle();
  assert.equal(harness.effects.processed, 3);
});
