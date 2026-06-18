const fs = require("node:fs");
const path = require("node:path");

const apiClientPath = path.resolve(__dirname, "..", "api-client-react", "src", "generated", "api.ts");
let source = fs.readFileSync(apiClientPath, "utf8");

source = source
  .replace(
    "return `/api/sigil/history/${id}`;",
    "return `/api/sigil/history?id=${encodeURIComponent(id)}`;",
  )
  .replace(
    "return [`/api/sigil/history/${id}`] as const;",
    "return [`/api/sigil/history`, id] as const;",
  );

fs.writeFileSync(apiClientPath, source);
