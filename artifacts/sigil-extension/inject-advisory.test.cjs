const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "inject.js"), "utf8");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createHarness(options = {}) {
  const listeners = new Map();
  const queuedTasks = [];
  const events = [];
  let uuidCounter = 0;

  const provider = options.provider || {
    request() {
      return "provider-result";
    },
  };

  class TestCustomEvent {
    constructor(type, init) {
      if (options.customEventError) throw options.customEventError;
      this.type = type;
      this.detail = init.detail;
    }
  }

  const sandbox = {
    ethereum: provider,
    addEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];
      typeListeners.push(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type, listener) {
      const typeListeners = listeners.get(type) || [];
      listeners.set(
        type,
        typeListeners.filter((candidate) => candidate !== listener)
      );
    },
    dispatchEvent(event) {
      if (options.dispatchError) throw options.dispatchError;
      if (options.onDispatch) options.onDispatch(event);
      events.push(event);
      for (const listener of listeners.get(event.type) || []) listener.call(sandbox, event);
      return true;
    },
    setTimeout(callback) {
      if (options.timerError) throw options.timerError;
      if (options.synchronousTimer) callback();
      else queuedTasks.push(callback);
      return 1;
    },
    setInterval() {
      return 2;
    },
    clearInterval() {},
    crypto: {
      randomUUID: Object.hasOwn(options, "randomUUID")
        ? options.randomUUID
        : () => {
          uuidCounter += 1;
          return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
        },
    },
    CustomEvent: options.CustomEvent || TestCustomEvent,
    TextEncoder,
    Array,
    Date,
    JSON,
    Number,
    Object,
    Reflect,
    Set,
    WeakSet,
    console,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: "inject.js" });

  return {
    context,
    events,
    listeners,
    provider,
    queuedTasks,
    dispatchPage(type, detail) {
      return sandbox.dispatchEvent({ type, detail });
    },
    flushTasks() {
      while (queuedTasks.length > 0) queuedTasks.shift()();
    },
  };
}

test("a forged sigil:decision cannot gate or cancel provider execution", () => {
  let calls = 0;
  const provider = {
    request() {
      calls += 1;
      return "approved-by-wallet";
    },
  };
  const harness = createHarness({ provider });

  harness.dispatchPage("sigil:decision", { action: "cancel", requestId: "forged" });
  const result = provider.request({ method: "personal_sign", params: ["0x12", "0xabc"] });
  harness.dispatchPage("sigil:decision", { action: "cancel", requestId: "forged" });

  assert.equal(result, "approved-by-wallet");
  assert.equal(calls, 1);
  assert.equal(harness.listeners.has("sigil:decision"), false);
});

test("the provider is invoked exactly once with its receiver and every wrapper argument", () => {
  const marker = {};
  const extra = Symbol("extra");
  let captured;
  const provider = {
    request(...args) {
      captured = { receiver: this, args };
      return marker;
    },
  };
  createHarness({ provider });
  const request = { method: "eth_sign", params: ["0xabc", "0x12"] };

  const result = provider.request(request, extra, 17);

  assert.strictEqual(result, marker);
  assert.strictEqual(captured.receiver, provider);
  assert.deepEqual(captured.args, [request, extra, 17]);
});

test("the exact promise or thenable returned by the provider is returned", () => {
  for (const exactResult of [Promise.resolve("ok"), { then() {} }]) {
    const provider = { request: () => exactResult };
    createHarness({ provider });
    assert.strictEqual(provider.request({ method: "eth_sign", params: [] }), exactResult);
  }
});

test("an identical synchronous provider error is rethrown synchronously", () => {
  const exactError = new Error("wallet failure");
  const provider = {
    request() {
      throw exactError;
    },
  };
  const harness = createHarness({ provider });

  assert.throws(
    () => provider.request({ method: "eth_sign", params: [] }),
    (error) => error === exactError
  );
  assert.equal(harness.queuedTasks.length, 0);
});

test("provider invocation precedes advisory observation dispatch", () => {
  const order = [];
  const provider = {
    request() {
      order.push("provider");
      return "ok";
    },
  };
  const harness = createHarness({ provider, onDispatch: () => order.push("observation") });

  provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] });
  assert.deepEqual(order, ["provider"]);
  harness.flushTasks();
  assert.deepEqual(order, ["provider", "observation"]);
});

test("captured intrinsics survive page replacements after initialization", () => {
  const harness = createHarness();
  vm.runInContext(
    `
      globalThis.WeakSet = class { constructor() { throw new Error("replaced WeakSet"); } };
      globalThis.JSON = { stringify() { throw new Error("replaced JSON"); } };
      globalThis.TextEncoder = class { constructor() { throw new Error("replaced TextEncoder"); } };
      globalThis.CustomEvent = class { constructor() { throw new Error("replaced CustomEvent"); } };
      globalThis.crypto.randomUUID = () => "invalid";
      globalThis.dispatchEvent = () => { throw new Error("replaced dispatch"); };
      globalThis.setTimeout = () => { throw new Error("replaced timer"); };
      RegExp.prototype.test = () => { throw new Error("replaced RegExp.test"); };
    `,
    harness.context
  );

  const result = harness.provider.request({
    method: "eth_signTypedData_v4",
    params: [
      "0x1111111111111111111111111111111111111111",
      { domain: { name: "Sigil" }, message: { value: 1 } },
    ],
  });
  harness.flushTasks();

  assert.equal(result, "provider-result");
  assert.equal(harness.events.length, 1);
});

test("unsupported methods emit no observation", () => {
  const harness = createHarness();
  harness.provider.request({ method: "eth_call", params: [{ to: "0xabc" }] });
  harness.flushTasks();
  assert.equal(harness.events.length, 0);
});

test("observation details are detached from nested provider arguments", () => {
  const harness = createHarness();
  const transaction = { to: "0xabc", nested: { values: [1, 2] } };

  harness.provider.request({ method: "eth_sendTransaction", params: [transaction] });
  harness.flushTasks();

  assert.equal(harness.events.length, 1);
  const detail = harness.events[0].detail;
  assert.notStrictEqual(detail.target.data, transaction);
  assert.notStrictEqual(detail.target.data.nested, transaction.nested);
  detail.target.data.nested.values[0] = 99;
  assert.equal(transaction.nested.values[0], 1);
  transaction.nested.values[1] = 77;
  assert.equal(detail.target.data.nested.values[1], 2);
});

test("acyclic shared references are snapshotted into detached values", () => {
  const harness = createHarness();
  const shared = { value: "same source" };
  const transaction = { first: shared, second: shared };

  harness.provider.request({ method: "eth_sendTransaction", params: [transaction] });
  harness.flushTasks();

  assert.equal(harness.events.length, 1);
  const data = harness.events[0].detail.target.data;
  assert.deepEqual(plain(data), { first: { value: "same source" }, second: { value: "same source" } });
  assert.notStrictEqual(data.first, shared);
  assert.notStrictEqual(data.second, shared);
  assert.notStrictEqual(data.first, data.second);
});

test("hostile request getters and proxies are untouched until the queued task", () => {
  let providerInvoked = false;
  let traps = 0;
  const request = new Proxy(
    {},
    {
      getOwnPropertyDescriptor() {
        traps += 1;
        assert.equal(providerInvoked, true);
        throw new Error("hostile descriptor trap");
      },
      getPrototypeOf() {
        traps += 1;
        assert.equal(providerInvoked, true);
        throw new Error("hostile prototype trap");
      },
      get() {
        traps += 1;
        assert.equal(providerInvoked, true);
        throw new Error("hostile get trap");
      },
    }
  );
  const exactResult = {};
  const provider = {
    request(value) {
      assert.strictEqual(value, request);
      providerInvoked = true;
      return exactResult;
    },
  };
  const harness = createHarness({ provider });

  assert.strictEqual(provider.request(request), exactResult);
  assert.equal(traps, 0);
  assert.doesNotThrow(() => harness.flushTasks());
  assert.ok(traps > 0);
  assert.equal(harness.events.length, 0);
});

test("a scheduler that invokes synchronously cannot emit an observation", () => {
  const harness = createHarness({ synchronousTimer: true });
  const result = harness.provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] });
  assert.equal(result, "provider-result");
  assert.equal(harness.events.length, 0);
});

test("throwing scheduler, snapshot, CustomEvent, or dispatch cannot affect the provider result", async (t) => {
  await t.test("scheduler", () => {
    const exactResult = {};
    const harness = createHarness({
      provider: { request: () => exactResult },
      timerError: new Error("timer failed"),
    });
    assert.strictEqual(
      harness.provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] }),
      exactResult
    );
  });

  await t.test("snapshot", () => {
    const exactResult = {};
    const target = {};
    Object.defineProperty(target, "secret", {
      enumerable: true,
      get() {
        throw new Error("getter must not run");
      },
    });
    const harness = createHarness({ provider: { request: () => exactResult } });
    assert.strictEqual(
      harness.provider.request({ method: "eth_sendTransaction", params: [target] }),
      exactResult
    );
    assert.doesNotThrow(() => harness.flushTasks());
    assert.equal(harness.events.length, 0);
  });

  await t.test("CustomEvent", () => {
    const exactResult = {};
    const harness = createHarness({
      provider: { request: () => exactResult },
      customEventError: new Error("event failed"),
    });
    assert.strictEqual(
      harness.provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] }),
      exactResult
    );
    assert.doesNotThrow(() => harness.flushTasks());
  });

  await t.test("dispatch", () => {
    const exactResult = {};
    const harness = createHarness({
      provider: { request: () => exactResult },
      dispatchError: new Error("dispatch failed"),
    });
    assert.strictEqual(
      harness.provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] }),
      exactResult
    );
    assert.doesNotThrow(() => harness.flushTasks());
  });
});

test("all supported methods follow the target extraction matrix", () => {
  const address = "0x1111111111111111111111111111111111111111";
  const otherAddress = "0x2222222222222222222222222222222222222222";
  const typedPayload = { domain: { name: "Sigil" }, message: { value: 1 } };
  const v1Payload = [{ type: "string", name: "message", value: "hello" }];
  const cases = [
    ["eth_sendTransaction", [{ to: otherAddress, value: "0x1" }], { type: "transaction", data: { to: otherAddress, value: "0x1" } }],
    ["eth_signTransaction", [{ to: otherAddress, value: "0x2" }], { type: "transaction", data: { to: otherAddress, value: "0x2" } }],
    ["eth_sign", [address, "0x1234"], { type: "raw_sign", data: "0x1234", from: address }],
    ["personal_sign", ["0x5678", address], { type: "personal_sign", data: "0x5678", from: address }],
    ["eth_signTypedData", [address, typedPayload], { type: "typed_data", data: typedPayload, from: address }],
    ["eth_signTypedData", [typedPayload, address], { type: "typed_data", data: typedPayload, from: address }],
    ["eth_signTypedData_v1", [address, v1Payload], { type: "typed_data", data: v1Payload, from: address }],
    ["eth_signTypedData_v1", [v1Payload, address], { type: "typed_data", data: v1Payload, from: address }],
    ["eth_signTypedData_v3", [address, typedPayload], { type: "typed_data", data: typedPayload, from: address }],
    ["eth_signTypedData_v3", [typedPayload, address], { type: "typed_data", data: typedPayload, from: address }],
    ["eth_signTypedData_v4", [address, typedPayload], { type: "typed_data", data: typedPayload, from: address }],
    ["eth_signTypedData_v4", [typedPayload, address], { type: "typed_data", data: typedPayload, from: address }],
  ];

  for (const [method, params, expectedTarget] of cases) {
    const harness = createHarness();
    harness.provider.request({ method, params });
    harness.flushTasks();
    assert.equal(harness.events.length, 1, method);
    const detail = plain(harness.events[0].detail);
    assert.equal(detail.version, 1);
    assert.match(detail.observationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(detail.method, method);
    assert.equal(typeof detail.observedAt, "number");
    assert.deepEqual(detail.target, expectedTarget);
    assert.deepEqual(Object.keys(detail.target).sort(), Object.keys(expectedTarget).sort());
  }
});

test("typed-data extraction rejects ambiguous or missing address/payload pairs", () => {
  const addressA = "0x1111111111111111111111111111111111111111";
  const addressB = "0x2222222222222222222222222222222222222222";
  for (const params of [
    [addressA, addressB],
    [{ message: "one" }, { message: "two" }],
    [addressA],
  ]) {
    const harness = createHarness();
    harness.provider.request({ method: "eth_signTypedData_v4", params });
    harness.flushTasks();
    assert.equal(harness.events.length, 0);
  }
});

test("snapshot validation rejects unsafe values instead of truncating or invoking accessors", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get: () => "secret" });
  const symbolKey = { ok: true };
  symbolKey[Symbol("hidden")] = true;
  const invalidValues = [
    { value: undefined },
    { value: 1n },
    { value: Symbol("value") },
    { value() {} },
    accessor,
    cyclic,
    new Date(),
    symbolKey,
    { value: Number.POSITIVE_INFINITY },
    { value: "x".repeat(32769) },
    Array.from({ length: 129 }, (_, index) => index),
    Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`key${index}`, index])),
  ];

  for (const data of invalidValues) {
    const harness = createHarness();
    harness.provider.request({ method: "eth_sendTransaction", params: [data] });
    assert.doesNotThrow(() => harness.flushTasks());
    assert.equal(harness.events.length, 0);
  }
});

test("snapshot validation enforces depth, node, and final UTF-8 byte limits", () => {
  let tooDeep = { value: true };
  for (let index = 0; index < 9; index += 1) tooDeep = { child: tooDeep };
  const tooManyNodes = Array.from({ length: 128 }, () => [1, 2, 3, 4]);
  const tooManyBytes = { value: "é".repeat(32768) };

  for (const data of [tooDeep, tooManyNodes, tooManyBytes]) {
    const harness = createHarness();
    harness.provider.request({ method: "eth_sendTransaction", params: [data] });
    harness.flushTasks();
    assert.equal(harness.events.length, 0);
  }
});

test("inherited toJSON cannot bypass the final UTF-8 byte limit", () => {
  const transaction = {
    payload: ["a".repeat(32768), "b".repeat(32768)],
  };
  const realDetail = {
    version: 1,
    observationId: "00000000-0000-4000-8000-000000000001",
    method: "eth_sendTransaction",
    observedAt: 0,
    target: { type: "transaction", data: transaction },
  };
  assert.ok(new TextEncoder().encode(JSON.stringify(realDetail)).byteLength > 65536);
  const harness = createHarness();
  vm.runInContext(
    `
      Object.defineProperty(Object.getPrototypeOf({}), "toJSON", {
        configurable: true,
        value() { return "forged-small"; },
      });
    `,
    harness.context
  );

  harness.provider.request({ method: "eth_sendTransaction", params: [transaction] });
  harness.flushTasks();

  assert.equal(harness.events.length, 0);
});

test("snapshot validation rejects object keys over the UTF-16 string limit", () => {
  const oversizedKey = "k".repeat(32769);
  const transaction = { [oversizedKey]: true };
  const serializedTarget = JSON.stringify({ type: "transaction", data: transaction });
  assert.ok(new TextEncoder().encode(serializedTarget).byteLength < 65536);
  const harness = createHarness();

  harness.provider.request({ method: "eth_sendTransaction", params: [transaction] });
  harness.flushTasks();

  assert.equal(harness.events.length, 0);
});

test("missing or invalid randomUUID drops the observation", () => {
  for (const randomUUID of [
    undefined,
    () => "not-a-v4-uuid",
    () => {
      throw new Error("UUID failed");
    },
  ]) {
    const harness = createHarness({ randomUUID });
    const result = harness.provider.request({ method: "eth_sign", params: ["0xabc", "0x12"] });
    assert.equal(result, "provider-result");
    assert.doesNotThrow(() => harness.flushTasks());
    assert.equal(harness.events.length, 0);
  }
});
