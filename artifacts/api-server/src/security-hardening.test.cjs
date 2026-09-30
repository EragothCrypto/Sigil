const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

test("api server uses restricted CORS and a rate limiter", () => {
  const app = read("app.ts");
  assert.doesNotMatch(app, /app\.use\(cors\(\)\)/);
  assert.match(app, /createCorsOptions/);
  assert.match(app, /createRateLimit/);
  assert.match(app, /app\.use\(cors\(createCorsOptions\(\)\)\)/);
  assert.match(app, /app\.use\(createRateLimit\(\)\)/);
});

test("etherscan calls do not silently use the shared dummy token", () => {
  const ethereum = read(path.join("routes", "sigil", "ethereum.ts"));
  const reputation = read(path.join("routes", "sigil", "contract-reputation.ts"));
  for (const source of [ethereum, reputation]) {
    assert.doesNotMatch(source, /YourApiKeyToken/);
    assert.match(source, /getEtherscanApiKey/);
  }
});

test("analysis results do not correlate approval history across users", () => {
  const routes = read(path.join("routes", "sigil", "index.ts"));
  assert.doesNotMatch(routes, /Look up prior approvals to the same spender/);
  assert.doesNotMatch(routes, /\.limit\(200\)/);
  assert.match(routes, /priorApprovals:\s*\[\]/);
});

test("retention cleanup is scheduled and protected by a cron secret", () => {
  const routes = read(path.join("routes", "sigil", "index.ts"));
  const schema = read(path.join("routes", "sigil", "analysis-schema.ts"));
  const rootVercel = read(path.join("..", "..", "..", "vercel.json"));
  const artifactVercel = read(path.join("..", "..", "sigil", "vercel.json"));
  const env = read(path.join("..", "..", "..", ".env.example"));
  assert.match(routes, /maintenance\/retention/);
  assert.match(routes, /CRON_SECRET/);
  assert.match(routes, /Bearer/);
  assert.match(schema, /export async function runAnalysisRetentionCleanup/);
  for (const config of [rootVercel, artifactVercel]) {
    const parsed = JSON.parse(config);
    assert.deepEqual(parsed.crons, [{ path: "/api/sigil/maintenance/retention", schedule: "17 3 * * *" }]);
  }
  assert.match(env, /CRON_SECRET=/);
});

test("numeric public analysis ids are bounded before database lookup", () => {
  const routes = read(path.join("routes", "sigil", "index.ts"));
  assert.match(routes, /Number\.isSafeInteger\(numericId\)/);
  assert.match(routes, /numericId\s*>\s*0/);
});
