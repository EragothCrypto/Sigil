import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, lstat, realpath, readdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const within = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const ordered = (a, b) => a < b ? -1 : a > b ? 1 : 0;

async function main() {
  const { values } = parseArgs({ options: { inventory: { type: "string" }, output: { type: "string" } }, allowPositionals: false });
  assert.ok(values.inventory && values.output, "explicit inventory and output required");
  const output = path.resolve(values.output);
  assert.ok(within(path.join(root, "tmp"), output), "output must be below repository tmp");
  let current = root;
  for (const part of path.relative(root, output).split(path.sep)) {
    current = path.join(current, part);
    const entry = await lstat(current).catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    assert.ok(!entry?.isSymbolicLink(), "output cannot follow links");
  }
  const store = await realpath(path.join(root, "node_modules/.pnpm"));
  assert.equal(path.relative(path.join(await realpath(root), "node_modules/.pnpm"), store), "", "installed store must not redirect through links");
  const inventoryBytes = await readFile(path.resolve(values.inventory));
  const inventory = JSON.parse(inventoryBytes.toString("utf8").replace(/^\uFEFF/, ""));
  assert.ok(inventory && typeof inventory === "object" && !Array.isArray(inventory));
  const components = new Map();
  const originals = [];
  for (const [license, packages] of Object.entries(inventory)) {
    assert.ok(Array.isArray(packages));
    for (const item of packages) {
      assert.ok(typeof item.name === "string" && Array.isArray(item.versions) && item.versions.length && Array.isArray(item.paths) && item.paths.length);
      assert.ok(item.versions.every((version) => typeof version === "string" && version.length));
      const seenVersions = new Set();
      for (const packagePath of item.paths) {
        assert.equal(typeof packagePath, "string");
        const resolved = await realpath(packagePath);
        assert.ok(within(store, resolved), "package must resolve inside installed pnpm store");
        const manifestPath = path.join(resolved, "package.json");
        assert.ok((await lstat(manifestPath)).isFile() && !(await lstat(manifestPath)).isSymbolicLink());
        const manifestBytes = await readFile(manifestPath);
        const manifest = JSON.parse(manifestBytes.toString("utf8"));
        assert.equal(manifest.name, item.name);
        assert.ok(item.versions.includes(manifest.version), "installed package version must match inventory");
        seenVersions.add(manifest.version);
        const key = `${manifest.name}@${manifest.version}`;
        if (components.has(key)) assert.equal(components.get(key).declaredLicense, license, "conflicting inventory labels");
        else components.set(key, { name: manifest.name, version: manifest.version, declaredLicense: license, sources: [], manifests: [], files: [] });
        const component = components.get(key);
        const source = path.relative(root, resolved).split(path.sep).join("/");
        if (component.sources.includes(source)) continue;
        component.sources.push(source);
        component.manifests.push({ source: `${source}/package.json`, sha256: hash(manifestBytes), reportedLicense: manifest.license ?? null });
        // Bounded root-file collection only; bundled/nested/README obligations need separate review.
        for (const name of (await readdir(resolved)).sort(ordered)) {
          if (!/^(?:licen[cs]e|copying|notice|copyright)(?:$|[._-])/i.test(name)) continue;
          const filePath = path.join(resolved, name);
          const info = await lstat(filePath);
          assert.ok(info.isFile() && !info.isSymbolicLink(), "notice must be an ordinary root file");
          assert.ok(info.size > 0 && info.size <= 1024 * 1024, "notice file size outside bounded collection");
          const bytes = await readFile(filePath);
          const file = { name, source: `${source}/${name}`, sha256: hash(bytes), bytes: bytes.length };
          component.files.push(file);
          originals.push({ file, bytes });
        }
      }
      assert.deepEqual([...seenVersions].sort(ordered), [...new Set(item.versions)].sort(ordered), "inventory version has no installed path");
    }
  }
  assert.ok(components.size, "empty inventory is not license evidence");
  const sorted = [...components.entries()].sort(([a], [b]) => ordered(a, b)).map(([, value]) => value);
  for (const component of sorted) {
    component.status = component.files.length ? "texts-collected-review-required" : "original-text-not-found";
    component.sources.sort(ordered);
  }
  originals.sort((a, b) => ordered(a.file.source, b.file.source));
  originals.forEach(({ file }, index) => { file.output = `originals/${String(index).padStart(4, "0")}.txt`; });
  const lock = (await readFile(path.join(root, "pnpm-lock.yaml"), "utf8")).replace(/\r\n/g, "\n");
  const report = {
    format: "sigil-original-license-texts-v1", clearance: "not-established",
    scope: "installed inventory; package-root named notice files only; not shipped-artifact or nested-license completeness",
    lockSha256: hash(lock), inventorySha256: hash(inventoryBytes),
    gaps: sorted.filter((item) => !item.files.length).length, components: sorted,
  };
  // Never overwrite earlier evidence. An incomplete write has no final index.json.
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output);
  await mkdir(path.join(output, "originals"));
  for (const { file, bytes } of originals) await writeFile(path.join(output, file.output), bytes, { flag: "wx" });
  await writeFile(path.join(output, "index.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ components: sorted.length, originalFiles: originals.length, gaps: report.gaps, clearance: report.clearance }));
}

main().catch(() => {
  console.error("Original license collection failed; no clearance established. Check isolated inputs/output and installed package identity.");
  process.exitCode = 1;
});
