export default function HallOfShame() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "5.5vh 7vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 55% 50% at 50% 100%, rgba(248,113,113,0.05) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.55), transparent)" }}
      />

      <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "1.5vh" }}>
        <div style={{ width: "0.3vw", height: "3.5vh", background: "#f87171" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(248,113,113,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Real incidents · Real losses
        </span>
      </div>

      <div className="flex items-baseline gap-[2vw]" style={{ marginBottom: "1.2vh" }}>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "3.8vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", color: "#ffffff", margin: 0 }}>
          Hall of Shame
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Sigil scores every one of these CRITICAL — DANGEROUS verdict.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vh 1.5vw", flex: 1 }}>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Bybit Cold Wallet</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#f87171", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$1.5B</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2025 · Lazarus Group (DPRK)</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(248,113,113,0.55)", marginTop: "0.4vh" }}>Safe multisig UI injection</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Ronin Bridge</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#f87171", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$625M</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2022 · Lazarus Group (DPRK)</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(248,113,113,0.55)", marginTop: "0.4vh" }}>Validator key compromise</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Tornado Cash</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#f87171", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$7.6B</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2019-2022 · OFAC sanctioned</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(248,113,113,0.55)", marginTop: "0.4vh" }}>Crypto mixing / laundering</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Wormhole Bridge</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#fb923c", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$320M</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2022 · Anonymous</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(251,146,60,0.55)", marginTop: "0.4vh" }}>Signature verification bypass</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Nomad Bridge</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#fb923c", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$190M</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2022 · 300+ wallets</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(251,146,60,0.55)", marginTop: "0.4vh" }}>Merkle root initialization bug</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.16)", borderRadius: "1.1vw", padding: "2.2vh 1.8vw", display: "flex", flexDirection: "column", gap: "0.6vh" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#ffffff" }}>Euler Finance</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#fb923c", letterSpacing: "-0.02em", lineHeight: 1.0 }}>$197M</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.3)" }}>2023 · Anonymous (returned)</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(251,146,60,0.55)", marginTop: "0.4vh" }}>Flash loan health-check bypass</div>
        </div>

      </div>

      <div style={{ marginTop: "1.5vh", fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.2)", paddingTop: "1vh", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        All 6 contracts are live in Sigil's Hall of Shame feed — click any to view the full risk analysis.
      </div>
    </div>
  );
}
