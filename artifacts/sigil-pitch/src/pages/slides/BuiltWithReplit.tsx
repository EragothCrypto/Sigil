export default function BuiltWithReplit() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{ background: "#06040f", padding: "7vh 7vw" }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          right: 0,
          width: "55vw",
          height: "100vh",
          background: "radial-gradient(ellipse 70% 60% at 85% 30%, rgba(139,92,246,0.06) 0%, transparent 65%)",
          pointerEvents: "none"
        }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "2.5vh" }}>
          Built With Replit Agent 4
        </p>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.2vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
          Full stack. One session.
        </h2>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.45)", margin: 0, marginBottom: "6vh", maxWidth: "60vw", lineHeight: 1.5 }}>
          Sigil is a complete production-grade application — API server, React frontend, PostgreSQL database, blockchain integrations, and browser extension — built end-to-end using Replit Agent 4.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.8vw", marginBottom: "4vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "2.5vh 2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Backend</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              Express · TypeScript · PostgreSQL · Etherscan V2 API · Zod validation
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "2.5vh 2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Frontend</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              React · Vite · Tailwind · React Query · glassmorphism design system
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "2.5vh 2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 600, color: "#c084fc", marginBottom: "1.2vh" }}>Intelligence</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              OpenAI GPT · Pattern detection engine · Contract reputation scoring
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(139,92,246,0.07)",
            border: "1px solid rgba(139,92,246,0.18)",
            borderRadius: "12px",
            padding: "2.5vh 2.5vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.7vw", fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0 }}>
            The full product. Built by one developer. With one AI.
          </p>
          <div style={{ display: "flex", gap: "1vw", flexShrink: 0 }}>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              pnpm workspace
            </div>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              monorepo
            </div>
            <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px", padding: "0.6vh 1vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#c084fc" }}>
              Replit Deploy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
