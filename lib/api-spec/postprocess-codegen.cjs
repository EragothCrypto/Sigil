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
  // Preserve the existing history cache identity and empty-ID guard across Orval upgrades.
  source = source.replace(
    /export const getGetAnalysisByIdQueryKey = \(id:\s*string,?\s*\) => \{[\s\S]*?\n\s*\};?/,
    'export const getGetAnalysisByIdQueryKey = (id: string) => {\n  return [`/api/sigil/history`, id] as const;\n};',
  );
  source = source.replace('enabled: id !== null && id !== undefined,', 'enabled: !!id,');
  source = source.replace(/const withQueryKey = [\s\S]*?(?=export const getHealthCheckUrl)/, '');
  source = source.replaceAll(
    'return withQueryKey(query, queryOptions.queryKey);',
    'return { ...query, queryKey: queryOptions.queryKey };',
  );
  source = source.replace(
    /export const analyzeInput = async[\s\S]*?(?=export const getAnalyzeInputMutationKey)/,
    block => block.replace(/const getHeaders = [\s\S]*?(?=return customFetch)/, '')
      .replace('...getHeaders(options?.headers)', '...options?.headers'),
  );

  fs.writeFileSync(apiClientPath, source);
  fs.writeFileSync(apiZodIndexPath, 'export * from "./generated/api";\nexport * as ApiTypes from "./generated/types";\n');
}

module.exports = postprocessCodegen;
if (require.main === module) postprocessCodegen();
