import app from "../../../api-server/dist/app.mjs";

export default function handler(req, res) {
  const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  req.url = `/api/sigil/analyze-stream${query}`;
  return app(req, res);
}
