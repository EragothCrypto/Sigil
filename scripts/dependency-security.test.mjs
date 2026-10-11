import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import test from "node:test";

const specRequire = createRequire(realpathSync(new URL("../lib/api-spec/node_modules/orval/package.json", import.meta.url)));
const { parse } = specRequire("yaml");
const lock = parse(readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8"));
const prettyRequire = createRequire(realpathSync(new URL("../artifacts/api-server/node_modules/pino-pretty/package.json", import.meta.url)));
const typographyRequire = createRequire(realpathSync(new URL("../artifacts/sigil/node_modules/@tailwindcss/typography/package.json", import.meta.url)));
const viteRequire = createRequire(realpathSync(new URL("../artifacts/sigil/node_modules/vite/package.json", import.meta.url)));
const postcssRequire = createRequire(realpathSync(viteRequire.resolve("postcss/package.json")));

test("lockfile excludes the three remediated vulnerable package versions", () => {
  const packages = Object.keys(lock.packages);
  for (const [name, version] of [["source-map-js", "1.2.2"], ["fast-copy", "4.1.2"], ["postcss-selector-parser", "7.1.6"]]) {
    assert.deepEqual(packages.filter((key) => key.startsWith(`${name}@`)), [`${name}@${version}`]);
  }
});

test("installed fast-copy bounds deeply nested objects and arrays", () => {
  const { copy } = prettyRequire("fast-copy");
  for (const wrap of [(value) => ({ next: value }), (value) => [value]]) {
    let value = {};
    for (let depth = 0; depth < 1200; depth++) value = wrap(value);
    assert.throws(() => copy(value), (error) => error.name === "MaxDepthExceededError");
  }
});

test("installed fast-copy preserves ordinary log values and circular references", () => {
  const { copy } = prettyRequire("fast-copy");
  const value = { stage: "evidence_adapters", elapsedMs: 958, nested: { tokens: ["USDC"] } };
  value.self = value;
  const result = copy(value);
  assert.notEqual(result, value);
  assert.notEqual(result.nested, value.nested);
  assert.deepEqual(result.nested, value.nested);
  assert.equal(result.self, result);
});

test("installed source-map-js rejects huge and noninteger indexed offsets", () => {
  const { SourceMapConsumer } = postcssRequire("source-map-js");
  for (const line of [100000000, 0.5]) {
    assert.throws(() => new SourceMapConsumer({ version: 3, sections: [{ offset: { line, column: 0 }, map: { version: 3, sources: ["input.js"], names: [], mappings: "AAAA" } }] }));
  }
});

test("installed source-map-js preserves a normal mapping round trip", () => {
  const { SourceMapConsumer, SourceMapGenerator } = postcssRequire("source-map-js");
  const map = new SourceMapGenerator();
  map.addMapping({ generated: { line: 1, column: 0 }, original: { line: 2, column: 3 }, source: "input.js" });
  const consumer = new SourceMapConsumer(map.toJSON());
  assert.deepEqual(consumer.originalPositionFor({ line: 1, column: 0 }), { source: "input.js", line: 2, column: 3, name: null });
});

test("Typography's installed parser preserves selectors and class traversal", () => {
  const parser = typographyRequire("postcss-selector-parser");
  for (const selector of ["h1, h2", ".prose :where(a):not(:where(.not-prose *))", "[data-x='a,b'] > p::before", ".dark\\:prose :is(h1,h2)", "p + p", "ul > li:nth-child(2n+1)"]) {
    assert.equal(parser().processSync(selector), selector);
  }
  const classes = [];
  parser((root) => root.walkClasses((node) => classes.push(node.value))).processSync(".prose :not(.not-prose)");
  assert.deepEqual(classes, ["prose", "not-prose"]);
});

test("Typography's parser completes large flat class and id selectors within a kill deadline", () => {
  const script = `const assert = require('node:assert/strict');
    const parser = require(${JSON.stringify(typographyRequire.resolve("postcss-selector-parser"))});
    for (const segment of ['.a', '#a']) {
      const selector = segment.repeat(200000);
      assert.equal(parser().processSync(selector), selector);
    }`;
  execFileSync(process.execPath, ["--max-old-space-size=256", "-e", script], { timeout: 15000, stdio: "pipe" });
});

test("Typography's actual pseudo rewrite preserves AST removal, prepend and serialization", () => {
  const { commonTrailingPseudos } = typographyRequire("./src/utils.js");
  for (const [selector, expected] of [
    ["p::before, li::before", ["::before", "p, li"]],
    ["p::before,li::after", [null, "p::before,li::after"]],
    ["p:not(.x)::before", ["::before", "p:not(.x)"]],
    ["a::before::marker,b::before::marker", ["::before::marker", "a,b"]],
  ]) assert.deepEqual(commonTrailingPseudos(selector), expected);
});
