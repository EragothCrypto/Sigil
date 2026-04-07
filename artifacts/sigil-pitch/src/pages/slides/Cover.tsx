const base = import.meta.env.BASE_URL;

export default function Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        alt="Dark abstract background"
        style={{ opacity: 0.55 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(6,4,15,0.97) 0%, rgba(6,4,15,0.55) 55%, rgba(6,4,15,0.92) 100%)" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="absolute top-[4vh] right-[4vw] flex items-center gap-[0.6vw]">
        <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#8b5cf6" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Week 3 · Replit Agent 4 Buildathon
        </span>
      </div>

      <div className="absolute inset-0 flex flex-col justify-center" style={{ paddingLeft: "7vw", paddingRight: "38vw" }}>
        <div className="flex items-center gap-[1.2vw]" style={{ marginBottom: "2.5vh" }}>
          <img
            src={`${base}sigil-logo.png`}
            crossOrigin="anonymous"
            alt="Sigil"
            style={{ width: "3.2vw", height: "3.2vw", objectFit: "contain" }}
          />
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.2vw", fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.35em", textTransform: "uppercase" }}>
            Sigil
          </span>
        </div>

        <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "6.5vw", fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "2.5vh" }}>
          The Trust Layer
          <br />
          of Web3
        </h1>

        <div style={{ width: "4vw", height: "2px", background: "#8b5cf6", marginBottom: "2.5vh" }} />

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.8vw", fontWeight: 400, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0, marginBottom: "4vh" }}>
          Know what you're signing.
          <br />
          Every time.
        </p>

        <div className="flex items-center gap-[1vw]">
          <div style={{ padding: "0.8vh 1.2vw", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#a78bfa", letterSpacing: "0.04em" }}>
            Now Streaming
          </div>
          <div style={{ padding: "0.8vh 1.2vw", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "#fca5a5", letterSpacing: "0.04em" }}>
            Hall of Shame
          </div>
          <div style={{ padding: "0.8vh 1.2vw", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.6vw", fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
            Response Cache
          </div>
        </div>
      </div>

      <div
        className="absolute"
        style={{
          right: "6vw",
          top: "50%",
          transform: "translateY(-50%)",
          width: "22vw",
          height: "22vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          border: "1px solid rgba(139,92,246,0.1)"
        }}
      />

      <div className="absolute bottom-[4vh] left-[7vw] flex items-center gap-[2vw]">
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
          Transaction Decoder
        </span>
        <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(139,92,246,0.5)" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
          Web3 Security
        </span>
        <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(139,92,246,0.5)" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
          Pattern Detection
        </span>
        <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "rgba(139,92,246,0.5)" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
          Multi-chain
        </span>
      </div>
    </div>
  );
}
