import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const { values } = parseArgs({ options: { inventory: { type: "string" }, output: { type: "string" } }, allowPositionals: false });
if (Boolean(values.inventory) !== Boolean(values.output)) throw new Error("Evidence mode requires both --inventory and --output");
const inventoryPath = values.inventory ? path.resolve(values.inventory) : path.join(root, ".compliance/dependency-licenses.json");
const outputPath = values.output ? path.resolve(values.output) : path.join(root, ".compliance/sbom.cdx.json");
if (values.output) {
  const relative = path.relative(path.join(root, "tmp"), outputPath);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Evidence output must be inside repository tmp, never a compliance/release artifact");
  }
  let current = root;
  for (const part of path.relative(root, outputPath).split(path.sep)) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("Evidence output cannot follow symbolic links");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      break;
    }
  }
}
const inventory = JSON.parse((await readFile(inventoryPath, "utf8")).replace(/^\uFEFF/, ""));
// Git checkouts may use CRLF on Windows; hash the canonical LF lockfile content.
const lockText = (await readFile(path.join(root, "pnpm-lock.yaml"), "utf8")).replace(/\r\n/g, "\n");
const lockHash = createHash("sha256").update(lockText).digest("hex");
const unique = new Map();
for (const [license, packages] of Object.entries(inventory)) {
  for (const pkg of packages) {
    for (const version of pkg.versions) {
      const purl = `pkg:npm/${pkg.name.split("/").map(encodeURIComponent).join("/")}@${encodeURIComponent(version)}`;
      unique.set(purl, {
        type: "library", "bom-ref": purl, name: pkg.name, version, purl,
        licenses: [{ license: { name: license } }],
      });
    }
  }
}
const sbom = {
  bomFormat: "CycloneDX", specVersion: "1.6", version: 1,
  metadata: {
    component: { type: "application", name: "Sigil workspace", version: "0.0.0" },
    properties: [
      { name: "sigil:pnpm-lock-sha256", value: lockHash },
      { name: "sigil:lock-newline-normalization", value: "LF" },
      { name: "sigil:inventory-source", value: values.inventory ? "supplied-license-inventory" : "stored-license-inventory-not-refreshed" },
    ],
  },
  components: [...unique.values()].sort((a, b) => a.purl.localeCompare(b.purl)),
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(sbom, null, 2)}\n`);
console.log(`Generated component inventory SBOM: ${sbom.components.length} package versions; lock SHA256 ${lockHash}`);
