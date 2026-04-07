export default function HowItWorks() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{ background: "#06040f", padding: "7vh 7vw" }}
    >
      <div
        className="absolute"
        style={{ bottom: 0, left: 0, right: 0, height: "40vh", background: "linear-gradient(to top, rgba(139,92,246,0.04) 0%, transparent 100%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", fontWeight: 500, color: "rgba(139,92,246,0.8)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0, marginBottom: "2vh" }}>
          How It Works
        </p>

        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.2vw", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#ffffff", margin: 0, marginBottom: "7vh" }}>
          Paste. Stream. Understand.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0", position: "relative" }}>
          <div
            className="absolute"
            style={{ top: "4.5vh", left: "17%", right: "17%", height: "1px", background: "linear-gradient(90deg, rgba(139,92,246,0.4), rgba(139,92,246,0.4))" }}
          />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: "3vw" }}>
            <div style={{ marginBottom: "3.5vh" }}>
              <div style={{ width: "9vh", height: "9vh", borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6" }}>01</span>
              </div>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
              Paste
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
              Drop in any Ethereum transaction hash or contract address. No wallet connection required. Sigil detects the input type and fetches on-chain data immediately.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", paddingRight: "3vw" }}>
            <div style={{ marginBottom: "3.5vh" }}>
              <div style={{ width: "9vh", height: "9vh", borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6" }}>02</span>
              </div>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
              Stream
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
              Step 1 gathers signals and surfaces the verdict badge and risk score in ~1 second. Step 2 streams the plain-English summary live, token by token, with a blinking cursor.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ marginBottom: "3.5vh" }}>
              <div style={{ width: "9vh", height: "9vh", borderRadius: "50%", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#8b5cf6" }}>03</span>
              </div>
            </div>
            <h3 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#ffffff", margin: 0, marginBottom: "1.5vh" }}>
              Understand
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>
              Full analysis: Safe/Caution/Dangerous verdict, 0–100 risk score, matched threat patterns, approval details with USD value, contract reputation, and a share link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
