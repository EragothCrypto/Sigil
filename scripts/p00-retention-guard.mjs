export function validateRetentionDrillUrl(value) {
  try {
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol)
      || url.hostname !== "127.0.0.1"
      || url.username !== "sigil_p00"
      || url.pathname !== "/sigil_p00_retention"
      || url.search || url.hash) throw new Error();
    return url;
  } catch {
    throw new Error("p00_retention_isolated_url_required");
  }
}
