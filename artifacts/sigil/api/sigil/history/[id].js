import app from "../../../../api-server/dist/app.mjs";

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function extractHistoryId(req) {
  const queryId = first(req.query?.id);
  if (queryId) return String(queryId);

  const pathname = String(req.url ?? "").split("?")[0] ?? "";
  const lastSegment = pathname.split("/").filter(Boolean).at(-1);
  if (lastSegment && lastSegment !== "history" && lastSegment !== "sigil" && lastSegment !== "api") {
    return decodeURIComponent(lastSegment);
  }

  return "__missing__";
}

export default function handler(req, res) {
  const id = extractHistoryId(req);
  const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  req.url = `/api/sigil/history/${encodeURIComponent(id)}${query}`;
  return app(req, res);
}
