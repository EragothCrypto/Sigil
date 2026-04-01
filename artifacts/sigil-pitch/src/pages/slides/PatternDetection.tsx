export default function PatternDetection() {
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
          width: "50vw",
          height: "100vh",
          background: "radial-gradient(ellipse 80% 60% at 80% 40%, rgba(139,92,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none"
        }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "2.5vh" }}>
          Signature Feature
        </p>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
          Pattern Detection Engine
        </h2>

        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.45)", margin: 0, marginBottom: "5vh", maxWidth: "58vw" }}>
          Two detection layers — static signature matching and contextual AI analysis — to catch drainers, honeypots, and rug pulls before you sign.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.6vw", marginBottom: "4vh" }}>
          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.14)",
              borderRadius: "12px",
              padding: "2.8vh 2.2vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vh"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.4vw", fontWeight: 600, color: "#f43f5e" }}>
              Wallet Drainer
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Detects setApprovalForAll, permitAll, and drainer-specific method selectors used in phishing campaigns.
            </div>
          </div>

          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.14)",
              borderRadius: "12px",
              padding: "2.8vh 2.2vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vh"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.4vw", fontWeight: 600, color: "#f43f5e" }}>
              Honeypot Token
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Identifies tokens where buys succeed but sells are blocked — a classic rug pull setup.
            </div>
          </div>

          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.14)",
              borderRadius: "12px",
              padding: "2.8vh 2.2vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vh"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.4vw", fontWeight: 600, color: "#fb923c" }}>
              Fake Approval
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Flags EIP-712 permit signatures crafted to drain tokens silently through hidden delegated transfers.
            </div>
          </div>

          <div
            style={{
              background: "rgba(244,63,94,0.06)",
              border: "1px solid rgba(244,63,94,0.14)",
              borderRadius: "12px",
              padding: "2.8vh 2.2vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vh"
            }}
          >
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.4vw", fontWeight: 600, color: "#fb923c" }}>
              Rug Pull
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
              Spots selfdestruct, ownership transfer abuse, and contracts with no liquidity lock.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.6vw" }}>
          <div
            style={{
              background: "rgba(139,92,246,0.07)",
              border: "1px solid rgba(139,92,246,0.18)",
              borderRadius: "10px",
              padding: "2vh 2.2vw",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.2vw"
            }}
          >
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#8b5cf6", flexShrink: 0, marginTop: "0.8vh" }} />
            <div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.2vw", fontWeight: 600, color: "#c084fc", marginBottom: "0.5vh" }}>Layer 1: Static Signatures</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)" }}>Method selectors, known ABI patterns, and bytecode fingerprints checked against a threat database.</div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(139,92,246,0.07)",
              border: "1px solid rgba(139,92,246,0.18)",
              borderRadius: "10px",
              padding: "2vh 2.2vw",
              display: "flex",
              alignItems: "flex-start",
              gap: "1.2vw"
            }}
          >
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#8b5cf6", flexShrink: 0, marginTop: "0.8vh" }} />
            <div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.2vw", fontWeight: 600, color: "#c084fc", marginBottom: "0.5vh" }}>Layer 2: Contextual AI</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)" }}>AI analysis of intent, behavior, and context — surfacing patterns invisible to signature matching alone.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
