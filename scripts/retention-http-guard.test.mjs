import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

for (const flags of [[], ["--privacy"]]) {
for (const context of [undefined, "postgresql://sigil_p00:private-value@production.example/sigil_p00_retention", "postgresql://admin:private-value@127.0.0.1/production"]) {
  test(`HTTP retention drill rejects unsafe context ${context ? "without leaking it" : "when omitted"}`, () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-retention-http.mjs", import.meta.url)), ...flags], {
      encoding: "utf8", env: context ? { SIGIL_P00_DATABASE_URL: context } : {}, timeout: 10000,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).stage, "context");
    assert.doesNotMatch(result.stderr, /private-value|production\.example|postgresql:\/\//);
  });
}
}

for (const flag of ["--unknown", "--privacy=false", "unexpected-positional"]) {
  test(`HTTP drill rejects invalid argument ${flag} before database access`, () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-retention-http.mjs", import.meta.url)), flag], {
      encoding: "utf8", timeout: 10000,
      env: { SIGIL_P00_DATABASE_URL: "postgresql://sigil_p00:synthetic@127.0.0.1:1/sigil_p00_retention" },
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).stage, "context");
  });
}
