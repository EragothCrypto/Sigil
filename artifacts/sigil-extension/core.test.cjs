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
  assert.deepEqual(settings.trustedSites, []);
  assert.deepEqual(settings.trustedContracts, []);
});

test("extracts transaction address target before calldata", () => {
  const target = {
    type: "transaction",
    data: {
      to: "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48",
      data: "0x095ea7b3",
    },
  };

  const input = core.getAnalysisInput(target);
  assert.equal(input.kind, "address");
  assert.equal(input.value, "0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eb48");
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

test("history is trimmed to newest entries", () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({ id: index }));
  const trimmed = core.trimHistory(entries, 20);
  assert.equal(trimmed.length, 20);
  assert.equal(trimmed[0].id, 0);
  assert.equal(trimmed[19].id, 19);
});
