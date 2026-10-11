const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("root Vercel config routes API before SPA fallback", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.rewrites[0], { source: "/api/sigil/monitor/v2/solana/scan", destination: "/api?solanaWalletCheck=1" });
  assert.deepEqual(config.rewrites[1], { source: "/api/sigil/simulate-v2", destination: "/api/sigil/simulate?executionCheckVersion=2" });
  assert.deepEqual(config.rewrites[2], { source: "/api/:path*", destination: "/api/:path*" });
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
});

test("root Vercel API functions import the built Express app", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.match(config.buildCommand, /@workspace\/api-server build/);
  assert.equal(exists("api/index.js"), true);
  assert.equal(exists("api/[...path].js"), true);
  for (const route of [
    ["api/healthz.js", "/api/healthz"],
    ["api/readyz.js", "/api/readyz"],
    ["api/sigil/analyze-stream.js", "/api/sigil/analyze-stream"],
    ["api/sigil/analyze.js", "/api/sigil/analyze"],
    ["api/sigil/simulate.js", "/api/sigil/simulate"],
    ["api/sigil/approvals/health.js", "/api/sigil/approvals/health"],
    ["api/sigil/contract-diff.js", "/api/sigil/contract-diff"],
    ["api/sigil/history.js", "/api/sigil/history"],
    ["api/sigil/hall-of-shame.js", "/api/sigil/hall-of-shame"],
    ["api/sigil/history/[id].js", "/api/sigil/history/"],
  ]) {
    assert.equal(exists(route[0]), true, `${route[0]} should exist`);
    assert.match(read(route[0]), /api-server\/dist\/app\.mjs/);
    assert.match(read(route[0]), new RegExp(route[1].replaceAll("/", "\\/")));
  }
  assert.match(read("api/sigil/history/[id].js"), /extractHistoryId/);
  assert.match(read("api/sigil/history/[id].js"), /__missing__/);
  assert.match(read("api/index.js"), /artifacts\/api-server\/dist\/app\.mjs/);
  assert.match(read("api/[...path].js"), /artifacts\/api-server\/dist\/app\.mjs/);
  assert.match(read("api/[...path].js"), /req\.url\.startsWith\("\/api"\)/);
});

test("artifact-root Vercel config exists for Vercel projects rooted at artifacts/sigil", () => {
  const config = JSON.parse(read("artifacts/sigil/vercel.json"));
  assert.match(config.buildCommand, /@workspace\/api-server build/);
  assert.deepEqual(config.rewrites[0], { source: "/api/sigil/monitor/v2/solana/scan", destination: "/api?solanaWalletCheck=1" });
  assert.deepEqual(config.rewrites[1], { source: "/api/sigil/simulate-v2", destination: "/api/sigil/simulate?executionCheckVersion=2" });
  assert.deepEqual(config.rewrites[2], { source: "/api/:path*", destination: "/api/:path*" });
  assert.equal(exists("artifacts/sigil/api/index.js"), true);
  assert.equal(exists("artifacts/sigil/api/[...path].js"), true);
  for (const route of [
    ["artifacts/sigil/api/healthz.js", "/api/healthz"],
    ["artifacts/sigil/api/readyz.js", "/api/readyz"],
    ["artifacts/sigil/api/sigil/analyze-stream.js", "/api/sigil/analyze-stream"],
    ["artifacts/sigil/api/sigil/analyze.js", "/api/sigil/analyze"],
    ["artifacts/sigil/api/sigil/simulate.js", "/api/sigil/simulate"],
    ["artifacts/sigil/api/sigil/approvals/health.js", "/api/sigil/approvals/health"],
    ["artifacts/sigil/api/sigil/contract-diff.js", "/api/sigil/contract-diff"],
    ["artifacts/sigil/api/sigil/history.js", "/api/sigil/history"],
    ["artifacts/sigil/api/sigil/hall-of-shame.js", "/api/sigil/hall-of-shame"],
    ["artifacts/sigil/api/sigil/history/[id].js", "/api/sigil/history/"],
  ]) {
    assert.equal(exists(route[0]), true, `${route[0]} should exist`);
    assert.match(read(route[0]), /api-server\/dist\/app\.mjs/);
    assert.match(read(route[0]), new RegExp(route[1].replaceAll("/", "\\/")));
  }
  assert.match(read("artifacts/sigil/api/sigil/history/[id].js"), /extractHistoryId/);
  assert.match(read("artifacts/sigil/api/sigil/history/[id].js"), /__missing__/);
  assert.match(read("artifacts/sigil/api/index.js"), /api-server\/dist\/app\.mjs/);
  assert.match(read("artifacts/sigil/api/[...path].js"), /api-server\/dist\/app\.mjs/);
  assert.match(read("artifacts/sigil/api/[...path].js"), /req\.url\.startsWith\("\/api"\)/);
});

test("api-server build emits an app bundle for Vercel functions", () => {
  assert.match(read("artifacts/api-server/build.mjs"), /src\/app\.ts/);
});

test("api-server checks schema without runtime DDL; bootstrap is explicit", () => {
  const schema = read("artifacts/api-server/src/routes/sigil/analysis-schema.ts");
  assert.doesNotMatch(schema, /\b(CREATE|ALTER|DROP)\b/);
  assert.match(schema, /FROM analyses LIMIT 0/);
  assert.match(schema, /indisunique/);
  assert.match(read("scripts/analyses-schema.sql"), /CREATE TABLE IF NOT EXISTS analyses/);
  assert.match(read("scripts/analyses-schema.sql"), /ADD COLUMN IF NOT EXISTS hall_of_shame/);
  assert.match(read("artifacts/api-server/src/routes/sigil/index.ts"), /ensureAnalysesSchema/);
  assert.match(read("artifacts/api-server/src/routes/health.ts"), /database\.status === "ready"/);
});

test("analysis detail fetch uses query route to avoid Vercel dynamic param stripping", () => {
  assert.match(read("lib/api-client-react/src/generated/api.ts"), /history\?id=/);
  assert.match(read("artifacts/api-server/src/routes/sigil/index.ts"), /req\.query\.id/);
});

test("extension production origin matches the deployed Sigil subdomain", () => {
  assert.match(read("artifacts/sigil-extension/core.js"), /https:\/\/sigil\.s3ntrylabs\.com/);
  assert.match(read("artifacts/sigil-extension/manifest.json"), /https:\/\/sigil\.s3ntrylabs\.com\/\*/);
});

test("environment template and deployment docs cover required production variables", () => {
  const envExample = read(".env.example");
  const docs = read("docs/deployment-vercel.md");
  for (const key of [
    "DATABASE_URL",
    "AI_INTEGRATIONS_OPENAI_BASE_URL",
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "SIGIL_AI_MODEL",
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"));
    assert.match(docs, new RegExp(key));
  }
  assert.match(envExample, /^AI_INTEGRATIONS_OPENAI_BASE_URL=https:\/\/openrouter\.ai\/api\/v1$/m);
  assert.match(envExample, /^SIGIL_AI_MODEL=deepseek\/deepseek-v4-flash$/m);
  assert.match(docs, /^SIGIL_AI_MODEL=deepseek\/deepseek-v4-flash$/m);
  assert.match(read("artifacts/api-server/src/env.ts"), /DEFAULT_SIGIL_AI_MODEL = "deepseek\/deepseek-v4-flash"/);
  assert.match(read(".gitignore"), /^\.env$/m);
  assert.match(read(".gitignore"), /^!\.env\.example$/m);
});
