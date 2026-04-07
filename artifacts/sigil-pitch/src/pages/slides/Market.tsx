export default function Market() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 65% 55% at 15% 55%, rgba(139,92,246,0.07) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "7vh 7vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "45%", paddingRight: "4vw" }}>
          <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "2.5vh" }}>
            <div style={{ width: "0.3vw", height: "3.5vh", background: "#8b5cf6" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(139,92,246,0.75)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              The Opportunity
            </span>
          </div>

          <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "2.5vh" }}>
            A massive problem
            <span style={{ display: "block", color: "#a78bfa" }}>with no standard fix.</span>
          </h2>

          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0, marginBottom: "3vh" }}>
            Half a billion people hold crypto. None of their wallets explain what a transaction does before they sign it. Sigil is the missing safety layer.
          </p>

          <div style={{ padding: "2.2vh 2vw", background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "1.2vw" }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)", marginBottom: "0.8vh" }}>Near-term vision</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
              Browser extension for sign-time alerts · Mobile wallet SDK · Institutional risk API for exchanges and custodians
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[2.5vh] justify-center" style={{ width: "55%", paddingLeft: "2vw" }}>

          <div style={{ padding: "3.5vh 2.5vw", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.14)", borderRadius: "1.2vw" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.5vw", fontWeight: 800, color: "#f87171", letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: "0.8vh" }}>$5.6B</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4vw", fontWeight: 500, color: "rgba(255,255,255,0.65)", marginBottom: "0.4vh" }}>Lost to crypto phishing in 2023</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.28)" }}>FBI IC3 2023 Internet Crime Report</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw" }}>
            <div style={{ padding: "2.5vh 2vw", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.2vw" }}>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 800, color: "#a78bfa", letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: "0.8vh" }}>500M+</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "0.4vh" }}>Active crypto wallets</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.25)" }}>globally — each a potential target</div>
            </div>

            <div style={{ padding: "2.5vh 2vw", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.2vw" }}>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4vw", fontWeight: 800, color: "#a78bfa", letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: "0.8vh" }}>$200B+</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.3vw", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "0.4vh" }}>DeFi total value locked</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.25)" }}>protected by opaque smart contracts</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
