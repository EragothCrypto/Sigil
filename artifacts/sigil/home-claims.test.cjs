const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const source = readFileSync(path.join(__dirname, "src/pages/home.tsx"), "utf8");

test("home chain count derives from the selectable network list", () => {
  assert.match(source, /\{NETWORKS\.length\} selectable EVM networks/);
  assert.doesNotMatch(source, /every major EVM chain/);
});

test("home does not fabricate volume, per-scan signal count or decoding latency", () => {
  for (const unsupported of [/\$10B\+/, /50\+/, /under 2 seconds/, /Know exactly what any contract does/, /Every token approval decoded/, /full approval history/]) {
    assert.doesNotMatch(source, unsupported);
  }
});

test("home distinguishes historical registry and event candidates from live sanctions or rights", () => {
  assert.doesNotMatch(source, /Tornado Cash \(OFAC\)|OFAC Sanctions Check|OFAC-sanctioned addresses/);
  assert.match(source, /not current allowances/);
  assert.match(source, /manual refresh/);
});

test("home qualifies its heuristic and partial evidence", () => {
  assert.match(source, /not a safety guarantee/);
  assert.match(source, /coverage limits/);
  assert.doesNotMatch(source, /contract credit score based on age|Detects honeypots, wallet drainers/);
});

test("historical case handoff does not claim verified retrospective detection", () => {
  assert.doesNotMatch(source, /would have flagged each one|Three steps to full clarity|Every signal, in one place/);
});
