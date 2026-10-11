import app from "../../api-server/dist/app.mjs";

export default function handler(req, res) {
  const url = new URL(req.url || "/api", "http://localhost");
  if (url.searchParams.get("solanaWalletCheck") === "1") {
    url.searchParams.delete("solanaWalletCheck");
    req.url = `/api/sigil/monitor/v2/solana/scan${url.search}`;
    return app(req, res);
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
