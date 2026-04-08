const base = import.meta.env.BASE_URL;

const stats = [
  { value: "17", label: "Features shipped" },
  { value: "3", label: "Weeks to build" },
  { value: "10", label: "EVM chains" },
  { value: "50+", label: "Risk signals" },
];

const techStack = [
  "React + Vite",
  "Express + PostgreSQL",
  "Drizzle ORM",
  "GPT-5.2 CoT",
  "SSE streaming",
  "CoinGecko prices",
  "Etherscan V2",
  "pnpm monorepo",
];

export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 30% 50%, rgba(139,92,246,0.09) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 80% 60%, rgba(192,132,252,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.55), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)" }} />

      <div className="absolute inset-0 flex" style={{ padding: "7vh 7vw" }}>

        <div style={{ width: "50%", paddingRight: "5vw", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.2vw", marginBottom: "3.5vh" }}>
            <img
              src={`${base}sigil-logo.png`}
              crossOrigin="anonymous"
              alt="Sigil"
              style={{ width: "4vw", height: "4vw", objectFit: "contain" }}
            />
            <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.2vw", fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.35em", textTransform: "uppercase" }}>
              Sigil
            </span>
          </div>

          <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.5vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
            The Trust Layer<br />
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>of Web3.</span>
          </h1>

          <div style={{ width: "4vw", height: "2px", background: "linear-gradient(90deg, #8b5cf6, #c084fc)", marginBottom: "2.5vh" }} />

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0, marginBottom: "5vh" }}>
            Web3 moves fast. Scammers move faster.<br />
            Sigil gives every user the ability to understand exactly what they are authorizing — before it's too late.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ padding: "1.4vh 2vw", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)", borderRadius: "0.8vw", display: "inline-flex", alignItems: "center", gap: "0.8vw", width: "fit-content" }}>
              <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#a78bfa" }} />
              <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.2vw", fontWeight: 600, color: "#a78bfa", letterSpacing: "0.04em" }}>
                Hackathon — Week 3 Complete
              </span>
            </div>
          </div>
        </div>

        <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5vh" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vh 2vw" }}>
            {stats.map(({ value, label }) => (
              <div key={label} style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: "1vw", padding: "3vh 2vw" }}>
                <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 800, color: "#a78bfa", lineHeight: 1, letterSpacing: "-0.03em" }}>
                  {value}
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.35)", marginTop: "0.8vh", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1vw", padding: "2.5vh 2vw" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.95vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Full Stack · One Conversation
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7vh 0.8vw" }}>
              {techStack.map((t) => (
                <span key={t} style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.38)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "2vw", padding: "0.4vh 0.9vw" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "1vw", padding: "2vh 2vw", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)" }}>
              Built end-to-end with Replit Agent 4
            </span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: "1.05vw", color: "rgba(139,92,246,0.55)", letterSpacing: "0.05em" }}>
              0 lines written by hand
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
