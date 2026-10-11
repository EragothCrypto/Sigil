import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configs = ["../vercel.json", "../artifacts/sigil/vercel.json"].map((file) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8")));
const headersFor = (config) => Object.fromEntries((config.headers?.find((rule) => rule.source === "/(.*)")?.headers || []).map(({ key, value }) => [key.toLowerCase(), value]));
const policyFor = (headers) => Object.fromEntries((headers["content-security-policy"] || "").split(";").filter((entry) => entry.trim()).map((entry) => {
  const [name, ...values] = entry.trim().split(/\s+/);
  return [name, values];
}));

test("both deployment roots enforce the same unconditional static security headers", () => {
  assert.equal(configs[0].headers?.length, 1);
  assert.deepEqual(configs[0].headers, configs[1].headers);
  for (const config of configs) {
    const rule = config.headers.find((rule) => rule.source === "/(.*)");
    assert.equal(rule.has, undefined);
    assert.equal(rule.missing, undefined);
    const headers = headersFor(config);
    assert.deepEqual(Object.keys(headers).sort(), ["content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "x-frame-options"]);
    assert.equal(rule.headers.length, 5);
    assert.equal(headers["x-content-type-options"], "nosniff");
    assert.equal(headers["x-frame-options"], "DENY");
    assert.equal(headers["referrer-policy"], "no-referrer");
    assert.match(headers["permissions-policy"], /camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
  }
});

test("CSP restricts executable content, embedding and connections without breaking wallet popups", () => {
  for (const config of configs) {
    const headers = headersFor(config);
    const policy = policyFor(headers);
    assert.deepEqual(Object.keys(policy).sort(), ["base-uri", "connect-src", "default-src", "font-src", "form-action", "frame-ancestors", "img-src", "object-src", "script-src", "style-src"]);
    assert.equal(headers["content-security-policy"].split(";").filter((entry) => entry.trim()).length, 10);
    for (const key of ["default-src", "script-src", "connect-src", "base-uri", "form-action"]) assert.deepEqual(policy[key], ["'self'"]);
    for (const key of ["object-src", "frame-ancestors"]) assert.deepEqual(policy[key], ["'none'"]);
    assert.doesNotMatch(headers["content-security-policy"], /unsafe-eval|script-src[^;]*unsafe-inline|\*/);
    assert.equal(headers["cross-origin-opener-policy"], undefined);
    assert.equal(headers["access-control-allow-origin"], undefined);
  }
});

test("CSP permits only the current font stylesheet/font origins and required image/style forms", () => {
  for (const config of configs) {
    const policy = policyFor(headersFor(config));
    assert.deepEqual(policy["style-src"], ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]);
    assert.deepEqual(policy["font-src"], ["'self'", "https://fonts.gstatic.com"]);
    assert.deepEqual(policy["img-src"], ["'self'", "data:"]);
  }
});

test("header changes preserve both deployment API rewrites and daily retention dispatch", () => {
  for (const config of configs) {
    assert.deepEqual(config.crons, [{ path: "/api/sigil/maintenance/retention", schedule: "17 3 * * *" }]);
    assert.deepEqual(config.rewrites, [
      { source: "/api/sigil/simulate-v2", destination: "/api/sigil/simulate?executionCheckVersion=2" },
      { source: "/api/:path*", destination: "/api/:path*" },
      { source: "/(.*)", destination: "/index.html" },
    ]);
  }
});
