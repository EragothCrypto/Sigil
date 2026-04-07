const base = import.meta.env.BASE_URL;

export default function Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "6vh 7vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 60% 60% at 10% 80%, rgba(139,92,246,0.07) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="flex items-center gap-[1.5vw]" style={{ marginBottom: "1.5vh" }}>
        <img src={`${base}sigil-logo.png`} crossOrigin="anonymous" alt="Sigil" style={{ width: "2.2vw", height: "2.2vw", objectFit: "contain" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(139,92,246,0.8)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          The Solution
        </span>
      </div>

      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "3.8vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "0.8vh" }}>
        Sigil's Complete Security Stack
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.38)", margin: 0, marginBottom: "3.5vh" }}>
        10 interlocking features built across 3 weeks — shipping as a single coherent product.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5vh 1.5vw", flex: 1 }}>

        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#a78bfa", marginBottom: "0.8vh" }}>Streaming AI</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            Verdict badge and risk score appear in ~1s. Summary streams token by token.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(139,92,246,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 3</div>
        </div>

        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#fca5a5", marginBottom: "0.8vh" }}>Hall of Shame</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            6 curated infamous exploits ($2.8B+). Flagged CRITICAL by Sigil.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(248,113,113,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 3</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Two-Step AI</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            Chain-of-thought analysis. Signals committed before verdict. Zero hallucinations.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 2</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Response Cache</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            LRU + TTL cache. Instant results for repeat queries. No AI cost.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 2</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Risk Score</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            0–100 with factor breakdown. Approval scope, reputation, pattern evidence.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 1</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Pattern Detection</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            2-layer: static ABI signatures + GPT-5.2 contextual analysis.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 1</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Approval Inspector</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            Spender identity, USD dollar value, unlimited flag, prior approval history.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 1</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2vh 1.8vw" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.8vh" }}>Reputation Score</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
            Contract age, verification, exploit history — a credit score for smart contracts.
          </div>
          <div style={{ marginTop: "1vh", fontFamily: "Inter, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Week 1</div>
        </div>

      </div>
    </div>
  );
}
