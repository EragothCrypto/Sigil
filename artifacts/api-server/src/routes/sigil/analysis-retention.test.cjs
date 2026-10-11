const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const { join } = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function loadSchema(query, retentionDays) {
  const source = readFileSync(join(__dirname, "analysis-schema.ts"), "utf8")
    .replace('import { pool } from "@workspace/db";', "")
    .replace(/export /g, "");
  const context = vm.createContext({
    pool: { query },
    process: { env: { SIGIL_ANALYSIS_RETENTION_DAYS: retentionDays } },
  });
  vm.runInContext(stripTypeScriptTypes(source), context);
  return context;
}

test("retention uses parameterized age and preserves curated cases", async () => {
  for (const [configured, expected] of [[undefined, 30], ["invalid", 30], ["0", 1], ["999", 365], ["45", 45]]) {
    let call;
    const schema = loadSchema(async (sql, params) => {
      call = { sql, params };
      return { rowCount: 3 };
    }, configured);
    assert.equal(await schema.runAnalysisRetentionCleanup(), 3);
    assert.match(call.sql, /WHERE hall_of_shame = false/);
    assert.match(call.sql, /created_at < now\(\) - \(\$1 \* interval '1 day'\)/);
    assert.deepEqual(Array.from(call.params), [expected]);
  }
});

test("scheduled cleanup runs repeatedly and propagates database failures", async () => {
  let calls = 0;
  const failure = new Error("database unavailable");
  const schema = loadSchema(async () => {
    calls += 1;
    if (calls === 3) throw failure;
    return { rowCount: calls === 1 ? null : 2 };
  });
  assert.equal(await schema.runAnalysisRetentionCleanup(), 0);
  assert.equal(await schema.runAnalysisRetentionCleanup(), 2);
  await assert.rejects(schema.runAnalysisRetentionCleanup(), (error) => error === failure);
  assert.equal(calls, 3);
});

test("runtime schema preflight is read-only, coalesced and retries after failure", async () => {
  let calls = 0;
  const queries = [];
  const schema = loadSchema(async (sql) => {
    calls += 1;
    queries.push(sql);
    if (calls === 1) throw new Error("temporary failure");
    return { rows: [{ ready: true }] };
  });
  await assert.rejects(schema.ensureAnalysesSchema());
  await Promise.all([schema.ensureAnalysesSchema(), schema.ensureAnalysesSchema()]);
  assert.equal(calls, 3);
  assert.ok(queries.every((sql) => /^\s*SELECT\b/.test(sql)));
  assert.ok(queries.every((sql) => !/\b(CREATE|ALTER|DELETE|INSERT|UPDATE|DROP)\b/i.test(sql)));
  assert.match(queries[1], /public_id/);
  assert.match(queries[2], /indisunique/);
  await schema.ensureAnalysesSchema();
  assert.equal(calls, 3);
});

test("runtime preflight rejects absent uniqueness and never repairs missing columns", async () => {
  const queries = [];
  const schema = loadSchema(async (sql) => {
    queries.push(sql);
    return { rows: [{ ready: false }] };
  });
  await assert.rejects(schema.ensureAnalysesSchema(), /analysis_schema_not_ready/);
  assert.equal(queries.length, 2);
  const failure = Object.assign(new Error("missing column"), { code: "42703" });
  const missing = loadSchema(async (sql) => {
    assert.match(sql, /^\s*SELECT\b/);
    throw failure;
  });
  await assert.rejects(missing.ensureAnalysesSchema(), error => error === failure);
});
