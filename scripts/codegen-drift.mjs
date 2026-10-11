import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function filesUnder(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesUnder(root, name));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unsupported generated entry: ${name}`);
  }
  return files.sort();
}

function normalized(text, name, relocatedMutator) {
  const lf = text.replace(/\r\n/g, "\n");
  if (name !== "api.ts" || !relocatedMutator) return lf;
  return lf
    .replace(/^import \{ customFetch \} from "\.\.\/\.\.\/\.\.\/src\/custom-fetch";$/gm, 'import { customFetch } from "../custom-fetch";')
    .replace(/^import type \{ ErrorType, BodyType \} from "\.\.\/\.\.\/\.\.\/src\/custom-fetch";$/gm, 'import type { ErrorType, BodyType } from "../custom-fetch";');
}

export async function compareGeneratedTrees(generatedRoot, committedRoot, { relocatedMutator = false } = {}) {
  const generated = new Set(await filesUnder(generatedRoot));
  const committed = new Set(await filesUnder(committedRoot));
  const differences = [];
  for (const name of [...new Set([...generated, ...committed])].sort()) {
    if (!committed.has(name)) differences.push({ path: name, kind: "missing" });
    else if (!generated.has(name)) differences.push({ path: name, kind: "extra" });
    else {
      const expected = normalized(await readFile(path.join(generatedRoot, name), "utf8"), name, relocatedMutator);
      const actual = normalized(await readFile(path.join(committedRoot, name), "utf8"), name, false);
      if (expected !== actual) differences.push({ path: name, kind: "changed" });
    }
  }
  return differences;
}
