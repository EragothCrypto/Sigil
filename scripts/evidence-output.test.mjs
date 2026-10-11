import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function sandbox(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sigil-evidence-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ["scripts", ".compliance", "tmp/evidence", "artifacts/sigil/public", "artifacts/sigil-extension/icons", "artifacts/release"]) {
    await mkdir(path.join(root, dir), { recursive: true });
  }
  return root;
}

test("SBOM evidence mode uses supplied inventory and leaves authoritative snapshot unchanged", async (t) => {
  const root = await sandbox(t);
  const script = path.join(root, "scripts/generate-sbom.mjs");
  await writeFile(script, await readFile(new URL("./generate-sbom.mjs", import.meta.url)));
  await writeFile(path.join(root, ".compliance/sbom.cdx.json"), "historical evidence");
  const licenses = { MIT: [{ name: "current-fixture", versions: ["1.2.3"] }] };
  await writeFile(path.join(root, "tmp/licenses.json"), JSON.stringify(licenses));
  await writeFile(path.join(root, ".compliance/dependency-licenses.json"), JSON.stringify({ MIT: [{ name: "old", versions: ["0.1.0"] }] }));
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\r\n");
  const result = spawnSync(process.execPath, [script, "--inventory", path.join(root, "tmp/licenses.json"), "--output", path.join(root, "tmp/evidence/sbom.json")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  await assert.doesNotReject(access(path.join(root, "tmp/evidence/sbom.json")), "evidence output must be separate");
  const bom = JSON.parse(await readFile(path.join(root, "tmp/evidence/sbom.json"), "utf8"));
  assert.equal(bom.components[0].name, "current-fixture");
  assert.equal(await readFile(path.join(root, ".compliance/sbom.cdx.json"), "utf8"), "historical evidence");
});

test("SBOM rejects unknown output arguments rather than writing the default snapshot", async (t) => {
  const root = await sandbox(t);
  const script = path.join(root, "scripts/generate-sbom.mjs");
  await writeFile(script, await readFile(new URL("./generate-sbom.mjs", import.meta.url)));
  await writeFile(path.join(root, ".compliance/dependency-licenses.json"), "{}");
  await writeFile(path.join(root, ".compliance/sbom.cdx.json"), "historical evidence");
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
  const result = spawnSync(process.execPath, [script, "--outpt", "tmp/wrong.json"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(path.join(root, ".compliance/sbom.cdx.json"), "utf8"), "historical evidence");
});

test("SBOM evidence mode rejects outside-tmp targets including Windows case aliases", async (t) => {
  const root = await sandbox(t);
  const script = path.join(root, "scripts/generate-sbom.mjs");
  await writeFile(script, await readFile(new URL("./generate-sbom.mjs", import.meta.url)));
  await writeFile(path.join(root, "tmp/licenses.json"), "{}");
  await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
  await writeFile(path.join(root, ".compliance/sbom.cdx.json"), "historical evidence");
  await writeFile(path.join(root, ".compliance/other.json"), "other evidence");
  for (const target of [".compliance/other.json", ".compliance/SBOM.cdx.json", "artifacts/release/evidence.json"]) {
    const result = spawnSync(process.execPath, [script, "--inventory", path.join(root, "tmp/licenses.json"), "--output", path.join(root, target)], { encoding: "utf8" });
    assert.notEqual(result.status, 0, `Evidence path must reject: ${target}`);
  }
  assert.equal(await readFile(path.join(root, ".compliance/sbom.cdx.json"), "utf8"), "historical evidence");
  assert.equal(await readFile(path.join(root, ".compliance/other.json"), "utf8"), "other evidence");
});

test("extension evidence packaging does not overwrite release or public artifacts", { skip: process.platform !== "win32" }, async (t) => {
  const root = await sandbox(t);
  const script = path.join(root, "scripts/package-extension.ps1");
  await writeFile(script, await readFile(new URL("./package-extension.ps1", import.meta.url)));
  const files = ["background.js", "core.js", "content.js", "inject.js", "popup.html", "popup.js", "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png"];
  for (const file of files) await writeFile(path.join(root, "artifacts/sigil-extension", file), "fixture");
  await writeFile(path.join(root, "artifacts/sigil-extension/manifest.json"), '{"version":"1.0.4"}');
  await writeFile(path.join(root, "artifacts/sigil/public/sigil-extension.zip"), "public evidence");
  await writeFile(path.join(root, "artifacts/release/sigil-chrome-extension-v1.0.4.zip"), "release evidence");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-EvidenceDirectory", path.join(root, "tmp/evidence")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  await assert.doesNotReject(access(path.join(root, "tmp/evidence/sigil-chrome-extension-v1.0.4.zip")));
  assert.equal(await readFile(path.join(root, "artifacts/sigil/public/sigil-extension.zip"), "utf8"), "public evidence");
  assert.equal(await readFile(path.join(root, "artifacts/release/sigil-chrome-extension-v1.0.4.zip"), "utf8"), "release evidence");
  const rejected = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-EvidenceDirectory", path.join(root, "artifacts/release")], { encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "evidence output outside tmp must reject");
});
