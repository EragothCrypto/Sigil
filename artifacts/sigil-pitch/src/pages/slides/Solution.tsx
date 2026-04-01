const base = import.meta.env.BASE_URL;

export default function Solution() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{ background: "#06040f", padding: "7vh 7vw" }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(ellipse 60% 60% at 15% 80%, rgba(139,92,246,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", marginBottom: "2.5vh" }}>
          <img
            src={`${base}sigil-logo.png`}
            crossOrigin="anonymous"
            alt="Sigil"
            style={{ width: "2.5vw", height: "2.5vw", objectFit: "contain" }}
          />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
            The Solution
          </p>
        </div>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.2vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
          Sigil decodes any transaction
        </h2>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.45)", margin: 0, marginBottom: "6vh", maxWidth: "55vw" }}>
          Paste a transaction hash or contract address. Get plain-English explanations, risk scoring, and a clear verdict — instantly.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "3.5vh 2.2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6", marginBottom: "1.5vh" }}>
              Decode
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.8)", marginBottom: "1.2vh" }}>
              What does this actually do?
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              Method selectors, value flows, token approvals, and recipient addresses — translated to plain language.
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "3.5vh 2.2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6", marginBottom: "1.5vh" }}>
              Verify
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.8)", marginBottom: "1.2vh" }}>
              Who is behind this contract?
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              Known protocol recognition, reputation scoring, exploit history, and creator address patterns.
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "14px",
              padding: "3.5vh 2.2vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6", marginBottom: "1.5vh" }}>
              Decide
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.8)", marginBottom: "1.2vh" }}>
              Should I sign this?
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              AI risk verdict — Safe, Caution, or Dangerous — with a confidence score and detailed reasoning.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "4vh",
            padding: "2vh 2.5vw",
            background: "rgba(139,92,246,0.07)",
            border: "1px solid rgba(139,92,246,0.18)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "1.5vw"
          }}
        >
          <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Works with Ethereum transaction hashes, contract addresses, and EIP-712 permit signatures.
          </p>
        </div>
      </div>
    </div>
  );
}
