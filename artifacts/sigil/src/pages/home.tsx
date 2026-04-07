import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Shield, ChevronDown, ArrowRight, Zap, Globe, ShieldCheck, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { StreamingAnalysisView, type StreamPhase } from '@/components/sigil/StreamingAnalysisView';

const NETWORKS = [
  { value: 'mainnet', label: 'Ethereum', emoji: '⬡' },
  { value: 'polygon', label: 'Polygon', emoji: '⬡' },
  { value: 'arbitrum', label: 'Arbitrum', emoji: '⬡' },
  { value: 'optimism', label: 'Optimism', emoji: '⬡' },
  { value: 'base', label: 'Base', emoji: '⬡' },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Decode",
    desc: "Bytecode to plain English in under 2 seconds. Know exactly what a transaction will do.",
  },
  {
    icon: ShieldCheck,
    title: "Risk Scoring",
    desc: "0–100 risk score based on bytecode analysis, approval scope, and exploit history.",
  },
  {
    icon: Globe,
    title: "Multi-chain",
    desc: "Ethereum, Polygon, Arbitrum, Optimism, Base and every major EVM chain.",
  },
  {
    icon: Layers,
    title: "Contract Trust Score",
    desc: "Credit score for smart contracts — age, verification, activity, and exploit history.",
  },
];

const EXAMPLES = [
  { label: 'USDC Contract', value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  { label: 'Uniswap V2', value: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f' },
  { label: '⚠️ Approval Drain Tx', value: '0x4b66cc6b5bbda8b29c6f88b009a79ad1c66e3c9eb9c6af2e11e30f10bf5b8d4b' },
];

export default function Home() {
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [phase, setPhase] = useState<StreamPhase>({ kind: 'idle' });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase({ kind: 'idle' });
  }, []);

  const handleAnalyze = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Abort any in-flight request
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

      // Read and parse SSE stream
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
  }, [input, network, setLocation, toast]);

  const isStreaming = phase.kind !== 'idle' && phase.kind !== 'error';

  return (
    <div className="flex-1 flex flex-col items-center min-h-[80vh] pt-8 pb-20">
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
            className="w-full flex flex-col items-center gap-16"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── Hero text ── */}
            <div className="text-center space-y-5 max-w-3xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold uppercase tracking-widest mb-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Transaction Decoder · Web3 Security
              </motion.div>

              <h1 className="text-5xl md:text-[4.5rem] font-display font-extrabold text-white leading-[1.05] tracking-tight">
                The{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 40%, #c084fc 100%)' }}
                >
                  Trust Layer
                </span>
                {' '}of Web3
              </h1>

              <p className="text-lg text-white/45 max-w-xl mx-auto leading-relaxed font-sans">
                Paste any transaction hash or contract address. Understand exactly what you're signing before you execute.
              </p>
            </div>

            {/* ── Scanner input ── */}
            <div className="w-full max-w-3xl space-y-3">
              <div
                className="relative rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: 'rgba(139,92,246,0.04)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.18), 0 20px 60px -10px rgba(139,92,246,0.15)',
                }}
              >
                {/* Shimmer top accent */}
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
                    placeholder="Paste tx hash or contract address (0x...)"
                    className="flex-1 bg-transparent px-5 py-5 text-white font-mono text-sm focus:outline-none placeholder:text-white/18"
                  />

                  {/* Decode button */}
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

              {/* Quick examples */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-white/25 font-mono uppercase tracking-wider">Try:</span>
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => setInput(ex.value)}
                    className="text-xs font-mono text-primary/60 hover:text-primary border border-primary/10 hover:border-primary/30 bg-primary/4 hover:bg-primary/8 px-3 py-1.5 rounded-lg transition-all"
                  >
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
                  {phase.message || "Failed to analyze. Please verify the hash and network."}
                </motion.div>
              )}
            </div>

            {/* ── Feature grid ── */}
            <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative flex gap-4 p-5 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/4 hover:border-primary/20 transition-all duration-300 cursor-default"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.7} />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-white/90 text-sm mb-1">{f.title}</h4>
                      <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
