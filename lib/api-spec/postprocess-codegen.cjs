const fs = require("node:fs");
const path = require("node:path");

function postprocessCodegen(
  apiClientPath = path.resolve(__dirname, "..", "api-client-react", "src", "generated", "api.ts"),
  apiZodIndexPath = path.resolve(__dirname, "..", "api-zod", "src", "index.ts"),
) {
  let source = fs.readFileSync(apiClientPath, "utf8");

  source = source.replaceAll(
    "`/api/sigil/history/${id}`",
    "`/api/sigil/history?id=${encodeURIComponent(id)}`",
  );

  fs.writeFileSync(apiClientPath, source);
  fs.writeFileSync(apiZodIndexPath, 'export * from "./generated/api";\nexport * as ApiTypes from "./generated/types";\n');
}

module.exports = postprocessCodegen;
if (require.main === module) postprocessCodegen();
