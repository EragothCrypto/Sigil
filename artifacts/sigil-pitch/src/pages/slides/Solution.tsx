const base = import.meta.env.BASE_URL;

const features = [
  {
    name: "Streaming AI",
    desc: "Verdict and risk score appear in ~1s. Summary streams token by token with a blinking cursor.",
    week: "Week 3",
    weekColor: "#a78bfa",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.22)",
    titleColor: "#a78bfa",
  },
  {
    name: "Hall of Shame",
    desc: "6 curated real exploits ($10.4B+ in losses). Every one flagged CRITICAL / DANGEROUS by Sigil.",
    week: "Week 3",
    weekColor: "#f87171",
    bg: "rgba(248,113,113,0.06)",
    border: "rgba(248,113,113,0.18)",
    titleColor: "#fca5a5",
  },
  {
    name: "Two-Step AI",
    desc: "Chain-of-thought analysis. Signals committed before verdict — zero hallucinations.",
    week: "Week 2",
    weekColor: "#34d399",
    bg: "rgba(52,211,153,0.05)",
    border: "rgba(52,211,153,0.15)",
    titleColor: "#6ee7b7",
  },
  {
    name: "Response Cache",
    desc: "LRU + TTL cache. Instant results for repeat queries. Zero AI cost per cache hit.",
    week: "Week 2",
    weekColor: "#60a5fa",
    bg: "rgba(96,165,250,0.05)",
    border: "rgba(96,165,250,0.15)",
    titleColor: "#93c5fd",
  },
  {
    name: "Risk Score",
    desc: "0–100 composite score with factor breakdown. Approval scope, reputation, pattern evidence.",
    week: "Week 1",
    weekColor: "#fbbf24",
    bg: "rgba(251,191,36,0.05)",
    border: "rgba(251,191,36,0.15)",
    titleColor: "#fde68a",
  },
  {
    name: "Pattern Detection",
    desc: "Two-layer: static ABI signatures + GPT-5.2 contextual analysis. 20+ threat patterns.",
    week: "Week 1",
    weekColor: "#fbbf24",
    bg: "rgba(251,191,36,0.05)",
    border: "rgba(251,191,36,0.15)",
    titleColor: "#fde68a",
  },
  {
    name: "Approval Inspector",
    desc: "Spender identity, live USD dollar value, unlimited flag, prior approval history.",
    week: "Week 1",
    weekColor: "#fbbf24",
    bg: "rgba(251,191,36,0.05)",
    border: "rgba(251,191,36,0.15)",
    titleColor: "#fde68a",
  },
  {
    name: "Reputation Score",
    desc: "Contract age, verification status, exploit history — a credit score for smart contracts.",
    week: "Week 1",
    weekColor: "#fbbf24",
    bg: "rgba(251,191,36,0.05)",
    border: "rgba(251,191,36,0.15)",
    titleColor: "#fde68a",
  },
];

export default function Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#06040f", padding: "5.5vh 6.5vw" }}>
      <div
        className="absolute"
        style={{ inset: 0, background: "radial-gradient(ellipse 60% 60% at 10% 80%, rgba(139,92,246,0.07) 0%, transparent 65%)", pointerEvents: "none" }}
      />
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, #8b5cf6, transparent)" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "1.5vw", marginBottom: "1.2vh" }}>
        <img src={`${base}sigil-logo.png`} crossOrigin="anonymous" alt="Sigil" style={{ width: "2vw", height: "2vw", objectFit: "contain" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(139,92,246,0.8)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
          The Solution
        </span>
      </div>

      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "3.6vw", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, marginBottom: "0.6vh" }}>
        Sigil's Complete Security Stack
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.35)", margin: 0, marginBottom: "3vh" }}>
        8 interlocking features built across 3 weeks — shipping as a single coherent product.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.4vh 1.4vw", flex: 1 }}>
        {features.map((f) => (
          <div key={f.name} style={{ background: f.bg, border: `1px solid ${f.border}`, borderRadius: "1vw", padding: "2vh 1.6vw", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${f.weekColor}55, transparent)` }} />
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: f.titleColor, marginBottom: "0.7vh" }}>{f.name}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.55, flex: 1 }}>
              {f.desc}
            </div>
            <div style={{ marginTop: "1.2vh", fontFamily: "Inter, sans-serif", fontSize: "0.9vw", color: `${f.weekColor}80`, letterSpacing: "0.1em", textTransform: "uppercase" }}>{f.week}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
