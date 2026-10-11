import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "../node_modules/typescript/lib/typescript.js";
import { generate } from "../lib/api-spec/node_modules/orval/dist/index.mjs";
import { compareGeneratedTrees } from "./codegen-drift.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const specRoot = path.join(root, "lib/api-spec");
const configFile = path.join(specRoot, "orval.config.ts");
const source = ts.transpileModule(await readFile(configFile, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const exports = {};
vm.runInNewContext(source, {
  exports, __dirname: specRoot,
  require: (name) => name === "orval" ? { defineConfig: (config) => config } : require(name),
});
const config = exports.default;
config["api-client-react"].output.workspace = path.join(root, "lib/api-client-react/tmp/codegen");
config.zod.output.workspace = path.join(root, "lib/api-zod/tmp/codegen");
for (const options of Object.values(config)) await generate(options, specRoot);
require("../lib/api-spec/postprocess-codegen.cjs")(
  path.join(config["api-client-react"].output.workspace, "generated/api.ts"),
  path.join(config.zod.output.workspace, "index.ts"),
);

async function collect(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collect(file));
    else if (file.endsWith(".ts")) files.push(file);
  }
  return files;
}

for (const packageName of ["api-client-react", "api-zod"]) {
  const packageRoot = path.join(root, "lib", packageName);
  const configPath = path.join(packageRoot, "tsconfig.json");
  const base = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(base.config, ts.sys, packageRoot);
  const files = await collect(path.join(packageRoot, "tmp/codegen"));
  const program = ts.createProgram(files, {
    ...parsed.options, rootDir: root, noEmit: true, composite: false, incremental: false,
    declaration: false, declarationMap: false, emitDeclarationOnly: false,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => "\n",
    }));
  }
  console.log(`${packageName}: isolated generated output typechecks`);
}
const record = await readFile(path.join(config.zod.output.workspace, "generated/types/analysisRecord.ts"), "utf8");
assert.match(record, /input:\s*string/);
const client = await readFile(path.join(config["api-client-react"].output.workspace, "generated/api.ts"), "utf8");
assert.ok(client.includes("`/api/sigil/history?id=${encodeURIComponent(id)}`"));
assert.ok(!client.includes("`/api/sigil/history/${id}`"));
for (const packageName of ["api-client-react", "api-zod"]) {
  const packageRoot = path.join(root, "lib", packageName);
  const drift = await compareGeneratedTrees(
    path.join(packageRoot, "tmp/codegen/generated"),
    path.join(packageRoot, "src/generated"),
    { relocatedMutator: packageName === "api-client-react" },
  );
  assert.deepEqual(drift, [], `${packageName}: generated output drift (paths only)`);
}
const generatedIndex = await readFile(path.join(config.zod.output.workspace, "index.ts"), "utf8");
const committedIndex = await readFile(path.join(root, "lib/api-zod/src/index.ts"), "utf8");
assert.equal(generatedIndex.replace(/\r\n/g, "\n"), committedIndex.replace(/\r\n/g, "\n"), "api-zod: generated export index drift");
console.log("All generated trees and Zod index match; required input/history retained; committed files were not modified");
