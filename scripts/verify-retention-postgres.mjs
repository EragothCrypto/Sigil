import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
import { parseArgs } from "node:util";
import { validateRetentionDrillUrl } from "./p00-retention-guard.mjs";

let stage = "context";

async function main() {
  const { values } = parseArgs({ options: { "force-database-failure": { type: "boolean", default: false } }, allowPositionals: false });
  // Never fall back to the application's DATABASE_URL or import its live pool.
  const url = validateRetentionDrillUrl(process.env.SIGIL_P00_DATABASE_URL);
  stage = "driver";
  const { Client } = createRequire(new URL("../lib/db/package.json", import.meta.url))("pg");
  const client = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000, query_timeout: 7000 });
  let transaction = false;
  try {
    stage = "connection";
    await client.connect();
    stage = "empty_database";
    const identity = (await client.query("SELECT current_database() AS database, current_user AS role")).rows[0];
    assert.deepEqual(identity, { database: "sigil_p00_retention", role: "sigil_p00" });
    const existing = await client.query(`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','v','m','f')`);
    assert.equal(existing.rows[0].count, 0, "p00_retention_database_not_empty");
    await client.query("BEGIN");
    transaction = true;
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query("SET LOCAL timezone = 'UTC'");
    await client.query("SET LOCAL search_path = pg_temp, pg_catalog");
    await client.query(`CREATE TEMP TABLE analyses (id integer PRIMARY KEY, hall_of_shame boolean NOT NULL, created_at timestamp NOT NULL) ON COMMIT DROP`);
    const temp = (await client.query("SELECT relpersistence FROM pg_class WHERE oid = 'pg_temp.analyses'::regclass")).rows[0];
    assert.equal(temp.relpersistence, "t");
    await client.query(`INSERT INTO pg_temp.analyses VALUES
      (1,false,now()-interval '31 days'), (2,false,now()-interval '1 day'),
      (3,true,now()-interval '31 days'), (4,false,now()-interval '30 days')`);
    await client.query("CREATE TEMP TABLE fixture_snapshot AS SELECT * FROM pg_temp.analyses");
    if (values["force-database-failure"]) {
      stage = "forced_database_failure";
      await client.query("SELECT * FROM pg_temp.p00_missing_failure_control");
      throw new Error("forced database failure did not occur");
    }
    stage = "retention_predicate";

    // Same production helper as mocked tests, but its query adapter is this real client.
    const source = readFileSync(new URL("../artifacts/api-server/src/routes/sigil/analysis-schema.ts", import.meta.url), "utf8")
      .replace('import { pool } from "@workspace/db";', "").replace(/export /g, "");
    const context = vm.createContext({ pool: { query: (sql, params) => client.query(sql, params) }, process: { env: { SIGIL_ANALYSIS_RETENTION_DAYS: "30" } } });
    vm.runInContext(stripTypeScriptTypes(source), context);
    const cleanup = context.runAnalysisRetentionCleanup;
    const ids = async () => (await client.query("SELECT id FROM pg_temp.analyses ORDER BY id")).rows.map((row) => row.id);
    assert.equal(await cleanup(), 1);
    assert.deepEqual(await ids(), [2, 3, 4]);
    assert.equal(await cleanup(), 0);

    await client.query("SAVEPOINT failure_control");
    await client.query("ALTER TABLE pg_temp.analyses RENAME TO absent_analyses");
    await assert.rejects(cleanup(), (error) => error.code === "42P01");
    await client.query("ROLLBACK TO SAVEPOINT failure_control");
    assert.equal(await cleanup(), 0);

    // Synthetic restore/re-erasure procedure, not a Neon backup/restore operation.
    const eraseOwnedRow = () => client.query("DELETE FROM pg_temp.analyses WHERE id=$1 AND hall_of_shame=false", [2]);
    assert.equal((await eraseOwnedRow()).rowCount, 1);
    assert.deepEqual(await ids(), [3, 4]);
    await client.query("TRUNCATE pg_temp.analyses");
    await client.query("INSERT INTO pg_temp.analyses SELECT * FROM pg_temp.fixture_snapshot");
    assert.deepEqual(await ids(), [1, 2, 3, 4]);
    assert.equal(await cleanup(), 1);
    assert.deepEqual(await ids(), [2, 3, 4]);
    assert.equal((await eraseOwnedRow()).rowCount, 1);
    assert.deepEqual(await ids(), [3, 4]);
    await client.query("ROLLBACK");
    transaction = false;
    console.log(JSON.stringify({ check: "p00-real-postgres-retention", cutoff: "pass", curated: "preserved", repeat: "zero", databaseFailure: "propagated-and-recovered", syntheticRestoreErasure: "pass", transaction: "rolled-back", production: "not-contacted" }));
  } finally {
    if (transaction) await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  const safeCodes = new Set(["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "MODULE_NOT_FOUND", "ERR_ASSERTION", "42P01"]);
  console.error(JSON.stringify({ error: "p00_retention_drill_failed_or_unavailable", stage, code: safeCodes.has(error.code) ? error.code : "not_established", production: "not_contacted" }));
  process.exitCode = 1;
});
