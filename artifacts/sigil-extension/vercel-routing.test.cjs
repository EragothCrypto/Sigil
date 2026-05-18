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

test("root Vercel API functions import the built Express app", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.match(config.buildCommand, /@workspace\/api-server build/);
  assert.equal(exists("api/index.js"), true);
  assert.equal(exists("api/[...path].js"), true);
  assert.match(read("api/index.js"), /artifacts\/api-server\/dist\/app\.mjs/);
  assert.match(read("api/[...path].js"), /artifacts\/api-server\/dist\/app\.mjs/);
});

test("artifact-root Vercel config exists for Vercel projects rooted at artifacts/sigil", () => {
  const config = JSON.parse(read("artifacts/sigil/vercel.json"));
  assert.match(config.buildCommand, /@workspace\/api-server build/);
  assert.deepEqual(config.rewrites[0], { source: "/api/:path*", destination: "/api/:path*" });
  assert.equal(exists("artifacts/sigil/api/index.js"), true);
  assert.equal(exists("artifacts/sigil/api/[...path].js"), true);
  assert.match(read("artifacts/sigil/api/index.js"), /api-server\/dist\/app\.mjs/);
  assert.match(read("artifacts/sigil/api/[...path].js"), /api-server\/dist\/app\.mjs/);
});

test("api-server build emits an app bundle for Vercel functions", () => {
  assert.match(read("artifacts/api-server/build.mjs"), /src\/app\.ts/);
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
