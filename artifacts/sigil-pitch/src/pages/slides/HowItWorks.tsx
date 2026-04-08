export default function HowItWorks() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#06040f" }}
    >
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 110%, rgba(139,92,246,0.08) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="absolute inset-0 flex flex-col" style={{ padding: "6vh 7vw" }}>

        <div style={{ marginBottom: "5vh" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.15vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "1.5vh" }}>
            How It Works
          </p>
          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.4vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0 }}>
            Paste. Stream. Understand.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw", flex: 1 }}>

          <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #8b5cf6, transparent)" }} />
            <div style={{ width: "7vh", height: "7vh", borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1.5px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "3vh", flexShrink: 0 }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#a78bfa" }}>01</span>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
              Paste
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0, marginBottom: "auto" }}>
              Drop in any Ethereum transaction hash or contract address. No wallet connection required. Sigil auto-detects the input type and fetches on-chain data immediately.
            </p>
            <div style={{ marginTop: "3vh", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: "0.6vw", padding: "1.5vh 1.2vw", fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(139,92,246,0.6)", lineHeight: 1.5 }}>
              0xa0b86991c6218b36c1d<br />
              19d4a2e9eb0ce3606eb48
            </div>
            <div style={{ marginTop: "1.5vh", display: "flex", gap: "0.8vw", flexWrap: "wrap" }}>
              {["Contract address", "Tx hash", "Wallet address"].map((t) => (
                <span key={t} style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95vw", color: "rgba(139,92,246,0.55)", background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "2vw", padding: "0.4vh 0.9vw", letterSpacing: "0.03em" }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #8b5cf6, #c084fc)" }} />
            <div style={{ width: "7vh", height: "7vh", borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1.5px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "3vh", flexShrink: 0 }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#a78bfa" }}>02</span>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
              Stream
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0, marginBottom: "auto" }}>
              Two-step chain-of-thought AI. Step 1 gathers 50+ on-chain signals — verdict and risk score appear in ~1 second. Step 2 streams a plain-English summary token by token.
            </p>
            <div style={{ marginTop: "3vh", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.4)" }}>Step 1 (~1s): Signals gathered, verdict appears</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.4)" }}>Step 2 (~1–4s): Summary streams token by token</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
                <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.4)" }}>Done: DB record saved, analysis ready to share</span>
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "1.2vw", padding: "3.5vh 2.5vw", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #c084fc)" }} />
            <div style={{ width: "7vh", height: "7vh", borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1.5px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "3vh", flexShrink: 0 }}>
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#a78bfa" }}>03</span>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
              Understand
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0, marginBottom: "auto" }}>
              Full decoded analysis: Safe / Caution / Dangerous verdict, 0–100 risk score, matched threat patterns, approval details with live USD value, contract reputation, and a shareable link.
            </p>
            <div style={{ marginTop: "3vh", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8vh 1vw" }}>
              {[
                { label: "Verdict", color: "#f87171" },
                { label: "Risk 0–100", color: "#f87171" },
                { label: "Patterns", color: "#a78bfa" },
                { label: "Approvals", color: "#a78bfa" },
                { label: "Reputation", color: "rgba(255,255,255,0.4)" },
                { label: "Share link", color: "rgba(255,255,255,0.4)" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
                  <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.45)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
