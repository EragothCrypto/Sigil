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
  assert.equal(settings.apiUrl, "https://sigil.s3ntrylabs.com");
  assert.deepEqual(settings.trustedSites, []);
  assert.deepEqual(settings.trustedContracts, []);
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
