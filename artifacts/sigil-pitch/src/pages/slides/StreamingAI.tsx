export default function StreamingAI() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 55% 70% at 75% 50%, rgba(139,92,246,0.09) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "7vh 7vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "42%", paddingRight: "4vw" }}>
          <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "2.5vh" }}>
            <div style={{ width: "0.3vw", height: "3.5vh", background: "#8b5cf6" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(139,92,246,0.75)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Week 3 Feature
            </span>
          </div>

          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "2.5vh" }}>
            Streaming AI
            <span style={{ display: "block", fontSize: "3.2vw", color: "#a78bfa" }}>Live Verdicts</span>
          </h2>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0, marginBottom: "4vh" }}>
            The 5-8 second loading spinner was the biggest first impression problem. Now analysis streams live — verdict and score appear within 1 second, summary follows token by token.
          </p>

          <div className="flex flex-col gap-[1.5vh]">
            <div className="flex items-start gap-[1vw]">
              <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#8b5cf6", marginTop: "0.7vh", flexShrink: 0 }} />
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>Step 1 (~1s):</span> On-chain signals gathered, score ring and verdict badge appear instantly
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#8b5cf6", marginTop: "0.7vh", flexShrink: 0 }} />
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>Step 2 (~1-4s):</span> Summary prose streams token by token with a blinking cursor
              </div>
            </div>
            <div className="flex items-start gap-[1vw]">
              <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#8b5cf6", marginTop: "0.7vh", flexShrink: 0 }} />
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                <span style={{ color: "#c4b5fd", fontWeight: 600 }}>Done:</span> Seamless redirect — DB record saved, full analysis ready
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ width: "58%" }}>
          <div
            style={{
              background: "rgba(10,6,24,0.95)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "1.5vw",
              padding: "3vh 2.5vw",
              boxShadow: "0 0 0 1px rgba(139,92,246,0.08), 0 20px 60px rgba(139,92,246,0.12)"
            }}
          >
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)", marginBottom: "2.5vh" }} />

            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: "2vh" }}>
              Sigil Security Engine
            </div>

            <div className="flex gap-[0.8vw]" style={{ marginBottom: "2.5vh" }}>
              <div style={{ padding: "0.6vh 1.2vw", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "2vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(52,211,153,0.75)" }}>
                ✓  Gather signals
              </div>
              <div style={{ padding: "0.6vh 1.2vw", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "2vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#a78bfa" }}>
                → Generating verdict
              </div>
            </div>

            <div className="flex items-center gap-[2.5vw]" style={{ marginBottom: "2.5vh" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="44" cy="44" r="36" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                  <circle cx="44" cy="44" r="36" stroke="#f87171" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="226" strokeDashoffset="29" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#ffffff", lineHeight: 1 }}>87</span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Risk</span>
                </div>
              </div>

              <div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.8vw", padding: "0.8vh 1.5vw", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "0.8vw", marginBottom: "1vh" }}>
                  <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#f87171" }}>DANGEROUS</span>
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.3)" }}>
                  4 security signals identified
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.8vw", padding: "1.8vh 1.8vw" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: 0 }}>
                This contract requests unlimited USDC approval for an unverified address deployed 3 days ago — meaning the recipient could drain your entire USDC balance at any time without further
                <span style={{ display: "inline-block", width: "2px", height: "1.4vw", background: "#8b5cf6", marginLeft: "3px", verticalAlign: "middle" }} />
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
