const incidents = [
  { name: "Bybit Cold Wallet", amount: "$1.5B", year: "2025", actor: "Lazarus Group (DPRK)", vector: "Safe multisig UI injection", score: 97, verdict: "DANGEROUS", color: "#f87171" },
  { name: "Ronin Bridge", amount: "$625M", year: "2022", actor: "Lazarus Group (DPRK)", vector: "Validator key compromise", score: 95, verdict: "DANGEROUS", color: "#f87171" },
  { name: "Tornado Cash", amount: "$7.6B", year: "2019–2022", actor: "OFAC sanctioned", vector: "Crypto mixing / laundering", score: 96, verdict: "DANGEROUS", color: "#f87171" },
  { name: "Wormhole Bridge", amount: "$320M", year: "2022", actor: "Anonymous", vector: "Signature verification bypass", score: 91, verdict: "CRITICAL", color: "#fb923c" },
  { name: "Nomad Bridge", amount: "$190M", year: "2022", actor: "300+ wallets", vector: "Merkle root initialization bug", score: 90, verdict: "CRITICAL", color: "#fb923c" },
  { name: "Euler Finance", amount: "$197M", year: "2023", actor: "Anonymous (returned)", vector: "Flash loan health-check bypass", score: 86, verdict: "CRITICAL", color: "#fb923c" },
];

export default function HallOfShame() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "5vh 6.5vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 100%, rgba(248,113,113,0.06) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.6), transparent)" }}
      />

      <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "1.2vh" }}>
        <div style={{ width: "0.3vw", height: "3.5vh", background: "#f87171" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(248,113,113,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Real incidents · Real losses
        </span>
      </div>

      <div className="flex items-baseline gap-[2vw]" style={{ marginBottom: "3vh" }}>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "3.6vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", color: "#ffffff", margin: 0 }}>
          Hall of Shame
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.3)", margin: 0 }}>
          Sigil flags every one CRITICAL or DANGEROUS. All live in the feed.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vh 1.5vw", flex: 1 }}>
        {incidents.map((inc) => (
          <div key={inc.name} style={{ background: "rgba(248,113,113,0.04)", border: `1px solid ${inc.color}22`, borderRadius: "1.1vw", padding: "2vh 1.8vw", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${inc.color}, transparent)` }} />

            <div className="flex items-start justify-between" style={{ marginBottom: "1vh" }}>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#ffffff" }}>{inc.name}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3vh", flexShrink: 0, marginLeft: "0.8vw" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1vw", fontWeight: 800, color: inc.color, background: `${inc.color}14`, border: `1px solid ${inc.color}30`, borderRadius: "0.4vw", padding: "0.2vh 0.6vw", letterSpacing: "0.05em" }}>
                  {inc.verdict}
                </div>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: inc.color, lineHeight: 1 }}>
                  {inc.score}
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: inc.color, letterSpacing: "-0.02em", lineHeight: 1.0, marginBottom: "0.8vh" }}>
              {inc.amount}
            </div>

            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.3)", marginBottom: "1vh" }}>
              {inc.year} · {inc.actor}
            </div>

            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.95vw", color: `${inc.color}80`, background: "rgba(0,0,0,0.25)", borderRadius: "0.4vw", padding: "0.6vh 0.8vw", marginTop: "auto" }}>
              {inc.vector}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.5vh", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.18)", paddingTop: "1vh", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>All 6 contracts are live in Sigil's Hall of Shame — run any address and see the verdict yourself.</span>
        <span style={{ color: "rgba(248,113,113,0.35)", fontFamily: "'Courier New', monospace", fontSize: "0.95vw" }}>Total losses: $10.4B+</span>
      </div>
    </div>
  );
}
