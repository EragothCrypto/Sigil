import { Download, Chrome, Puzzle, Zap, ShieldCheck, Code2, AlertTriangle, ArrowRight, CheckCircle2, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const EXTENSION_ZIP = `${import.meta.env.BASE_URL}sigil-extension.zip`;
const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg';

const STEPS: Array<{ num: string; title: string; desc: string; action?: ReactNode; code?: string }> = [
  {
    num: "01",
    title: "Install from Chrome Web Store",
    desc: "Install the live Sigil extension directly from the official Chrome Web Store listing.",
    action: (
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-primary-text border border-primary/25 bg-primary/8 hover:bg-primary/15 transition-all"
      >
        <Store className="w-4 h-4" />
        Chrome Web Store
      </a>
    ),
  },
  {
    num: "02",
    title: "Pin Sigil",
    desc: "Pin Sigil in Chrome so the protection settings, paste analyzer, and recent checks are easy to reach.",
  },
  {
    num: "03",
    title: "Keep Standard Mode On",
    desc: "Standard mode is the recommended daily setting for wallet requests, approvals, typed data, and site reputation checks.",
  },
  {
    num: "04",
    title: "Optional Manual Install",
    desc: "Power users can still download the ZIP and load it unpacked for local review.",
    action: (
      <a
        href={EXTENSION_ZIP}
        download="sigil-extension.zip"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white/70 border border-white/12 bg-white/[0.04] hover:border-primary/25 hover:text-primary-text transition-all"
      >
        <Download className="w-4 h-4" />
        sigil-extension.zip
      </a>
    ),
  },
  {
    num: "05",
    title: "Review Before Signing",
    desc: "When a dApp asks for a transaction or signature, read Sigil's verdict before you continue.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    color: "text-primary-text",
    bg: "bg-primary/10",
    border: "border-primary/15",
    title: "Reviews Compatible Wallet Requests",
    desc: "Observes supported EIP-1193 transaction and signing methods on a best-effort basis without controlling the wallet.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    title: "Real-Time Risk Score",
    desc: "Combines local checks and API analysis into a 0–100 advisory verdict: Safe, Caution, or Dangerous.",
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
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary-text text-xs font-mono font-semibold uppercase tracking-widest">
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

        <p className="text-lg text-subtle max-w-xl mx-auto leading-relaxed">
          Sigil reviews compatible wallet requests and shows advisory risk context while you evaluate them in your wallet.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-display font-bold text-sm text-white uppercase tracking-wider overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' }} />
            <Store className="relative z-10 w-4 h-4" />
            <span className="relative z-10">Install from Chrome Web Store</span>
          </a>
          <div className="flex items-center gap-2 text-sm text-subtle">
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
                  <p className="text-sm text-subtle leading-relaxed">{f.desc}</p>
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
            { icon: "🦊", label: "dApp sends\nwallet request" },
            { icon: "🔀", label: "Sigil observes\nwhen compatible" },
            { icon: "🤖", label: "Risk signals\nare reviewed" },
            { icon: "⚠️", label: "Advisory alert\nis shown" },
            { icon: "✅", label: "You decide\nin your wallet" },
          ].map((step, i, arr) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex-1 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center text-xl">
                  {step.icon}
                </div>
                <p className="text-xs text-subtle whitespace-pre-line leading-snug">{step.label}</p>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="w-4 h-4 text-subtle shrink-0 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-subtle leading-relaxed border border-white/8 bg-white/[0.03] rounded-xl p-4">
        Automatic observation is best-effort and can be bypassed or suppressed by a hostile page. The wallet remains the only place that approves or rejects an action, and confirmation may happen before Sigil finishes an analysis.
      </p>

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
                <span className="text-xs font-mono font-bold text-primary-text">{step.num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-white/90 text-sm mb-1">{step.title}</h3>
                <p className="text-sm text-subtle leading-relaxed mb-2">{step.desc}</p>
                {step.action}
                {'code' in step && step.code && (
                  <div className="inline-flex items-center gap-2 bg-white/4 border border-white/8 rounded-lg px-3 py-1.5 font-mono text-xs text-primary-text mt-1">
                    <Code2 className="w-3 h-3 shrink-0" />
                    {step.code}
                  </div>
                )}
              </div>
              <CheckCircle2 className="w-4 h-4 text-white/8 shrink-0 mt-1 group-hover:text-primary-text transition-colors" />
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
              <span className="text-[10px] text-subtle font-mono">{w.note}</span>
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
      <span className="text-[10px] font-mono text-subtle uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}
