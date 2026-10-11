import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "sigil-notices-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "tmp"));
  const script = path.join(root, "scripts/collect-license-texts.mjs");
  await writeFile(script, await readFile(new URL("./collect-license-texts.mjs", import.meta.url)));
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\r\n");
  const packagePath = path.join(root, "node_modules/.pnpm/fixture@1.0.0/node_modules/fixture");
  await mkdir(packagePath, { recursive: true });
  await writeFile(path.join(packagePath, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", license: "MIT" }));
  const inventory = { MIT: [{ name: "fixture", versions: ["1.0.0"], paths: [packagePath] }] };
  const run = async (data = inventory, target = "tmp/notices") => {
    await writeFile(path.join(root, "tmp/inventory.json"), JSON.stringify(data));
    return spawnSync(process.execPath, [script, "--inventory", path.join(root, "tmp/inventory.json"), "--output", path.join(root, target)], { encoding: "utf8" });
  };
  return { root, packagePath, inventory, run };
}

test("notice collector preserves exact original text and records hashes without declaring clearance", async (t) => {
  const { root, packagePath, run } = await fixture(t);
  const original = "MIT License\r\nCopyright Fixture\r\n";
  await writeFile(path.join(packagePath, "LICENSE.txt"), original);
  await writeFile(path.join(packagePath, "NOTICE"), "Original attribution\n");
  const result = await run();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(await readFile(path.join(root, "tmp/notices/index.json"), "utf8"));
  assert.equal(report.clearance, "not-established");
  assert.equal(report.components.length, 1);
  assert.equal(report.components[0].files.length, 2);
  const license = report.components[0].files.find((file) => file.name === "LICENSE.txt");
  assert.equal(await readFile(path.join(root, "tmp/notices", license.output), "utf8"), original);
  assert.match(license.sha256, /^[a-f0-9]{64}$/);
  assert.equal(license.sha256, createHash("sha256").update(original).digest("hex"));
  assert.equal(report.components[0].status, "texts-collected-review-required");
  assert.equal((await run()).status, 1, "must not overwrite an existing evidence tree");
  assert.equal((await run(undefined, "tmp/second-notices")).status, 0);
  assert.equal(await readFile(path.join(root, "tmp/second-notices/index.json"), "utf8"), await readFile(path.join(root, "tmp/notices/index.json"), "utf8"), "index must be deterministic");
});

test("missing original text remains an explicit gap rather than a fabricated MIT notice", async (t) => {
  const { root, run } = await fixture(t);
  assert.equal((await run()).status, 0);
  const report = JSON.parse(await readFile(path.join(root, "tmp/notices/index.json"), "utf8"));
  assert.equal(report.gaps, 1);
  assert.equal(report.components[0].status, "original-text-not-found");
  assert.deepEqual(report.components[0].files, []);
});

test("package identity mismatch or unrepresented versions fail before creating evidence", async (t) => {
  const { root, inventory, run } = await fixture(t);
  for (const versions of [["2.0.0"], ["1.0.0", "2.0.0"]]) {
    assert.equal((await run({ MIT: [{ ...inventory.MIT[0], versions }] })).status, 1);
  }
  assert.equal((await run({ MIT: [{ ...inventory.MIT[0], name: "wrong-package" }] })).status, 1);
  await assert.rejects(readFile(path.join(root, "tmp/notices/index.json")), { code: "ENOENT" });
});

test("outside installed-store input and outside-tmp output are rejected", async (t) => {
  const { root, inventory, run } = await fixture(t);
  assert.equal((await run({ MIT: [{ ...inventory.MIT[0], paths: [path.join(root, "tmp")] }] })).status, 1);
  assert.equal((await run(inventory, ".compliance/notices")).status, 1);
});

test("license symlinks cannot copy unrelated files into the bundle", async (t) => {
  const { root, packagePath, run } = await fixture(t);
  const outside = path.join(root, "tmp/private.txt");
  await writeFile(outside, "not a license");
  await symlink(outside, path.join(packagePath, "LICENSE"), "file");
  assert.equal((await run()).status, 1);
  await assert.rejects(readFile(path.join(root, "tmp/notices/index.json")), { code: "ENOENT" });
});

test("output junctions cannot write into an unrelated evidence directory", async (t) => {
  const { root, run } = await fixture(t);
  const target = path.join(root, "unrelated");
  await mkdir(target);
  await symlink(target, path.join(root, "tmp/alias"), process.platform === "win32" ? "junction" : "dir");
  assert.equal((await run(undefined, "tmp/alias/notices")).status, 1);
  await assert.rejects(readFile(path.join(target, "notices/index.json")), { code: "ENOENT" });
});

test("installed store junction cannot redirect collection outside the actual store", async (t) => {
  const { root, packagePath, run } = await fixture(t);
  const store = path.join(root, "node_modules/.pnpm");
  const moved = path.join(root, "tmp/redirected-store");
  const { rename } = await import("node:fs/promises");
  await rename(store, moved);
  await symlink(moved, store, process.platform === "win32" ? "junction" : "dir");
  await writeFile(path.join(packagePath, "LICENSE"), "must not collect redirected content");
  assert.equal((await run()).status, 1);
});
