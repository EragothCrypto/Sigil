const base = import.meta.env.BASE_URL;

export default function Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <div className="absolute" style={{ inset: 0, background: "radial-gradient(ellipse 65% 65% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.25), transparent)" }} />

      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ padding: "7vh 7vw" }}>
        <img
          src={`${base}sigil-logo.png`}
          crossOrigin="anonymous"
          alt="Sigil"
          style={{ width: "5vw", height: "5vw", objectFit: "contain", marginBottom: "3.5vh" }}
        />

        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "6vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "2.5vh", textAlign: "center" }}>
          Sigil
        </h1>

        <div style={{ width: "4vw", height: "2px", background: "linear-gradient(90deg, #8b5cf6, #c084fc)", marginBottom: "2.5vh" }} />

        <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 500, color: "rgba(255,255,255,0.7)", margin: 0, marginBottom: "2vh", textAlign: "center", letterSpacing: "-0.01em" }}>
          The Trust Layer of Web3
        </p>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.32)", margin: 0, textAlign: "center", lineHeight: 1.7, maxWidth: "50vw", marginBottom: "6vh" }}>
          Web3 moves fast. Scammers move faster.
          <span style={{ display: "block" }}>Sigil gives every user the ability to understand exactly what they are authorizing — before it's too late.</span>
        </p>

        <div style={{ padding: "1.2vh 2.5vw", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: "2vw", fontFamily: "Space Grotesk, sans-serif", fontSize: "1.35vw", fontWeight: 600, color: "#a78bfa", letterSpacing: "0.04em", marginBottom: "5vh" }}>
          Week 3 Complete
        </div>

        <div style={{ display: "flex", gap: "2vw" }}>
          <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "0.6vw", padding: "1.2vh 1.8vw", fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
            Streaming AI
          </div>
          <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "0.6vw", padding: "1.2vh 1.8vw", fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
            Hall of Shame
          </div>
          <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "0.6vw", padding: "1.2vh 1.8vw", fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
            Response Cache
          </div>
          <div style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "0.6vw", padding: "1.2vh 1.8vw", fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>
            Two-Step AI
          </div>
        </div>
      </div>
    </div>
  );
}
