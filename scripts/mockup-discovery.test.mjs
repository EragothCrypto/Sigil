import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import fs from "node:fs";
import { mockupPreviewPlugin } from "../artifacts/mockup-sandbox/mockupPreviewPlugin.ts";

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "sigil-mockup-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const generated = path.join(root, "src/.generated/mockup-components.ts");
  const put = (relative) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, "export default function Demo() { return null; }\n");
    return file;
  };
  const plugin = mockupPreviewPlugin();
  plugin.configResolved({ root });
  return { root, generated, put, plugin, source: () => readFileSync(generated, "utf8") };
}

async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await delay(50);
  }
  assert.fail("Mockup refresh did not finish within five seconds");
}

test("dependency graph removes fast-glob and its vulnerable brace parser without removing preview", () => {
  const require = createRequire(realpathSync(new URL("../lib/api-spec/node_modules/orval/package.json", import.meta.url)));
  const { parse } = require("yaml");
  const lock = parse(readFileSync(new URL("../pnpm-lock.yaml", import.meta.url), "utf8"));
  for (const name of ["braces", "fast-glob", "micromatch"]) {
    assert.ok(!Object.keys(lock.packages).some((key) => key.startsWith(`${name}@`)), `${name} remains locked`);
  }
  const manifest = JSON.parse(readFileSync(new URL("../artifacts/mockup-sandbox/package.json", import.meta.url), "utf8"));
  assert.ok(manifest.devDependencies.tinyglobby);
});

test("build discovery keeps recursive TSX imports and exclusions with portable escaped paths", async (t) => {
  const f = fixture(t);
  for (const file of ["Card.tsx", "demo/Card's.tsx", "Directory.tsx/Child.tsx", "_hidden.tsx", "_internal/Card.tsx", "demo/_internal/Card.tsx", ".private/Card.tsx", ".Hidden.tsx", "Upper.TSX", "Other.ts"]) f.put(`src/components/mockups/${file}`);
  await f.plugin.buildStart();
  const source = f.source();
  for (const file of ["Card.tsx", "demo/Card's.tsx", "Directory.tsx/Child.tsx"]) {
    assert.ok(source.includes(`${JSON.stringify(`./components/mockups/${file}`)}: () => import(${JSON.stringify(`../components/mockups/${file}`)})`));
  }
  assert.doesNotMatch(source, /_hidden|_internal|\.private|\.Hidden|Upper|Other\.ts|Directory\.tsx":|\\\\/);
});

test("missing mockup directory generates an empty module and unchanged refresh is stable", async (t) => {
  const f = fixture(t);
  await f.plugin.buildStart();
  const initial = f.source();
  assert.match(initial, /export const modules: ModuleMap = \{\n\n\};/);
  await f.plugin.buildStart();
  assert.equal(f.source(), initial);
});

test("directory links retain file discovery under the link path", async (t) => {
  const f = fixture(t);
  f.put("linked/Card.tsx");
  mkdirSync(path.join(f.root, "src/components/mockups"), { recursive: true });
  symlinkSync(path.join(f.root, "linked"), path.join(f.root, "src/components/mockups/linked"), "junction");
  symlinkSync(path.join(f.root, "missing"), path.join(f.root, "src/components/mockups/broken"), "junction");
  await f.plugin.buildStart();
  assert.ok(f.source().includes('"./components/mockups/linked/Card.tsx"'));
  assert.doesNotMatch(f.source(), /broken/);
});

test("watcher adds and removes eligible files without including underscore files", async (t) => {
  const f = fixture(t);
  await f.plugin.configureServer({ middlewares: { use() {} } });
  t.after(() => f.plugin.closeWatcher());
  await delay(250);
  const file = f.put("src/components/mockups/demo/Added.tsx");
  await until(() => f.source().includes("Added.tsx"));
  f.put("src/components/mockups/_internal/Hidden.tsx");
  await delay(250);
  assert.doesNotMatch(f.source(), /Hidden/);
  rmSync(file);
  await until(() => !f.source().includes("Added.tsx"));
});

test("404 rescan retains response semantics and only uses the fixed file discovery pattern", async (t) => {
  const f = fixture(t);
  let middleware;
  await f.plugin.configureServer({ middlewares: { use(value) { middleware = value; } } });
  await f.plugin.closeWatcher();
  f.put("src/components/mockups/Recovered.tsx");
  let forwarded = false;
  const response = { statusCode: 404, end(value) { return `sent:${value}`; } };
  middleware({ url: "/src/components/mockups/Recovered.tsx?pattern=%7B%7B%7B" }, response, () => { forwarded = true; });
  assert.ok(forwarded);
  assert.equal(response.end("original"), "sent:original");
  await until(() => f.source().includes("Recovered.tsx"));
});

test("a nested directory read failure rejects discovery rather than publishing a partial module", async (t) => {
  const f = fixture(t);
  f.put("src/components/mockups/Visible.tsx");
  f.put("src/components/mockups/denied/Hidden.tsx");
  const original = fs.readdir;
  t.mock.method(fs, "readdir", (directory, options, callback) => {
    if (String(directory).replace(/\\/g, "/").replace(/\/$/, "").endsWith("/denied")) {
      callback(Object.assign(new Error("synthetic directory denied"), { code: "EACCES" }));
    } else original(directory, options, callback);
  });
  await assert.rejects(() => f.plugin.buildStart(), { code: "EACCES" });
});

test("unresolvable excluded links do not prevent ordinary preview discovery", async (t) => {
  const f = fixture(t);
  f.put("src/components/mockups/Visible.tsx");
  f.put("linked/Card.tsx");
  for (const name of ["_private", ".private"]) {
    symlinkSync(path.join(f.root, "linked"), path.join(f.root, `src/components/mockups/${name}`), "junction");
  }
  const original = fs.realpath;
  t.mock.method(fs, "realpath", (file, ...args) => {
    if (/[/\\][_.]private[/\\]?$/.test(String(file))) {
      args.at(-1)(Object.assign(new Error("synthetic link denied"), { code: "EACCES" }));
    } else original(file, ...args);
  });
  await f.plugin.buildStart();
  assert.ok(f.source().includes("Visible.tsx"));
  assert.doesNotMatch(f.source(), /private/);
});
