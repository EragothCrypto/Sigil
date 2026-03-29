import { Download, Chrome, Puzzle, Zap, ShieldCheck, Code2, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EXTENSION_ZIP = `${import.meta.env.BASE_URL}sigil-extension.zip`;

const STEPS = [
  {
    num: "01",
    title: "Download the Extension",
    desc: "Download the Sigil extension ZIP file to your computer.",
    action: (
      <a
        href={EXTENSION_ZIP}
        download="sigil-extension.zip"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-primary border border-primary/25 bg-primary/8 hover:bg-primary/15 transition-all"
      >
        <Download className="w-4 h-4" />
        sigil-extension.zip
      </a>
    ),
  },
  {
    num: "02",
    title: "Unzip the File",
    desc: "Extract to a permanent folder (e.g. ~/sigil-extension). Don't delete it after installing.",
  },
  {
    num: "03",
    title: "Open Chrome Extensions",
    desc: "Navigate to the Chrome Extensions management page.",
    code: "chrome://extensions",
  },
  {
    num: "04",
    title: "Enable Developer Mode",
    desc: 'Toggle "Developer mode" in the top-right corner of the Extensions page.',
  },
  {
    num: "05",
    title: "Load the Extension",
    desc: 'Click "Load unpacked" and select the folder you extracted in step 2.',
  },
];

const FEATURES = [
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/15",
    title: "Intercepts Every Transaction",
    desc: "Hooks into MetaMask, Rabby, and any EIP-1193 wallet. Catches eth_sendTransaction, eth_sign, personal_sign, and typed data.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    title: "Real-Time Risk Score",
    desc: "AI engine returns a 0–100 risk verdict — Safe, Caution, or Dangerous — before you approve anything.",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/15",
    title: "Approval Warnings",
    desc: "Flags unlimited token approvals, unknown spenders, and suspicious contracts instantly.",
  },
  {
    icon: Code2,
    color: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
    title: "Open Source",
    desc: "Vanilla JS files, no bundler magic. Inspect every line of code before you load it.",
  },
];

const WALLETS = [
  { name: "MetaMask", emoji: "🦊", note: "Fully tested" },
  { name: "Rabby", emoji: "🐰", note: "Fully tested" },
  { name: "Coinbase Wallet", emoji: "🔵", note: "Compatible" },
  { name: "Trust Wallet", emoji: "🛡", note: "Compatible" },
  { name: "Frame", emoji: "🖼", note: "Compatible" },
];

export default function ExtensionPage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-20 pb-20">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center pt-10 space-y-6"
      >
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold uppercase tracking-widest">
          <Puzzle className="w-3.5 h-3.5" />
          Browser Extension
        </div>

        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white leading-[1.05] tracking-tight">
          Sigil lives inside
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            your wallet
          </span>
        </h1>

        <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
          Every transaction gets analyzed <em className="text-white/60 not-italic">before</em> MetaMask or Rabby asks you to sign. No more blind approvals.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={EXTENSION_ZIP}
            download="sigil-extension.zip"
            className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-display font-bold text-sm text-white uppercase tracking-wider overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' }} />
            <Download className="relative z-10 w-4 h-4" />
            <span className="relative z-10">Download Extension</span>
          </a>
          <div className="flex items-center gap-2 text-sm text-white/30">
            <Chrome className="w-4 h-4" />
            Chrome & Chromium-based
          </div>
        </div>
      </motion.div>

      {/* ── Features ── */}
      <section className="space-y-6">
        <SectionLabel label="What it does" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="flex gap-4 p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-primary/15 transition-colors"
              >
                <div className={`w-11 h-11 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${f.color}`} strokeWidth={1.7} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm mb-1.5">{f.title}</h3>
                  <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="space-y-6">
        <SectionLabel label="How it works" />
        <div className="flex flex-col md:flex-row items-center gap-2">
          {[
            { icon: "🦊", label: "You click\nConfirm" },
            { icon: "🔀", label: "Sigil\nintercepts" },
            { icon: "🤖", label: "AI analyzes\nin <2s" },
            { icon: "⚠️", label: "Risk overlay\nappears" },
            { icon: "✅", label: "You decide\nto proceed" },
          ].map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex-1 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center text-xl">
                  {step.icon}
                </div>
                <p className="text-xs text-white/35 whitespace-pre-line leading-snug">{step.label}</p>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="w-4 h-4 text-white/12 shrink-0 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Install steps ── */}
      <section className="space-y-6">
        <SectionLabel label="Installation" />
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="flex gap-5 items-start p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-primary/15 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono font-bold text-primary">{step.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-white/90 text-sm mb-1">{step.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed mb-2">{step.desc}</p>
                {step.action}
                {step.code && (
                  <div className="inline-flex items-center gap-2 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5 font-mono text-xs text-primary/70 mt-1">
                    <Code2 className="w-3 h-3 shrink-0" />
                    {step.code}
                  </div>
                )}
              </div>
              <CheckCircle2 className="w-4 h-4 text-white/8 shrink-0 mt-1 group-hover:text-primary/20 transition-colors" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Wallets ── */}
      <section className="space-y-6">
        <SectionLabel label="Compatible Wallets" />
        <div className="flex flex-wrap justify-center gap-3">
          {WALLETS.map((w) => (
            <div
              key={w.name}
              className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-white/5 bg-white/2 hover:border-primary/15 transition-colors min-w-[100px]"
            >
              <span className="text-2xl">{w.emoji}</span>
              <span className="text-sm font-semibold text-white/80">{w.name}</span>
              <span className="text-[10px] text-white/25 font-mono">{w.note}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-white/5" />
      <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}
