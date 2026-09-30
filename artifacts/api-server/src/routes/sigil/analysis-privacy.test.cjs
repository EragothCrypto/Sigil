const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("../../../../../node_modules/typescript");

function loadRoutes({ secret, cleanupError } = {}) {
  const routes = new Map();
  const calls = { schema: 0, cleanup: 0, select: 0, predicates: [] };
  const records = [
    { id: 1, publicId: null, hallOfShame: false },
    { id: 2, publicId: null, hallOfShame: true, createdAt: new Date(0) },
    { id: 3, publicId: "12345678-1234-4234-8234-123456789abc", hallOfShame: false, createdAt: new Date(0) },
  ];
  const router = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
  };
  const db = {
    select() {
      calls.select += 1;
      let predicate;
      return {
        from() { return this; },
        where(value) { predicate = value; calls.predicates.push(value); return this; },
        limit() { return Promise.resolve(records.filter(predicate)); },
      };
    },
  };
  const modules = {
    express: { Router: () => router },
    "node:crypto": require("node:crypto"),
    "@workspace/db": { db },
    "@workspace/db/schema": { analysesTable: { id: "id", publicId: "publicId", hallOfShame: "hallOfShame" } },
    "drizzle-orm": {
      eq: (key, value) => (record) => record[key] === value,
      and: (...predicates) => (record) => predicates.every((predicate) => predicate(record)),
    },
    "./analysis-schema.js": {
      ensureAnalysesSchema: async () => { calls.schema += 1; },
      runAnalysisRetentionCleanup: async () => {
        calls.cleanup += 1;
        if (cleanupError) throw cleanupError;
        return 4;
      },
    },
  };
  const source = ts.transpileModule(readFileSync(join(__dirname, "index.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports: {}, require: (name) => modules[name] ?? {}, process: { env: { CRON_SECRET: secret } },
  });
  async function request(path, { id, authorization } = {}) {
    const response = { code: 200, body: undefined, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await routes.get(`GET ${path}`)({ params: { id }, query: {}, get: () => authorization, log: { error() {} } }, response);
    return response;
  }
  return { request, calls };
}

test("collection history reveals no user records and does not query them", async () => {
  const { request, calls } = loadRoutes();
  const response = await request("/history");
  assert.equal(response.code, 200);
  assert.equal(response.body.length, 0);
  assert.equal(calls.select, 0);
});

test("numeric ids expose curated cases only and reject out-of-range values before SQL", async () => {
  const { request, calls } = loadRoutes();
  assert.equal((await request("/history/:id", { id: "1" })).code, 404);
  assert.equal((await request("/history/:id", { id: "2" })).body.id, "2");
  for (const id of ["0", "2147483648", "999999999999999999999", "-1", "1.0"]) {
    const before = calls.select;
    assert.equal((await request("/history/:id", { id })).code, 404);
    assert.equal(calls.select, before);
  }
});

test("private analysis requires its opaque UUID and preserves that id in output", async () => {
  const { request } = loadRoutes();
  assert.equal((await request("/history/:id", { id: "3" })).code, 404);
  const id = "12345678-1234-4234-8234-123456789abc";
  const response = await request("/history/:id", { id });
  assert.equal(response.code, 200);
  assert.equal(response.body.id, id);
  assert.equal((await request("/history/:id", { id: "12345678-1234-4234-8234-123456789abd" })).code, 404);
});

test("retention rejects missing or wrong secrets before schema or cleanup", async () => {
  for (const [secret, authorization] of [[undefined, undefined], [undefined, "Bearer undefined"], ["valid-secret", undefined], ["valid-secret", "Bearer wrong"]]) {
    const { request, calls } = loadRoutes({ secret });
    assert.equal((await request("/maintenance/retention", { authorization })).code, 401);
    assert.equal(calls.schema, 0);
    assert.equal(calls.cleanup, 0);
  }
});

test("authenticated retention returns deletion count and database errors disclose no details", async () => {
  const success = loadRoutes({ secret: "valid-secret" });
  const response = await success.request("/maintenance/retention", { authorization: "Bearer valid-secret" });
  assert.equal(response.code, 200);
  assert.equal(response.body.deleted, 4);
  assert.equal(success.calls.cleanup, 1);
  const failed = loadRoutes({ secret: "valid-secret", cleanupError: new Error("sensitive connection details") });
  const error = await failed.request("/maintenance/retention", { authorization: "Bearer valid-secret" });
  assert.equal(error.code, 500);
  assert.equal(error.body.error, "retention_cleanup_failed");
  assert.doesNotMatch(JSON.stringify(error.body), /sensitive/);
});
