import assert from "node:assert/strict";
import { once } from "node:events";

// Prevent this smoke test from reaching any real database or AI provider.
process.env.DATABASE_URL = "postgresql://audit:audit@127.0.0.1:1/audit";
process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "audit-placeholder";
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "http://127.0.0.1:1";
process.env.CRON_SECRET = "";
const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
try {
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(`${url}/api/healthz`)).status, 200);
  assert.equal((await fetch(`${url}/api/sigil/maintenance/retention`, {
    headers: { Authorization: "Bearer forged" },
  })).status, 401);
  assert.equal((await fetch(`${url}/api/sigil/simulate`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  })).status, 422);
  assert.equal((await fetch(`${url}/api/sigil/simulate-v2`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  })).status, 400);
  const advisory = await fetch(`${url}/api/sigil/simulate-v2`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({rawData: "public prompt", network: "mainnet"}),
  });
  assert.equal(advisory.status, 200);
  const result = await advisory.json();
  assert.equal(result.assessmentStatus, "advisory_only");
  for (const field of ["riskScore", "verdict", "assetChanges", "permissionsGranted"]) assert.equal(Object.hasOwn(result, field), false);
  console.log("Built Express smoke passed: health200, cron401, legacy422, invalid-v2 400, advisory-v2 without invented effects/score");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
// The built application's cache interval intentionally lasts for the process.
process.exit(0);
