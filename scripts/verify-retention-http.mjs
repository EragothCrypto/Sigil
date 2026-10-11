import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, access } from "node:fs/promises";
import { createRequire } from "node:module";
import { once } from "node:events";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { validateRetentionDrillUrl } from "./p00-retention-guard.mjs";

let stage = "context";
let client;
let server;
const originalCwd = process.cwd();
const nativeFetch = globalThis.fetch;

async function main() {
  const url = validateRetentionDrillUrl(process.env.SIGIL_P00_DATABASE_URL);
  const { values } = parseArgs({ options: { privacy: { type: "boolean", default: false } }, allowPositionals: false });
  stage = "driver";
  const { Client } = createRequire(new URL("../lib/db/package.json", import.meta.url))("pg");
  client = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000, query_timeout: 7000 });
  await client.connect();
  stage = "empty_database";
  assert.deepEqual((await client.query("SELECT current_database() AS database, current_user AS role")).rows[0],
    { database: "sigil_p00_retention", role: "sigil_p00" });
  const countRelations = async () => (await client.query(`SELECT count(*)::int AS count FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
    AND c.relkind IN ('r','p','v','m','f')`)).rows[0].count;
  assert.equal(await countRelations(), 0);
  if (values.privacy) {
    stage = "legacy_fixture";
    await client.query(`CREATE TABLE public.analyses (
      id serial PRIMARY KEY, input text NOT NULL, summary text NOT NULL,
      hall_of_shame boolean NOT NULL DEFAULT false);
      INSERT INTO public.analyses (input,summary,hall_of_shame) VALUES
        ('synthetic-private-legacy','synthetic-private-summary',false),
        ('synthetic-curated','synthetic-curated-summary',true)`);
  }
  stage = "isolated_bundle";
  const root = fileURLToPath(new URL("../", import.meta.url));
  await mkdir(path.join(root, "tmp/p00"), { recursive: true });
  const staging = await mkdtemp(path.join(root, "tmp/p00/http-retention-"));
  const runtime = path.join(staging, "runtime");
  const dist = path.join(runtime, "artifacts/api-server/dist");
  await cp(path.join(root, "artifacts/api-server/dist"), dist, { recursive: true });
  // These are all dotenv lookup roots for the staged bundle, not the user's workspace.
  for (const directory of [runtime, staging]) {
    for (const name of [".env", ".env.local"]) {
      await assert.rejects(access(path.join(directory, name)), { code: "ENOENT" });
    }
  }
  process.chdir(runtime);
  Object.assign(process.env, {
    DATABASE_URL: url.href, NODE_ENV: "production", CRON_SECRET: "",
    AI_INTEGRATIONS_OPENAI_API_KEY: "synthetic-placeholder",
    AI_INTEGRATIONS_OPENAI_BASE_URL: "http://127.0.0.1:1",
    SIGIL_ANALYSIS_RETENTION_DAYS: "30",
    SIGIL_RATE_LIMIT_WINDOW_MS: "15000", SIGIL_RATE_LIMIT_MAX: "60",
  });
  let origin;
  globalThis.fetch = (input, options) => {
    assert.equal(new URL(typeof input === "string" || input instanceof URL ? input : input.url).origin, origin,
      "p00_http_external_fetch_rejected");
    return nativeFetch(input, options);
  };
  const { default: app } = await import(pathToFileURL(path.join(dist, "app.mjs")).href);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  origin = `http://127.0.0.1:${server.address().port}`;
  if (values.privacy) {
    const get = async (route, status = 200) => {
      const response = await fetch(`${origin}/api/sigil/${route}`, { signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, status, route);
      return response.json();
    };
    const notFound = { error: "not_found", message: "Analysis not found" };
    stage = "privacy_migration";
    assert.deepEqual(await get("history"), []);
    const migrated = (await client.query("SELECT id,input,public_id FROM public.analyses ORDER BY id")).rows;
    assert.deepEqual(migrated, [
      { id: 1, input: "synthetic-private-legacy", public_id: null },
      { id: 2, input: "synthetic-curated", public_id: null },
    ]);
    const indexes = (await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='analyses'")).rows;
    assert.ok(indexes.some(row => row.indexname === "analyses_public_id_idx"));
    stage = "privacy_access";
    const opaqueId = "12345678-1234-4234-8234-123456789abc";
    await client.query("INSERT INTO public.analyses (public_id,input,summary) VALUES ($1,$2,$3)",
      [opaqueId, "synthetic-private-opaque", "synthetic-opaque-summary"]);
    await assert.rejects(client.query("INSERT INTO public.analyses (public_id,input,summary) VALUES ($1,'duplicate','synthetic')", [opaqueId]),
      { code: "23505" });
    assert.deepEqual(await get("history"), []);
    for (const id of ["1", "3", "0", "2147483648", "999999999999999999999", "-1", "1.0",
      "12345678-1234-4234-8234-123456789abd", "1' OR '1'='1"]) {
      for (const route of [`history/${encodeURIComponent(id)}`, `history?id=${encodeURIComponent(id)}`]) {
        assert.deepEqual(await get(route, 404), notFound);
      }
    }
    for (const route of [`history/${opaqueId}`, `history?id=${opaqueId}`]) {
      const result = await get(route);
      assert.equal(result.id, opaqueId);
      assert.equal(result.input, "synthetic-private-opaque");
      assert.equal(result.summary, "synthetic-opaque-summary");
      assert.equal(Object.hasOwn(result, "publicId"), false);
    }
    for (const route of ["history/2", "history?id=2"]) {
      const result = await get(route);
      assert.equal(result.id, "2");
      assert.equal(result.input, "synthetic-curated");
    }
    const hall = await get("hall-of-shame");
    assert.deepEqual(hall.map(row => ({ id: row.id, input: row.input })), [{ id: "2", input: "synthetic-curated" }]);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM public.analyses")).rows[0].count, 3);
    console.log(JSON.stringify({ status: "pass", scope: "isolated_built_http_real_postgres_privacy", controls: [
      "legacy_schema_migration", "legacy_private_rows_not_backfilled_or_exposed", "empty_public_history",
      "private_numeric_denied", "invalid_unknown_ids_denied", "opaque_path_and_query_access",
      "unique_opaque_index", "curated_numeric_and_hall_only", "fixtures_preserved",
    ], limits: ["not_production_migration", "not_authenticated_ownership", "not_uuid_generation_on_save",
      "opaque_links_are_bearer_access_not_wallet_authentication"] }));
    return;
  }
  const secret = "p00-synthetic-cron-secret-only";
  const request = async (authorization, ip) => {
    const headers = {};
    if (authorization) headers.authorization = authorization;
    if (ip) headers["x-forwarded-for"] = ip;
    const response = await fetch(`${origin}/api/sigil/maintenance/retention`, { headers, signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.json(), retry: response.headers.get("retry-after") };
  };
  const unauthorized = async (authorization) => {
    const result = await request(authorization);
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: "unauthorized" });
  };
  const authorized = async (deleted = 0, ip) => {
    const result = await request(`Bearer ${secret}`, ip);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { status: "ok", deleted });
  };
  stage = "auth_before_schema";
  await unauthorized(`Bearer ${secret}`);
  assert.equal(await countRelations(), 0);
  process.env.CRON_SECRET = secret;
  await unauthorized();
  await unauthorized("Bearer wrong-synthetic-secret");
  assert.equal(await countRelations(), 0);
  stage = "schema";
  await authorized();
  const columns = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='analyses'")).rows.map(row => row.column_name);
  for (const column of ["id", "public_id", "input", "summary", "created_at", "hall_of_shame"]) assert.ok(columns.includes(column));
  await client.query(`INSERT INTO public.analyses (input,summary,hall_of_shame,created_at) VALUES
    ('old','synthetic',false,now()-interval '31 days'),
    ('recent','synthetic',false,now()-interval '1 day'),
    ('curated','synthetic',true,now()-interval '31 days'),
    ('near_cutoff','synthetic',false,now()-interval '29 days 23 hours')`);
  const survivors = async () => (await client.query("SELECT input FROM public.analyses ORDER BY input")).rows.map(row => row.input);
  stage = "deletion";
  await unauthorized();
  await unauthorized("Bearer wrong-synthetic-secret");
  assert.deepEqual(await survivors(), ["curated", "near_cutoff", "old", "recent"]);
  await authorized(1);
  const expected = ["curated", "near_cutoff", "recent"];
  assert.deepEqual(await survivors(), expected);
  await authorized();
  stage = "database_error_recovery";
  await client.query("ALTER TABLE public.analyses RENAME TO analyses_fault_control");
  try {
    await unauthorized();
    const result = await request(`Bearer ${secret}`);
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: "retention_cleanup_failed" });
  } finally {
    await client.query("ALTER TABLE public.analyses_fault_control RENAME TO analyses");
  }
  await authorized();
  assert.deepEqual(await survivors(), expected);
  stage = "rate_limit";
  const ip = "192.0.2.20";
  for (let index = 0; index < 60; index++) await authorized(0, ip);
  const limited = await request(`Bearer ${secret}`, ip);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error, "rate_limited");
  const retry = Number(limited.retry);
  assert.ok(retry >= 1 && retry <= 15);
  await new Promise(resolve => setTimeout(resolve, retry * 1000 + 100));
  await authorized(0, ip);
  assert.deepEqual(await survivors(), expected);
  console.log(JSON.stringify({ status: "pass", scope: "isolated_built_http_real_postgres", controls: [
    "auth_before_schema", "actual_schema", "old_deleted_recent_curated_near_cutoff_preserved",
    "idempotent", "bounded_database_error", "database_recovery", "rate_limit_and_recovery",
  ], limits: ["not_production_cron", "not_backup_restore", "not_exact_boundary_http", "not_deployed_proxy_policy"] }));
}

let exitCode = 0;
try {
  await main();
} catch {
  exitCode = 1;
  console.error(JSON.stringify({ error: "p00_retention_http_failed_or_unavailable", stage }));
} finally {
  globalThis.fetch = nativeFetch;
  process.chdir(originalCwd);
  if (server) await new Promise(resolve => server.close(resolve));
  if (client) await client.end().catch(() => {});
}
// The application owns a background cache interval and pool; this dedicated CLI exits after cleanup.
process.exit(exitCode);
