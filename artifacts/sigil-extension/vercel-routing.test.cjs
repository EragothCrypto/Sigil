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
  assert.deepEqual(config.rewrites[0], { source: "/api/:path*", destination: "/api/:path*" });
  assert.deepEqual(config.rewrites.at(-1), { source: "/(.*)", destination: "/index.html" });
});

test("root Vercel API functions export the Express app", () => {
  assert.equal(exists("api/index.ts"), true);
  assert.equal(exists("api/[...path].ts"), true);
  assert.match(read("api/index.ts"), /artifacts\/api-server\/src\/app\.js/);
  assert.match(read("api/[...path].ts"), /artifacts\/api-server\/src\/app\.js/);
});

test("artifact-root Vercel config exists for Vercel projects rooted at artifacts/sigil", () => {
  const config = JSON.parse(read("artifacts/sigil/vercel.json"));
  assert.deepEqual(config.rewrites[0], { source: "/api/:path*", destination: "/api/:path*" });
  assert.equal(exists("artifacts/sigil/api/index.ts"), true);
  assert.equal(exists("artifacts/sigil/api/[...path].ts"), true);
  assert.match(read("artifacts/sigil/api/index.ts"), /api-server\/src\/app\.js/);
  assert.match(read("artifacts/sigil/api/[...path].ts"), /api-server\/src\/app\.js/);
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
  assert.match(envExample, /^SIGIL_AI_MODEL=deepseek\/deepseek-v4-flash:free$/m);
  assert.match(read(".gitignore"), /^\.env$/m);
  assert.match(read(".gitignore"), /^!\.env\.example$/m);
});
