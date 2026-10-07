import app from "../../../api-server/dist/app.mjs";

export default function handler(req, res) {
  const url = new URL(req.url || "/api/sigil/simulate", "http://localhost");
  // Support both original and rewritten URLs without adding a serverless function.
  const v2 = url.pathname === "/api/sigil/simulate-v2"
    || url.searchParams.get("executionCheckVersion") === "2";
  url.searchParams.delete("executionCheckVersion");
  req.url = `/api/sigil/${v2 ? "simulate-v2" : "simulate"}${url.search}`;
  return app(req, res);
}
