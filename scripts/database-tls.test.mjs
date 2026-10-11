import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const pgRequire = createRequire(realpathSync(new URL("../lib/db/node_modules/pg/package.json", import.meta.url)));
const { parse } = pgRequire("pg-connection-string");

test("both example database URLs explicitly retain certificate and hostname verification", () => {
  const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  for (const key of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
    const line = example.split(/\r?\n/).find((value) => value.startsWith(`${key}=`));
    const url = new URL(line.slice(key.length + 1));
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.notEqual(url.searchParams.get("uselibpqcompat"), "true");
  }
});

test("installed PostgreSQL parser keeps verify-full strict in current and libpq modes", () => {
  const connection = "postgresql://test:test@db.example.invalid/test?sslmode=verify-full";
  for (const options of [{}, { useLibpqCompat: true }]) {
    const config = parse(connection, options);
    assert.equal(config.host, "db.example.invalid");
    assert.ok(config.ssl && typeof config.ssl === "object");
    assert.notEqual(config.ssl.rejectUnauthorized, false);
    assert.equal(config.ssl.checkServerIdentity, undefined);
  }
});
