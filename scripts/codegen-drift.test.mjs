import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const module = await import("./codegen-drift.mjs").catch((error) => {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  return {};
});

async function fixture(t, generated, committed) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sigil-codegen-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [tree, files] of Object.entries({ generated, committed })) {
    await mkdir(path.join(root, tree));
    for (const [name, contents] of Object.entries(files)) {
      const file = path.join(root, tree, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, contents);
    }
  }
  assert.equal(typeof module.compareGeneratedTrees, "function", "generated tree drift detection must exist");
  return (options) => module.compareGeneratedTrees(path.join(root, "generated"), path.join(root, "committed"), options);
}

test("detects missing committed files including nested paths", async (t) => {
  const compare = await fixture(t, { "types/record.ts": "required" }, {});
  assert.deepEqual(await compare(), [{ path: "types/record.ts", kind: "missing" }]);
});

test("detects extra stale committed files", async (t) => {
  const compare = await fixture(t, {}, { "types/stale.ts": "obsolete" });
  assert.deepEqual(await compare(), [{ path: "types/stale.ts", kind: "extra" }]);
});

test("detects semantic and non-TypeScript content changes without dumping contents", async (t) => {
  const compare = await fixture(t, { "record.ts": "input: string", "manifest.json": "new" }, { "record.ts": "input?: string", "manifest.json": "old" });
  assert.deepEqual(await compare(), [{ path: "manifest.json", kind: "changed" }, { path: "record.ts", kind: "changed" }]);
});

test("normalizes Windows line endings only", async (t) => {
  const compare = await fixture(t, { "api.ts": "one\r\ntwo\r\n" }, { "api.ts": "one\ntwo\n" });
  assert.deepEqual(await compare(), []);
});

test("allows only the isolated client mutator import relocation", async (t) => {
  const generated = 'import { customFetch } from "../../../src/custom-fetch";\nimport type { ErrorType, BodyType } from "../../../src/custom-fetch";\n';
  const committed = generated.replaceAll("../../../src/custom-fetch", "../custom-fetch");
  const compare = await fixture(t, { "api.ts": generated }, { "api.ts": committed });
  assert.deepEqual(await compare({ relocatedMutator: true }), []);
  assert.deepEqual(await compare(), [{ path: "api.ts", kind: "changed" }]);
});

test("does not mask other import or string changes, even in api.ts", async (t) => {
  const compare = await fixture(t, { "api.ts": 'const value = "../../../src/custom-fetch";\n' }, { "api.ts": 'const value = "../custom-fetch";\n' });
  assert.deepEqual(await compare({ relocatedMutator: true }), [{ path: "api.ts", kind: "changed" }]);
});

test("does not normalize mutator relocation in arbitrary generated files", async (t) => {
  const compare = await fixture(t, { "types/api.ts": 'import { customFetch } from "../../../src/custom-fetch";' }, { "types/api.ts": 'import { customFetch } from "../custom-fetch";' });
  assert.deepEqual(await compare({ relocatedMutator: true }), [{ path: "types/api.ts", kind: "changed" }]);
});

test("does not ignore whitespace changes or silently tolerate a missing tree", async (t) => {
  const compare = await fixture(t, { "api.ts": "required " }, { "api.ts": "required" });
  assert.deepEqual(await compare(), [{ path: "api.ts", kind: "changed" }]);
  await assert.rejects(module.compareGeneratedTrees(path.join(os.tmpdir(), "sigil-no-such-generated-tree"), path.join(os.tmpdir(), "sigil-no-such-committed-tree")), { code: "ENOENT" });
});
