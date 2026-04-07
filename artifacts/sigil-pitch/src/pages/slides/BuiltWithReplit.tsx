export default function BuiltWithReplit() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "6.5vh 7vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 60% 60% at 90% 30%, rgba(139,92,246,0.06) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "2vh" }}>
          Built With Replit Agent 4
        </p>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
          Full stack. One conversation.
        </h2>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)", margin: 0, marginBottom: "4.5vh", maxWidth: "60vw", lineHeight: 1.55 }}>
          Every line — streaming SSE endpoints, DB schema migrations, TypeScript monorepo, OpenAI integration, and this pitch deck — built end-to-end by Replit Agent 4.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vw", marginBottom: "3vh" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Backend</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
              Express · TypeScript · PostgreSQL · Drizzle ORM · Etherscan V2 · SSE streaming
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Frontend</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
              React · Vite · Tailwind CSS · React Query · Framer Motion · glassmorphism
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Intelligence</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
              GPT-5.2 · Two-step CoT · LRU cache · Pattern engine · CoinGecko pricing
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "1vw", padding: "2.2vh 2.5vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.65vw", fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: 0 }}>
            17 features. 3 weeks. One AI. Zero manual wiring.
          </p>
          <div style={{ display: "flex", gap: "0.8vw", flexShrink: 0 }}>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "0.5vw", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              pnpm workspace
            </div>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "0.5vw", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              DB migrations live
            </div>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "0.5vw", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              Replit Deploy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
