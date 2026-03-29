import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAnalyzeInput } from '@workspace/api-client-react';
import { ScanAnimation } from '@/components/sigil/ScanAnimation';
import { Shield, ChevronDown, ArrowRight, Zap, Globe, ShieldCheck, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

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
    desc: "0–100 AI-powered risk score. Flags unlimited approvals, rug pulls, and known exploits.",
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
];

export default function Home() {
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [, setLocation] = useLocation();

  const analyzeMutation = useAnalyzeInput({
    mutation: {
      onSuccess: (data) => setLocation(`/analysis/${data.id}`),
    }
  });

  const handleAnalyze = () => {
    if (!input.trim()) return;
    analyzeMutation.mutate({ data: { input: input.trim(), network } });
  };

  if (analyzeMutation.isPending) {
    return <ScanAnimation />;
  }

  return (
    <div className="flex-1 flex flex-col items-center min-h-[80vh] pt-8 pb-20">
      <motion.div
        className="w-full flex flex-col items-center gap-16"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
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
            AI-Powered Web3 Security
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

          {/* Error */}
          {analyzeMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive/90 font-mono text-sm"
            >
              <Shield className="w-4 h-4 shrink-0" />
              {(analyzeMutation.error as any)?.message || "Failed to analyze. Please verify the hash and network."}
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
    </div>
  );
}
