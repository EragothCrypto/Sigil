const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Execute the unchanged route callback with mocks, without loading AI or DB clients.
function loadRoute({ secret, schemaError, cleanupError, deleted = 0 } = {}) {
  const source = readFileSync(join(__dirname, "index.ts"), "utf8");
  const start = source.indexOf('router.get("/maintenance/retention",');
  const end = source.indexOf('\nrouter.post("/analyze",', start);
  assert.ok(start >= 0 && end > start, "retention route boundaries must exist");
  let handler;
  const calls = { schema: 0, cleanup: 0, logs: [] };
  vm.runInNewContext(source.slice(start, end), {
    router: { get(path, callback) {
      assert.equal(path, "/maintenance/retention");
      handler = callback;
    } },
    process: { env: { CRON_SECRET: secret } },
    ensureAnalysesSchema: async () => {
      calls.schema += 1;
      if (schemaError) throw schemaError;
    },
    runAnalysisRetentionCleanup: async () => {
      calls.cleanup += 1;
      if (cleanupError) throw cleanupError;
      return deleted;
    },
  });
  async function request(authorization) {
    const response = {
      code: 200,
      body: undefined,
      status(code) { this.code = code; return this; },
      json(body) { this.body = JSON.parse(JSON.stringify(body)); },
    };
    await handler({
      get(name) { assert.equal(name, "authorization"); return authorization; },
      log: { error: (...args) => calls.logs.push(args) },
    }, response);
    return response;
  }
  return { request, calls };
}

test("retention fails closed before DB access for absent or forged credentials", async () => {
  for (const [secret, header] of [
    [undefined, undefined], [undefined, "Bearer undefined"], ["", "Bearer "],
    ["test-secret", undefined], ["test-secret", "Bearer wrong"],
    ["test-secret", "test-secret"], ["test-secret", "Bearer test-secret "],
  ]) {
    const route = loadRoute({ secret });
    const response = await route.request(header);
    assert.equal(response.code, 401);
    assert.deepEqual(response.body, { error: "unauthorized" });
    assert.equal(route.calls.schema, 0);
    assert.equal(route.calls.cleanup, 0);
  }
});

test("authenticated retention preserves zero and positive deletion counts", async () => {
  for (const deleted of [0, 4]) {
    const route = loadRoute({ secret: "test-secret", deleted });
    const response = await route.request("Bearer test-secret");
    assert.equal(response.code, 200);
    assert.deepEqual(response.body, { status: "ok", deleted });
    assert.equal(route.calls.schema, 1);
    assert.equal(route.calls.cleanup, 1);
  }
});

test("schema and cleanup failures are sanitized and do not imply success", async () => {
  for (const stage of ["schemaError", "cleanupError"]) {
    const route = loadRoute({ secret: "test-secret", [stage]: new Error("private DB credentials") });
    const response = await route.request("Bearer test-secret");
    assert.equal(response.code, 500);
    assert.deepEqual(response.body, { error: "retention_cleanup_failed" });
    assert.equal(route.calls.cleanup, stage === "schemaError" ? 0 : 1);
    assert.doesNotMatch(JSON.stringify([response.body, route.calls.logs]), /private DB credentials|test-secret/);
  }
});

test("both Vercel roots use the same once-daily retention job", () => {
  const root = join(__dirname, "../../../../..");
  const expected = [{ path: "/api/sigil/maintenance/retention", schedule: "17 3 * * *" }];
  for (const config of ["vercel.json", "artifacts/sigil/vercel.json"]) {
    assert.deepEqual(JSON.parse(readFileSync(join(root, config), "utf8")).crons, expected);
  }
});
