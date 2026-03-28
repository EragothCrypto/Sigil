import { Download, Chrome, Puzzle, Zap, ShieldCheck, Code2, ExternalLink, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/12 border border-primary/30 text-primary rounded-xl font-semibold text-sm hover:bg-primary/20 transition-all"
      >
        <Download className="w-4 h-4" />
        Download sigil-extension.zip
      </a>
    ),
  },
  {
    num: "02",
    title: "Unzip the File",
    desc: "Extract the ZIP to a permanent folder on your computer (e.g. ~/sigil-extension). Don't delete it after installing.",
    code: null,
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
    code: null,
  },
  {
    num: "05",
    title: "Load the Extension",
    desc: 'Click "Load unpacked" and select the folder you extracted in step 2.',
    code: null,
  },
];

const FEATURES = [
  {
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    title: "Intercepts Every Transaction",
    desc: "Hooks into MetaMask, Rabby, and any EIP-1193 wallet. Catches eth_sendTransaction, eth_sign, personal_sign, and typed data signatures.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    title: "Real-Time Risk Score",
    desc: "Sends the transaction to Sigil's AI engine and returns a verdict — Safe, Caution, or Dangerous — with a 0–100 risk score before you approve.",
  },
  {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    title: "Approval Warnings",
    desc: "Flags unlimited token approvals, unknown spenders, and suspicious contracts. Gives you time to think before you sign.",
  },
  {
    icon: Code2,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    title: "Open Source",
    desc: "The extension is a handful of vanilla JS files with no bundler magic. Inspect every line of code before loading it.",
  },
];

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-card-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,245,212,0.08),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary rounded-full px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-widest mb-8">
            <Puzzle className="w-3.5 h-3.5" />
            Browser Extension
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-black text-white leading-[1.05] mb-6">
            Sigil lives inside<br />
            <span className="text-primary">your wallet</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Install the extension and Sigil will analyze every transaction <em>before</em> MetaMask or Rabby asks you to sign. No more blind approvals.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={EXTENSION_ZIP}
              download="sigil-extension.zip"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary/15 border border-primary/35 text-primary rounded-2xl font-bold text-base hover:bg-primary/25 transition-all shadow-lg shadow-primary/10"
            >
              <Download className="w-5 h-5" />
              Download Extension
            </a>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Chrome className="w-4 h-4" />
              Chrome & Chromium-based browsers
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-20">

        {/* What it does */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">What it does</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`bg-card/60 border border-card-border rounded-2xl p-6 flex gap-5 backdrop-blur-sm`}>
                  <div className={`w-12 h-12 ${f.bg} border ${f.border} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${f.color}`} strokeWidth={1.7} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works diagram */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">How it works</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-2">
            {[
              { icon: "🦊", label: "You click\nConfirm" },
              { icon: "🔀", label: "Sigil\nintercepts" },
              { icon: "🤖", label: "AI analyzes\nin <2s" },
              { icon: "⚠️", label: "Risk overlay\nappears" },
              { icon: "✅", label: "You decide\nto proceed" },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2 md:gap-2 flex-1">
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-card/70 border border-card-border rounded-2xl flex items-center justify-center text-2xl mb-2 backdrop-blur-sm">
                    {step.icon}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-snug">{step.label}</p>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-white/20 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Install steps */}
        <section>
          <div className="flex items-center gap-3 mb-10">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Installation</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-card/60 border border-card-border rounded-2xl p-6 flex gap-6 items-start backdrop-blur-sm">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-xs font-mono font-bold text-primary">{step.num}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.desc}</p>
                  {step.action}
                  {step.code && (
                    <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-primary/80 mt-1">
                      <Code2 className="w-3.5 h-3.5 shrink-0" />
                      {step.code}
                    </div>
                  )}
                </div>
                <CheckCircle2 className="w-5 h-5 text-white/15 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
        </section>

        {/* Compatibility */}
        <section className="bg-card/40 border border-card-border rounded-3xl p-8 text-center backdrop-blur-sm">
          <h3 className="font-display text-2xl font-bold text-white mb-3">Compatible Wallets</h3>
          <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
            Works with any wallet that injects a standard EIP-1193 provider into the page.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: "MetaMask", emoji: "🦊", note: "Fully tested" },
              { name: "Rabby", emoji: "🐰", note: "Fully tested" },
              { name: "Coinbase Wallet", emoji: "🔵", note: "Compatible" },
              { name: "Trust Wallet", emoji: "🛡", note: "Compatible" },
              { name: "Frame", emoji: "🖼", note: "Compatible" },
            ].map((w) => (
              <div key={w.name} className="bg-white/4 border border-white/8 rounded-2xl px-5 py-3 flex flex-col items-center gap-1.5">
                <span className="text-2xl">{w.emoji}</span>
                <span className="text-sm font-semibold text-white">{w.name}</span>
                <span className="text-xs text-muted-foreground">{w.note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA back to scanner */}
        <section className="text-center pb-8">
          <p className="text-muted-foreground text-sm mb-4">Or analyze transactions manually</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
          >
            Open the Scanner <ExternalLink className="w-4 h-4" />
          </a>
        </section>

      </div>
    </div>
  );
}
