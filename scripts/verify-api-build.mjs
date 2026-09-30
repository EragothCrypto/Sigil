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
  })).status, 400);
  console.log("Built Express smoke passed: health 200, unauthorized cron 401, invalid simulation 400");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
// The built application's cache interval intentionally lasts for the process.
process.exit(0);
