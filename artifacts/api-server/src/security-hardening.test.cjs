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
