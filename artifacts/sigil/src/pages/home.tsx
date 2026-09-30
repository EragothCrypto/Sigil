import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Shield, ChevronDown, ArrowRight, Zap, Globe, ShieldCheck,
  Bug, Unlock, Star, Ban, Flame, ClipboardList, CheckCircle2,
  ScanSearch, AlertTriangle, Chrome, WalletCards, ListChecks,
  GraduationCap, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { StreamingAnalysisView, type StreamPhase } from '@/components/sigil/StreamingAnalysisView';

const NETWORKS = [
  { value: 'mainnet',  label: 'Ethereum' },
  { value: 'polygon',  label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base',     label: 'Base' },
];

const EXAMPLES = [
  { label: 'USDC Contract',          value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', warning: false },
  { label: 'Uniswap V2',             value: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', warning: false },
  { label: 'Tornado Cash (OFAC)',    value: '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291', warning: true },
  { label: 'Euler Finance Exploit',  value: '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d', warning: true },
];

const STATS = [
  { value: '$10B+',  label: 'in on-chain risk analyzed' },
  { value: '50+',   label: 'risk signals checked per scan' },
  { value: '10',    label: 'EVM chains supported' },
];

const START_PATHS = [
  {
    href: '/extension',
    icon: Chrome,
    title: 'Install the extension',
    desc: 'Protect wallet prompts directly in Chrome before you sign.',
    tone: 'primary',
  },
  {
    href: '/monitor',
    icon: WalletCards,
    title: 'Monitor a wallet',
    desc: 'Track approval exposure, hygiene score, and what to fix first.',
    tone: 'emerald',
  },
  {
    href: '/approvals',
    icon: ShieldCheck,
    title: 'Check approvals',
    desc: 'Find unlimited token approvals and unknown spenders.',
    tone: 'amber',
  },
  {
    href: '/watchlist',
    icon: ListChecks,
    title: 'Save a watchlist',
    desc: 'Keep important wallets and vaults ready for quick review.',
    tone: 'blue',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: ClipboardList,
    title: 'Paste any address or hash',
    desc: 'Drop a transaction hash or smart contract address. Works with Ethereum, Polygon, Arbitrum, Base and every major EVM chain.',
  },
  {
    step: '02',
    icon: ScanSearch,
    title: 'AI scans on-chain signals',
    desc: "Sigil combines deterministic checks, public blockchain data, and AI-assisted explanations to surface transaction and contract risk.",
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Understand before you sign',
    desc: 'Get a 0–100 risk score, plain-English verdict, specific warnings, and actionable guidance — before touching any wallet.',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Decode',
    desc: 'Translate raw bytecode to plain English in under 2 seconds. Know exactly what any contract does.',
    accent: '#8b5cf6',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Scoring',
    desc: '0–100 risk score based on bytecode analysis, approval scope, exploit history and on-chain reputation.',
    accent: '#8b5cf6',
  },
  {
    icon: Bug,
    title: 'Pattern Detection',
    desc: 'Detects honeypots, wallet drainers, fake approvals, rug pulls, flash loan attacks and more.',
    accent: '#f43f5e',
  },
  {
    icon: Unlock,
    title: 'Approval Inspector',
    desc: 'Every token approval decoded — unlimited grants flagged critical, with your full approval history surfaced.',
    accent: '#f59e0b',
  },
  {
    icon: Star,
    title: 'Contract Trust Score',
    desc: 'A contract credit score based on age, verification status, deployer history, and transaction volume.',
    accent: '#3b82f6',
  },
  {
    icon: Ban,
    title: 'OFAC Sanctions Check',
    desc: 'Instantly flags OFAC-sanctioned addresses like Tornado Cash pools — with legal context and severity.',
    accent: '#f43f5e',
  },
  {
    icon: Globe,
    title: 'Multi-chain Support',
    desc: 'Ethereum, Polygon, Arbitrum, Optimism, Base and every major EVM chain in a single interface.',
    accent: '#8b5cf6',
  },
  {
    icon: Flame,
    title: 'Hall of Shame',
    desc: 'A curated database of real exploits: Bybit ($1.5B), Ronin ($625M), Euler Finance ($197M) and more.',
    accent: '#f97316',
  },
];

export default function Home() {
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [phase, setPhase] = useState<StreamPhase>({ kind: 'idle' });
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setShowOnboardingPrompt(localStorage.getItem('sigil:onboarding-complete') !== 'true');
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase({ kind: 'idle' });
  }, []);

  const handleAnalyzeValue = useCallback(async (trimmed: string) => {
    if (!trimmed) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setPhase({ kind: 'step1', label: 'Gathering on-chain signals…' });

    try {
      const response = await fetch('/api/sigil/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, network }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Analysis failed' }));
        setPhase({ kind: 'error', message: (err as { message?: string }).message || 'Analysis failed' });
        return;
      }

      if (!response.body) {
        setPhase({ kind: 'error', message: 'No response stream received' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      const handleEvent = (event: Record<string, unknown>) => {
        const type = event.type as string;

        if (type === 'cached') {
          toast({
            title: '⚡ Instant result',
            description: 'Served from cache — no new AI call needed.',
            duration: 3000,
          });
          setLocation(`/analysis/${event.id}?cached=1`);
          return;
        }

        if (type === 'step') {
          const step = event.step as number;
          const label = event.label as string;
          if (step === 1) {
            setPhase({ kind: 'step1', label });
          } else {
            setPhase((prev) => {
              if (prev.kind === 'streaming') return { ...prev, stepLabel: label };
              return { kind: 'streaming', estimatedScore: 50, signalCount: 0, riskSignals: [], summaryText: '', stepLabel: label };
            });
          }
          return;
        }

        if (type === 'metadata') {
          const estimatedScore = event.estimatedScore as number;
          const signalCount = event.signalCount as number;
          const riskSignals = (event.riskSignals as string[]) ?? [];
          setPhase((prev) => ({
            kind: 'streaming',
            estimatedScore,
            signalCount,
            riskSignals,
            summaryText: '',
            stepLabel: prev.kind === 'streaming' ? prev.stepLabel : 'Generating verdict…',
          }));
          return;
        }

        if (type === 'token') {
          const text = event.text as string;
          setPhase((prev) => {
            if (prev.kind !== 'streaming') return prev;
            return { ...prev, summaryText: prev.summaryText + text };
          });
          return;
        }

        if (type === 'done') {
          setLocation(`/analysis/${event.id}`);
          return;
        }

        if (type === 'error') {
          setPhase({ kind: 'error', message: (event.message as string) || 'Analysis failed' });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6).trim();
            if (!json || json === '[DONE]') continue;
            try {
              handleEvent(JSON.parse(json) as Record<string, unknown>);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase({ kind: 'error', message: 'Connection failed — please try again.' });
    }
  }, [network, setLocation, toast]);

  const handleAnalyze = useCallback(() => {
    handleAnalyzeValue(input.trim());
  }, [input, handleAnalyzeValue]);

  const isStreaming = phase.kind !== 'idle' && phase.kind !== 'error';

  return (
    <div className="flex-1 flex flex-col items-center pb-24">
      <AnimatePresence mode="wait">
        {isStreaming ? (
          <motion.div
            key="streaming"
            className="w-full flex flex-col items-center justify-center min-h-[60vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <StreamingAnalysisView phase={phase} onCancel={handleCancel} />
          </motion.div>
        ) : (
          <motion.div
            key="home"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div className="w-full flex flex-col items-center pt-10 pb-14 text-center relative">
              {/* Subtle grid */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.025]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)',
                  backgroundSize: '60px 60px',
                  maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)',
                }}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold uppercase tracking-widest mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                On-Chain Risk Engine · 50+ Signals · 10 Chains
              </motion.div>

              <h1 className="text-5xl md:text-[4.75rem] font-display font-extrabold text-white leading-[1.05] tracking-tight max-w-3xl">
                The{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 40%, #c084fc 100%)' }}
                >
                  Trust Layer
                </span>
                {' '}of Web3
              </h1>

              <p className="mt-5 text-lg text-white/45 max-w-xl mx-auto leading-relaxed font-sans">
                Scan contracts, monitor wallet exposure, and install the browser extension that explains risky prompts before you sign.
              </p>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-8 flex items-center justify-center gap-8 flex-wrap"
              >
                {STATS.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-2xl font-display font-bold text-white">{s.value}</span>
                    <span className="text-[11px] text-white/35 font-mono uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── Scanner input ─────────────────────────────────────────────── */}
            <div className="w-full max-w-3xl px-0 space-y-3">
              {showOnboardingPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 rounded-2xl border border-primary/18 bg-primary/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-display font-semibold text-white">New to Sigil?</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/45">
                        Take the two-minute safety tour before your next approval, signature, or wallet scan.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                    >
                      Start onboarding
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('sigil:onboarding-complete', 'true');
                        setShowOnboardingPrompt(false);
                      }}
                      aria-label="Dismiss onboarding"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/35 transition-colors hover:text-white/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              <div
                className="relative rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: 'rgba(139,92,246,0.04)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.2), 0 24px 64px -12px rgba(139,92,246,0.18)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                <div className="flex flex-col md:flex-row">
                  {/* Network selector */}
                  <div className="relative md:w-44 border-b md:border-b-0 md:border-r border-white/6 shrink-0">
                    <select
                      value={network}
                      onChange={e => setNetwork(e.target.value)}
                      className="w-full bg-transparent px-5 py-5 text-white/80 font-mono text-sm focus:outline-none appearance-none cursor-pointer hover:bg-white/3 transition-colors uppercase tracking-widest"
                    >
                      {NETWORKS.map(n => (
                        <option key={n.value} value={n.value} className="bg-[#0e0a1e] text-white">{n.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  </div>

                  {/* Input */}
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                    placeholder="Paste tx hash or contract address (0x…)"
                    className="flex-1 bg-transparent px-5 py-5 text-white font-mono text-sm focus:outline-none placeholder:text-white/18"
                  />

                  {/* Analyze button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={!input.trim()}
                    className="relative flex items-center justify-center gap-2.5 px-8 py-5 font-display font-bold text-sm text-white uppercase tracking-widest transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' }} />
                    <span className="relative z-10">Analyze</span>
                    <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Quick examples — clicking auto-analyzes */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <span className="text-xs text-white/25 font-mono uppercase tracking-wider shrink-0">Try:</span>
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => {
                      setInput(ex.value);
                      handleAnalyzeValue(ex.value);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all
                      ${ex.warning
                        ? 'text-amber-400/70 hover:text-amber-400 border-amber-500/15 hover:border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10'
                        : 'text-primary/60 hover:text-primary border-primary/10 hover:border-primary/30 bg-primary/4 hover:bg-primary/8'
                      }`}
                  >
                    {ex.warning && <AlertTriangle className="w-3 h-3" />}
                    {ex.label}
                  </button>
                ))}
              </div>

              {/* Error state */}
              {phase.kind === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive/90 font-mono text-sm"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  {phase.message || 'Failed to analyze. Please verify the hash and network.'}
                </motion.div>
              )}
            </div>

            <div className="w-full max-w-5xl mt-12 grid gap-3 md:grid-cols-4">
              {START_PATHS.map((item) => {
                const Icon = item.icon;
                const tone =
                  item.tone === 'emerald'
                    ? 'border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-200'
                    : item.tone === 'amber'
                      ? 'border-amber-500/15 bg-amber-500/[0.06] text-amber-200'
                      : item.tone === 'blue'
                        ? 'border-sky-500/15 bg-sky-500/[0.06] text-sky-200'
                        : 'border-primary/20 bg-primary/10 text-primary';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-left transition-all hover:border-primary/25 hover:bg-white/[0.045]"
                  >
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${tone}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h2 className="text-sm font-display font-bold text-white">{item.title}</h2>
                    <p className="mt-2 text-xs leading-relaxed text-white/42">{item.desc}</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary/70 transition-colors group-hover:text-primary">
                      Open
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ── How it works ──────────────────────────────────────────────── */}
            <div className="w-full max-w-3xl mt-20">
              <div className="text-center mb-10">
                <p className="text-xs font-mono uppercase tracking-widest text-primary/50 mb-2">How Sigil Works</p>
                <h2 className="text-2xl font-display font-bold text-white tracking-tight">Three steps to full clarity</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HOW_IT_WORKS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="relative flex flex-col gap-4 p-6 rounded-2xl border border-white/5 bg-white/2"
                    >
                      {/* Step number */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" strokeWidth={1.6} />
                        </div>
                        <span className="font-mono text-2xl font-bold text-white/6">{step.step}</span>
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-white text-sm mb-2">{step.title}</h3>
                        <p className="text-xs text-white/35 leading-relaxed">{step.desc}</p>
                      </div>
                      {/* Connector line on desktop */}
                      {i < HOW_IT_WORKS.length - 1 && (
                        <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-px bg-primary/20" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── Feature grid ──────────────────────────────────────────────── */}
            <div className="w-full max-w-3xl mt-20">
              <div className="text-center mb-10">
                <p className="text-xs font-mono uppercase tracking-widest text-primary/50 mb-2">Built-in Intelligence</p>
                <h2 className="text-2xl font-display font-bold text-white tracking-tight">Every signal, in one place</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  const color = f.accent;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="group flex gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300 cursor-default"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.7} />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-white/90 text-sm mb-1">{f.title}</h4>
                        <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── Hall of Shame CTA ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.45 }}
              className="w-full max-w-3xl mt-16"
            >
              <Link
                href="/history"
                className="group block w-full p-6 rounded-2xl border border-rose-500/15 bg-rose-500/5 hover:bg-rose-500/8 hover:border-rose-500/25 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-rose-400" strokeWidth={1.6} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-display font-bold text-white text-sm">Hall of Shame</h3>
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Live</span>
                      </div>
                      <p className="text-xs text-white/35">Browse real exploits — Bybit ($1.5B), Ronin ($625M), Euler Finance ($197M) — and see exactly how Sigil would have flagged each one.</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-rose-400/50 group-hover:text-rose-400 group-hover:translate-x-1 transition-all duration-200 shrink-0 ml-4" />
                </div>
              </Link>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
