export default function Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{
        background: "#06040f",
        padding: "7vh 7vw"
      }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(244,63,94,0.06) 0%, transparent 70%)",
          pointerEvents: "none"
        }}
      />
      <div
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)", marginBottom: "6vh" }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(244,63,94,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "2.5vh" }}>
          The Problem
        </p>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.8vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "2vh" }}>
          You can't read what<br />you're signing
        </h2>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.7vw", fontWeight: 400, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0, marginBottom: "7vh", maxWidth: "60vw" }}>
          Blockchain transactions are machine-readable bytecode.
          They were never designed for human eyes.
          Scammers built their entire business on this gap.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw" }}>
          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.15)",
              borderRadius: "12px",
              padding: "3.5vh 2.5vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.5vw", fontWeight: 700, color: "#f43f5e", lineHeight: 1.0, marginBottom: "1.5vh" }}>
              $3.8B
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.8vh" }}>
              Lost to crypto scams
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.3)" }}>
              in 2023 alone
            </div>
          </div>

          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.15)",
              borderRadius: "12px",
              padding: "3.5vh 2.5vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.5vw", fontWeight: 700, color: "#f43f5e", lineHeight: 1.0, marginBottom: "1.5vh" }}>
              324K
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.8vh" }}>
              Wallets drained
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.3)" }}>
              by phishing kits in 2023
            </div>
          </div>

          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.15)",
              borderRadius: "12px",
              padding: "3.5vh 2.5vw"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.5vw", fontWeight: 700, color: "#f43f5e", lineHeight: 1.0, marginBottom: "1.5vh" }}>
              $300M+
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.7)", marginBottom: "0.8vh" }}>
              From drainer toolkits
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.3)" }}>
              specifically targeting approvals
            </div>
          </div>
        </div>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.25)", marginTop: "3vh", margin: "3vh 0 0 0" }}>
          Sources: Chainalysis 2024 Crypto Crime Report · ScamSniffer 2023 Web3 Security Report
        </p>
      </div>
    </div>
  );
}
