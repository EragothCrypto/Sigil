import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateRetentionDrillUrl } from "./p00-retention-guard.mjs";

test("retention drill accepts only its named loopback database and role", () => {
  for (const host of ["127.0.0.1:55432", "127.0.0.1:5432"]) {
    assert.equal(validateRetentionDrillUrl(`postgresql://sigil_p00:synthetic@${host}/sigil_p00_retention`).hostname, "127.0.0.1");
  }
});

test("retention drill rejects IPv6 URLs unsupported by the connection-string driver", () => {
  assert.throws(() => validateRetentionDrillUrl("postgresql://sigil_p00:synthetic@[::1]:5432/sigil_p00_retention"), /p00_retention_isolated_url_required/);
});

test("real drill CLI fails before driver/network work and never prints the rejected URL", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-retention-postgres.mjs", import.meta.url))], {
    encoding: "utf8", env: { SIGIL_P00_DATABASE_URL: "postgresql://sigil_p00:private-value@production.example/sigil_p00_retention" }, timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).stage, "context");
  assert.doesNotMatch(result.stderr, /private-value|production\.example|postgresql:\/\//);
});

test("real drill CLI rejects unknown control flags rather than silently running a success case", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-retention-postgres.mjs", import.meta.url)), "--unknown-control"], {
    encoding: "utf8", env: { SIGIL_P00_DATABASE_URL: "postgresql://sigil_p00:synthetic@127.0.0.1:55431/sigil_p00_retention" }, timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).stage, "context");
});

test("retention drill rejects missing, remote, production and option-bearing contexts without leaking values", () => {
  for (const value of [undefined, "", "not a URL", "postgres://sigil_p00:private-value@db.example/sigil_p00_retention", "postgres://sigil_p00:private-value@localhost/sigil_p00_retention", "postgres://admin:private-value@127.0.0.1/sigil_p00_retention", "postgres://sigil_p00:private-value@127.0.0.1/production", "postgres://sigil_p00:private-value@127.0.0.1/sigil_p00_retention?options=-csearch_path=public", "https://sigil_p00:private-value@127.0.0.1/sigil_p00_retention"]) {
    assert.throws(() => validateRetentionDrillUrl(value), (error) => error.message === "p00_retention_isolated_url_required");
  }
});
