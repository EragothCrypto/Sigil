const assert = require("node:assert/strict");
const core = require("./core.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("normalizes settings with safe defaults", () => {
  const settings = core.normalizeSettings({});
  assert.equal(settings.enabled, true);
  assert.equal(settings.protectionMode, "standard");
  assert.equal(settings.notificationPolicy, "critical");
  assert.equal(settings.syncEnabled, false);
  assert.equal(settings.apiUrl, "https://sigil.s3ntrylabs.com");
  assert.deepEqual(settings.trustedSites, []);
  assert.deepEqual(settings.trustedContracts, []);
});

test("keeps settings sync opt-in and excludes analysis history", () => {
  const settings = core.normalizeSettings({
    syncEnabled: true,
    protectionMode: "strict",
    notificationPolicy: "important",
    trustedSites: ["app.uniswap.org"],
    trustedContracts: ["0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48"],
    history: [{ id: "must-stay-local" }],
    sessions: [{ id: "must-stay-local" }],
  });

  assert.equal(settings.syncEnabled, true);
  const syncPayload = core.createSyncSettingsPayload(settings);
  assert.deepEqual(Object.keys(syncPayload).sort(), [
    "apiUrl",
    "enabled",
    "historyLimit",
    "notificationPolicy",
    "protectionMode",
    "syncEnabled",
    "trustedContracts",
    "trustedSites",
  ]);
  assert.equal(syncPayload.syncEnabled, true);
  assert.equal(syncPayload.protectionMode, "strict");
  assert.deepEqual(syncPayload.trustedContracts, ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]);
  assert.equal("history" in syncPayload, false);
  assert.equal("sessions" in syncPayload, false);
});

test("extracts transaction address target when there is no calldata", () => {
  const target = {
    type: "transaction",
    data: {
      to: "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48",
      data: "0x",
    },
  };

  const input = core.getAnalysisInput(target);
  assert.equal(input.kind, "address");
  assert.equal(input.value, "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48");
});

test("uses calldata simulation before address lookup for contract calls", () => {
  const target = {
    type: "transaction",
    data: {
      to: "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48",
      data: "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25ef",
      value: "0x0",
    },
  };

  const input = core.getAnalysisInput(target);
  assert.equal(input.kind, "simulation");
  assert.match(input.value, /095ea7b3/);
  assert.match(input.value, /A0b86991/);
});

test("extracts typed data as simulation input", () => {
  const input = core.getAnalysisInput({
    type: "typed_data",
    data: { domain: { name: "Example" }, message: { value: 1 } },
  });

  assert.equal(input.kind, "simulation");
  assert.match(input.value, /"Example"/);
});

test("flags unlimited approvals locally", () => {
  const result = core.localPreScreen({
    method: "eth_sendTransaction",
    target: {
      type: "transaction",
      data: {
        to: "0x0000000000000000000000000000000000000001",
        data:
          "0x095ea7b3" +
          "000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25ef" +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    },
    url: "https://example.invalid",
    settings: core.normalizeSettings({}),
  });

  assert.equal(result.verdict, "dangerous");
  assert.equal(result.requiresApi, true);
  assert.equal(core.requiresSecondConfirm(result, core.normalizeSettings({})), true);
});

test("quiet mode skips safe plain transfers", () => {
  const result = core.localPreScreen({
    method: "eth_sendTransaction",
    target: {
      type: "transaction",
      data: {
        to: "0x0000000000000000000000000000000000000001",
        value: "0x1",
        data: "0x",
      },
    },
    url: "https://example.invalid",
    settings: core.normalizeSettings({ protectionMode: "quiet" }),
  });

  assert.equal(result.action, "proceed");
  assert.equal(result.verdict, "safe");
});

test("trusted sites bypass analysis", () => {
  const result = core.localPreScreen({
    method: "personal_sign",
    target: { type: "personal_sign", data: "hello" },
    url: "https://app.uniswap.org/swap",
    settings: core.normalizeSettings({ trustedSites: ["app.uniswap.org"] }),
  });

  assert.equal(result.action, "proceed");
  assert.equal(result.reason, "trusted_site");
});

test("site reputation blocks known phishing domains locally", () => {
  const reputation = core.evaluateSiteReputation("https://metamask-security-alert.example/connect");
  assert.equal(reputation.verdict, "dangerous");
  assert.equal(reputation.riskLevel, "critical");
  assert.equal(reputation.requiresApi, false);

  const result = core.localPreScreen({
    method: "personal_sign",
    target: { type: "personal_sign", data: "hello" },
    url: "https://metamask-security-alert.example/connect",
    settings: core.normalizeSettings({}),
  });

  assert.equal(result.reason, "site_reputation");
  assert.equal(result.verdict, "dangerous");
  assert.equal(result.action, "show");
});

test("site reputation identifies trusted and clone-like domains", () => {
  const trusted = core.evaluateSiteReputation("https://app.uniswap.org/swap");
  assert.equal(trusted.verdict, "safe");
  assert.equal(trusted.brand, "Uniswap");

  const clone = core.evaluateSiteReputation("https://uniswap-airdrop.example");
  assert.equal(clone.verdict, "caution");
  assert.equal(clone.riskLevel, "high");
  assert.match(clone.warnings.join(" "), /Uniswap/);
});

test("history is trimmed to newest entries", () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({ id: index }));
  const trimmed = core.trimHistory(entries, 20);
  assert.equal(trimmed.length, 20);
  assert.equal(trimmed[0].id, 0);
  assert.equal(trimmed[19].id, 19);
});

test("history entries expose timestamp for popup rendering", () => {
  const entry = core.createHistoryEntry({
    method: "personal_sign",
    url: "https://wallet.example",
    input: { kind: "simulation", value: "hello" },
    result: { verdict: "caution", riskScore: 42, summary: "Review this message" },
  });

  assert.equal(typeof entry.timestamp, "number");
  assert.equal(entry.createdAt, new Date(entry.timestamp).toISOString());
});

test("notification policy only interrupts for configured risk thresholds", () => {
  const critical = { verdict: "dangerous", riskScore: 88, riskLevel: "critical" };
  const high = { verdict: "caution", riskScore: 76, riskLevel: "high" };
  const medium = { verdict: "caution", riskScore: 48, riskLevel: "medium" };

  assert.equal(core.shouldNotify(critical, core.normalizeSettings({ notificationPolicy: "critical" })), true);
  assert.equal(core.shouldNotify(high, core.normalizeSettings({ notificationPolicy: "critical" })), false);
  assert.equal(core.shouldNotify(high, core.normalizeSettings({ notificationPolicy: "important" })), true);
  assert.equal(core.shouldNotify(medium, core.normalizeSettings({ notificationPolicy: "important" })), false);
  assert.equal(core.shouldNotify(medium, core.normalizeSettings({ notificationPolicy: "off" })), false);
});

test("classifies session events by wallet request type", () => {
  const approvalTarget = {
    type: "transaction",
    data: {
      to: "0x0000000000000000000000000000000000000001",
      data:
        "0x095ea7b3" +
        "000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25ef" +
        "0000000000000000000000000000000000000000000000000000000000000001",
    },
  };

  assert.equal(core.classifySessionCategory("eth_sendTransaction", approvalTarget), "approval");
  assert.equal(core.classifySessionCategory("personal_sign", { type: "personal_sign", data: "hello" }), "signature");
  assert.equal(core.classifySessionCategory("eth_sendTransaction", { type: "transaction", data: { to: "0x1", data: "0x" } }), "transaction");
});

test("records and summarizes dapp session events", () => {
  const approvalEvent = core.createSessionEvent({
    sessionId: "session-1",
    method: "eth_sendTransaction",
    url: "https://app.example",
    target: {
      type: "transaction",
      data: {
        to: "0x0000000000000000000000000000000000000001",
        data:
          "0x095ea7b3" +
          "000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25ef" +
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      },
    },
    input: { kind: "simulation", value: "approve" },
    result: { verdict: "dangerous", riskScore: 88, riskLevel: "critical", summary: "Unlimited approval", warnings: ["Unlimited approval"] },
    decision: "cancel",
  });

  const signEvent = core.createSessionEvent({
    sessionId: "session-1",
    method: "personal_sign",
    url: "https://app.example",
    target: { type: "personal_sign", data: "hello" },
    input: { kind: "simulation", value: "hello" },
    result: { verdict: "caution", riskScore: 42, riskLevel: "medium", summary: "Message signature", warnings: [] },
    decision: "proceed",
  });

  const sessions = core.recordSessionEvent(core.recordSessionEvent([], approvalEvent, 8), signEvent, 8);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].summary.eventCount, 2);
  assert.equal(sessions[0].summary.approvals, 1);
  assert.equal(sessions[0].summary.signatures, 1);
  assert.equal(sessions[0].summary.cancelled, 1);
  assert.equal(sessions[0].summary.proceeded, 1);
  assert.equal(sessions[0].summary.maxRiskScore, 88);
  assert.equal(sessions[0].summary.highestVerdict, "dangerous");
});

test("classifies pasted addresses, hashes, calldata, URLs, and typed data", () => {
  assert.equal(core.classifyPastedInput("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48").kind, "address");
  assert.equal(
    core.classifyPastedInput("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").kind,
    "hash",
  );
  assert.equal(
    core.classifyPastedInput(
      "0x095ea7b3" +
        "000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25ef" +
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ).kind,
    "approval_calldata",
  );
  assert.equal(core.classifyPastedInput("0xa9059cbb0000000000000000000000000000000000000000000000000000000000000001").kind, "calldata");
  assert.equal(core.classifyPastedInput("https://uniswap-airdrop.example").kind, "url");
  assert.equal(core.classifyPastedInput('{"domain":{"name":"Permit2"},"message":{"spender":"0x1"}}').kind, "typed_data");
  assert.equal(core.classifyPastedInput("hello world").kind, "unknown");
});

const OBSERVATION_ID = "123e4567-e89b-42d3-a456-426614174000";
const FROM = "0x1234567890abcdef1234567890abcdef12345678";

function observation(overrides = {}) {
  return {
    version: 1,
    observationId: OBSERVATION_ID,
    method: "personal_sign",
    observedAt: 1_000_000,
    target: { type: "personal_sign", data: "hello", from: FROM },
    ...overrides,
  };
}

function accepts(detail, options, now = 1_000_000) {
  return core.createObservationGate({ now: () => now }).accept(detail, options);
}

function uuidFor(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

test("exports immutable observation limits", () => {
  assert.deepEqual(core.OBSERVATION_LIMITS, {
    maxAgeMs: 30000,
    maxFutureSkewMs: 5000,
    maxSerializedTargetBytes: 65536,
    maxQueued: 8,
    maxAcceptedPerWindow: 12,
    rateWindowMs: 60000,
    seenTtlMs: 120000,
    maxSeenIds: 128,
  });
  assert.equal(Object.isFrozen(core.OBSERVATION_LIMITS), true);
});

test("accepts a valid observation once and rejects its duplicate", () => {
  const gate = core.createObservationGate({ now: () => 1_000_000 });
  const first = gate.accept(observation());
  const duplicate = gate.accept(observation());

  assert.equal(first.accepted, true);
  assert.equal(Object.getPrototypeOf(first.observation), null);
  assert.equal(Object.getPrototypeOf(first.observation.target), null);
  assert.notEqual(first.observation, observation());
  assert.deepEqual({ ...first.observation.target }, observation().target);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "duplicate");
});

test("rejects unsupported methods, invalid UUIDs, versions, and extra top-level keys", () => {
  assert.equal(accepts(observation({ method: "wallet_switchEthereumChain" })).accepted, false);
  assert.equal(accepts(observation({ observationId: "not-a-uuid" })).accepted, false);
  assert.equal(accepts(observation({ observationId: "123e4567-e89b-12d3-a456-426614174000" })).accepted, false);
  assert.equal(accepts(observation({ version: 2 })).accepted, false);
  assert.equal(accepts({ ...observation(), extra: true }).accepted, false);
});

test("rejects stale and future observations at the exact time boundaries", () => {
  assert.equal(accepts(observation({ observedAt: 970_000 })).accepted, true);
  assert.equal(accepts(observation({ observedAt: 969_999 })).accepted, false);
  assert.equal(accepts(observation({ observedAt: 1_005_000 })).accepted, true);
  assert.equal(accepts(observation({ observedAt: 1_005_001 })).accepted, false);
});

test("accepts exactly the eight signing method target shapes", () => {
  const cases = [
    ["eth_sendTransaction", { type: "transaction", data: { to: FROM } }],
    ["eth_signTransaction", { type: "transaction", data: Object.assign(Object.create(null), { value: "0x1" }) }],
    ["eth_sign", { type: "raw_sign", data: "0x1234", from: FROM }],
    ["personal_sign", { type: "personal_sign", data: "hello", from: FROM }],
    ["eth_signTypedData", { type: "typed_data", data: { domain: { name: "Sigil" } }, from: FROM }],
    ["eth_signTypedData_v1", { type: "typed_data", data: [{ name: "message", value: "hello" }], from: FROM }],
    ["eth_signTypedData_v3", { type: "typed_data", data: '{"message":{"value":1}}', from: FROM }],
    ["eth_signTypedData_v4", { type: "typed_data", data: { message: { value: 1 } }, from: FROM }],
  ];

  for (const [index, [method, target]] of cases.entries()) {
    const result = accepts(observation({ observationId: uuidFor(index), method, target }));
    assert.equal(result.accepted, true, method);
  }
});

test("rejects extra target keys and method-target mismatches without reinterpreting input", () => {
  assert.equal(accepts(observation({ target: { ...observation().target, extra: true } })).accepted, false);
  assert.equal(accepts(observation({ target: { type: "raw_sign", data: "hello", from: FROM } })).accepted, false);
  assert.equal(accepts(observation({ target: { type: "personal_sign", data: 123, from: FROM } })).accepted, false);
  assert.equal(accepts(observation({ target: { type: "personal_sign", data: "hello", from: "0x1" } })).accepted, false);
  assert.equal(accepts(observation({
    method: "eth_sendTransaction",
    target: { type: "transaction", data: { to: FROM }, from: FROM },
  })).accepted, false);
  assert.equal(accepts(observation({
    method: "eth_signTypedData_v4",
    target: { type: "typed_data", data: [], from: FROM },
  })).accepted, false);
});

test("rejects accessors, symbols, cycles, non-plain objects, and invalid JSON leaves", () => {
  const accessor = { safe: true };
  Object.defineProperty(accessor, "trap", { enumerable: true, get() { throw new Error("must not run"); } });
  const symbol = { safe: true };
  symbol[Symbol("hidden")] = true;
  const cycle = {};
  cycle.self = cycle;
  const invalid = [accessor, symbol, cycle, new Date(), { value: Infinity }, { value: undefined }, { value: 1n }, { value() {} }];

  for (const [index, data] of invalid.entries()) {
    const result = accepts(observation({
      observationId: uuidFor(index),
      method: "eth_signTypedData_v4",
      target: { type: "typed_data", data, from: FROM },
    }));
    assert.equal(result.accepted, false, `invalid case ${index}`);
  }
});

test("rejects non-plain typed-data arrays and normalizes accepted arrays without a prototype", () => {
  const customPrototype = Object.create(Array.prototype);
  const nonPlainArray = Object.setPrototypeOf([{ name: "message", value: "hello" }], customPrototype);
  const rejected = accepts(observation({
    method: "eth_signTypedData_v1",
    target: { type: "typed_data", data: nonPlainArray, from: FROM },
  }));
  assert.equal(rejected.accepted, false);

  const accepted = accepts(observation({
    method: "eth_signTypedData_v1",
    target: { type: "typed_data", data: [{ name: "message", value: "hello" }], from: FROM },
  }));
  assert.equal(accepted.accepted, true);
  assert.equal(Object.getPrototypeOf(accepted.observation.target.data), null);
});

function nestedObject(depth) {
  let value = "leaf";
  for (let index = 0; index < depth; index += 1) value = { child: value };
  return value;
}

test("enforces depth exactly below, at, and above eight", () => {
  for (const [depth, expected] of [[7, true], [8, true], [9, false]]) {
    const result = accepts(observation({
      method: "eth_signTypedData_v4",
      target: { type: "typed_data", data: nestedObject(depth - 1), from: FROM },
    }));
    assert.equal(result.accepted, expected, `depth ${depth}`);
  }
});

test("enforces aggregate node count exactly below, at, and above 512", () => {
  function dataForTotalNodes(total) {
    const arrays = Array.from({ length: 64 }, () => []);
    let leaves = total - 68;
    for (const array of arrays) {
      const count = Math.min(7, leaves);
      array.push(...Array.from({ length: count }, () => null));
      leaves -= count;
    }
    assert.equal(leaves, 0);
    return Object.fromEntries(arrays.map((array, index) => [`k${index}`, array]));
  }

  for (const [nodes, expected] of [[511, true], [512, true], [513, false]]) {
    const result = accepts(observation({
      method: "eth_signTypedData_v4",
      target: { type: "typed_data", data: dataForTotalNodes(nodes), from: FROM },
    }));
    assert.equal(result.accepted, expected, `nodes ${nodes}`);
  }
});

test("enforces object key count exactly below, at, and above 64", () => {
  for (const [count, expected] of [[63, true], [64, true], [65, false]]) {
    const data = Object.fromEntries(Array.from({ length: count }, (_, index) => [`k${index}`, null]));
    const result = accepts(observation({
      method: "eth_signTypedData_v4",
      target: { type: "typed_data", data, from: FROM },
    }));
    assert.equal(result.accepted, expected, `keys ${count}`);
  }
});

test("enforces array length exactly below, at, and above 128", () => {
  for (const [length, expected] of [[127, true], [128, true], [129, false]]) {
    const result = accepts(observation({
      method: "eth_signTypedData_v1",
      target: { type: "typed_data", data: Array.from({ length }, () => null), from: FROM },
    }));
    assert.equal(result.accepted, expected, `array ${length}`);
  }
});

test("enforces UTF-16 string and object-key lengths exactly below, at, and above 32768", () => {
  for (const [length, expected] of [[32767, true], [32768, true], [32769, false]]) {
    const stringResult = accepts(observation({ target: { type: "personal_sign", data: "a".repeat(length), from: FROM } }));
    assert.equal(stringResult.accepted, expected, `string ${length}`);

    const data = { ["k".repeat(length)]: null };
    const keyResult = accepts(observation({ method: "eth_signTypedData_v4", target: { type: "typed_data", data, from: FROM } }));
    assert.equal(keyResult.accepted, expected, `key ${length}`);
  }
});

function detailAtSerializedBytes(bytes, multibyte) {
  const base = observation({
    method: "eth_signTypedData_v4",
    target: { type: "typed_data", data: { first: "", second: "" }, from: FROM },
  });
  const baseBytes = Buffer.byteLength(JSON.stringify(base));
  let remaining = bytes - baseBytes;
  const firstUnits = multibyte ? Math.min(32768, Math.floor(remaining / 2)) : Math.min(32768, remaining);
  const first = multibyte ? "\u00e9".repeat(firstUnits) : "a".repeat(firstUnits);
  remaining -= multibyte ? firstUnits * 2 : firstUnits;
  const secondPairs = multibyte ? Math.floor(remaining / 2) : 0;
  const second = multibyte
    ? "\u00e9".repeat(secondPairs) + (remaining % 2 ? "a" : "")
    : "a".repeat(remaining);
  return observation({
    method: "eth_signTypedData_v4",
    target: { type: "typed_data", data: { first, second }, from: FROM },
  });
}

test("enforces final ASCII and multibyte UTF-8 serialized detail bytes below, at, and above 65536", () => {
  for (const multibyte of [false, true]) {
    for (const [bytes, expected] of [[65535, true], [65536, true], [65537, false]]) {
      const detail = detailAtSerializedBytes(bytes, multibyte);
      assert.equal(Buffer.byteLength(JSON.stringify(detail)), bytes);
      assert.equal(accepts(detail).accepted, expected, `${multibyte ? "multibyte" : "ASCII"} ${bytes}`);
    }
  }
});

test("rejects queue length eight and the thirteenth accepted observation in a rolling minute", () => {
  assert.equal(accepts(observation(), { queueLength: 7 }).accepted, true);
  assert.equal(accepts(observation(), { queueLength: 8 }).accepted, false);

  const gate = core.createObservationGate({ now: () => 1_000_000 });
  for (let index = 0; index < 12; index += 1) {
    assert.equal(gate.accept(observation({ observationId: uuidFor(index) })).accepted, true);
  }
  assert.equal(gate.accept(observation({ observationId: uuidFor(12) })).accepted, false);
});

test("expires the rolling rate window and duplicate TTL at their boundaries", () => {
  let current = 1_000_000;
  const gate = core.createObservationGate({ now: () => current });
  for (let index = 0; index < 12; index += 1) {
    assert.equal(gate.accept(observation({ observationId: uuidFor(index), observedAt: current })).accepted, true);
  }

  current += core.OBSERVATION_LIMITS.rateWindowMs;
  assert.equal(gate.accept(observation({ observationId: uuidFor(12), observedAt: current })).accepted, true);
  current = 1_000_000 + core.OBSERVATION_LIMITS.seenTtlMs;
  assert.equal(gate.accept(observation({ observedAt: current })).accepted, true);
});

test("keeps the seen-id cap fixed at 128 with deterministic oldest-first pruning", () => {
  assert.equal(core.OBSERVATION_LIMITS.maxSeenIds, 128);
  const current = 1_000_000;
  const gate = core.createObservationGate({
    now: () => current,
    limits: Object.freeze({
      ...core.OBSERVATION_LIMITS,
      maxAcceptedPerWindow: 256,
      seenTtlMs: 10 * core.OBSERVATION_LIMITS.seenTtlMs,
    }),
  });
  for (let index = 0; index < 129; index += 1) {
    assert.equal(gate.accept(observation({ observationId: uuidFor(index), observedAt: current })).accepted, true);
  }
  assert.equal(gate.accept(observation({ observationId: uuidFor(0), observedAt: current })).accepted, true);
  assert.equal(gate.accept(observation({ observationId: uuidFor(128), observedAt: current })).reason, "duplicate");
});
