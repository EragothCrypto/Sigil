export default function Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#06040f" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 70% 50% at 85% 50%, rgba(248,113,113,0.05) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(248,113,113,0.5), transparent)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "7vh 7vw" }}>

        <div className="flex flex-col justify-between" style={{ width: "42%", paddingRight: "4vw" }}>
          <div>
            <div className="flex items-center gap-[0.8vw]" style={{ marginBottom: "2.5vh" }}>
              <div style={{ width: "0.3vw", height: "3.5vh", background: "#f87171" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(248,113,113,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                The Problem
              </span>
            </div>

            <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "4.2vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "3vh" }}>
              You can't read
              <span style={{ display: "block", color: "#f87171" }}>what you're signing.</span>
            </h2>

            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>
              Every wallet shows the same thing: a hex string and a Confirm button. Users have no idea what they're approving.
            </p>
          </div>

          <div style={{ padding: "2.5vh 2vw", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: "1.2vw" }}>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "5.2vw", fontWeight: 800, color: "#f87171", letterSpacing: "-0.03em", lineHeight: 1.0, marginBottom: "0.8vh" }}>
              $5.6B
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              stolen via crypto phishing and approval exploits in 2023 alone
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(248,113,113,0.45)", marginTop: "0.8vh" }}>
              FBI IC3 2023 Internet Crime Report
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[2vh]" style={{ width: "58%", paddingLeft: "2vw" }}>

          <div style={{ padding: "2.8vh 2.5vw", background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.1)", borderRadius: "1.2vw", flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(248,113,113,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              What wallets show you
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.2vw", color: "rgba(255,255,255,0.3)", lineHeight: 1.8, background: "rgba(0,0,0,0.35)", padding: "1.5vh 1.5vw", borderRadius: "0.6vw", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "1.5vh" }}>
              0x095ea7b30000000000000000000000
              <span style={{ display: "block" }}>00a0b86991c6218b36c1d19d4a2e9e</span>
              <span style={{ display: "block" }}>b0ce3606eb48ffffffffffffffffffffff</span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.35)" }}>
              An opaque hex blob. A Confirm button. No context whatsoever.
            </div>
          </div>

          <div style={{ padding: "2.8vh 2.5vw", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.2vw", flex: 1 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "2vh" }}>
              Three vectors, one blind spot
            </div>
            <div className="flex flex-col gap-[1.8vh]">
              <div className="flex items-start gap-[1vw]">
                <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#f87171", marginTop: "0.8vh", flexShrink: 0 }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                  <span style={{ color: "#fca5a5", fontWeight: 600 }}>Unlimited approvals</span> — one signature, forever open to drain
                </div>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#f87171", marginTop: "0.8vh", flexShrink: 0 }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                  <span style={{ color: "#fca5a5", fontWeight: 600 }}>Drainer contracts</span> — honeypots that sweep wallets the moment you sign
                </div>
              </div>
              <div className="flex items-start gap-[1vw]">
                <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#f87171", marginTop: "0.8vh", flexShrink: 0 }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                  <span style={{ color: "#fca5a5", fontWeight: 600 }}>Phishing UIs</span> — legitimate-looking frontends that swap addresses at signing
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
