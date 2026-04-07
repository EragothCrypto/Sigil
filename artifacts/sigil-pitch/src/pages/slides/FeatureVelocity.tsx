export default function FeatureVelocity() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "6vh 7vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 60%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "1.5vh" }}>
        <div style={{ width: "0.3vw", height: "3.5vh", background: "#8b5cf6" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(139,92,246,0.75)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Development Velocity
        </span>
      </div>

      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "3.8vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "0.8vh" }}>
        Three Weeks. Full Stack.
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.38)", margin: 0, marginBottom: "3vh" }}>
        Every feature built end-to-end in a single Replit Agent 4 session — DB migrations, streaming endpoints, and all.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vw", flex: 1 }}>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.2vw", padding: "2.5vh 2vw", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6vh" }}>Week 1</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: "2.5vh" }}>Foundation</div>
          <div className="flex flex-col gap-[1.4vh]" style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Risk Score (0–100)</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Pattern Detection Engine</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Approval Inspector</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Known Entity Recognition</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Contract Reputation Score</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.45)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(255,255,255,0.12)" }}>Transaction Breakdown</div>
          </div>
          <div style={{ marginTop: "2vh", padding: "0.8vh 1.2vw", background: "rgba(255,255,255,0.04)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
            6 features shipped
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.2vw", padding: "2.5vh 2vw", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6vh" }}>Week 2</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: "2.5vh" }}>Intelligence</div>
          <div className="flex flex-col gap-[1.4vh]" style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Two-step AI Chain-of-Thought</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Response Caching (LRU + TTL)</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Jargon Tooltips</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Token USD Dollar Values</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Contract Diff View</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", paddingLeft: "1.2vw", borderLeft: "2px solid rgba(139,92,246,0.3)" }}>Share Button</div>
          </div>
          <div style={{ marginTop: "2vh", padding: "0.8vh 1.2vw", background: "rgba(139,92,246,0.07)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(139,92,246,0.5)", textAlign: "center" }}>
            6 features shipped
          </div>
        </div>

        <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "1.2vw", padding: "2.5vh 2vw", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(139,92,246,0.6)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6vh" }}>Week 3</div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#a78bfa", marginBottom: "2.5vh" }}>Experience</div>
          <div className="flex flex-col gap-[1.4vh]" style={{ flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.65)", paddingLeft: "1.2vw", borderLeft: "2px solid #8b5cf6" }}>Streaming AI Responses</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.65)", paddingLeft: "1.2vw", borderLeft: "2px solid #8b5cf6" }}>Hall of Shame Feed</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.65)", paddingLeft: "1.2vw", borderLeft: "2px solid #8b5cf6" }}>Live Signal Preview</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.65)", paddingLeft: "1.2vw", borderLeft: "2px solid #8b5cf6" }}>Blinking Cursor UX</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.65)", paddingLeft: "1.2vw", borderLeft: "2px solid #8b5cf6" }}>Step-2 Prompt Restructure</div>
          </div>
          <div style={{ marginTop: "2vh", padding: "0.8vh 1.2vw", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#a78bfa", textAlign: "center" }}>
            5 features shipped — this week
          </div>
        </div>

      </div>
    </div>
  );
}
