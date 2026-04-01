const base = import.meta.env.BASE_URL;

export default function Closing() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#06040f" }}
    >
      <div
        className="absolute"
        style={{
          inset: 0,
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 70%)"
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)"
        }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ padding: "7vh 7vw" }}
      >
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

        <p style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 500, color: "rgba(255,255,255,0.7)", margin: 0, marginBottom: "5vh", textAlign: "center", letterSpacing: "-0.01em" }}>
          The Trust Layer of Web3
        </p>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.35)", margin: 0, textAlign: "center", lineHeight: 1.7, maxWidth: "50vw" }}>
          Web3 moves fast. Scammers move faster.<br />
          Sigil gives every user the ability to understand<br />
          exactly what they are authorizing — before it's too late.
        </p>

        <div style={{ display: "flex", gap: "2vw", marginTop: "6vh" }}>
          <div
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "8px",
              padding: "1.2vh 2vw",
              fontFamily: "Inter, sans-serif",
              fontSize: "1.2vw",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em"
            }}
          >
            Transaction Decoder
          </div>
          <div
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "8px",
              padding: "1.2vh 2vw",
              fontFamily: "Inter, sans-serif",
              fontSize: "1.2vw",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em"
            }}
          >
            Web3 Security
          </div>
          <div
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "8px",
              padding: "1.2vh 2vw",
              fontFamily: "Inter, sans-serif",
              fontSize: "1.2vw",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.05em"
            }}
          >
            Replit Agent 4 Hackathon
          </div>
        </div>
      </div>
    </div>
  );
}
