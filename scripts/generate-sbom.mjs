import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const inventory = JSON.parse((await readFile(path.join(root, ".compliance/dependency-licenses.json"), "utf8")).replace(/^\uFEFF/, ""));
const lockHash = createHash("sha256").update(await readFile(path.join(root, "pnpm-lock.yaml"))).digest("hex");
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
    properties: [{ name: "sigil:pnpm-lock-sha256", value: lockHash }],
  },
  components: [...unique.values()].sort((a, b) => a.purl.localeCompare(b.purl)),
};
await writeFile(path.join(root, ".compliance/sbom.cdx.json"), `${JSON.stringify(sbom, null, 2)}\n`);
console.log(`Generated component inventory SBOM: ${sbom.components.length} package versions; lock SHA256 ${lockHash}`);
