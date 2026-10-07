import { useState } from 'react';
import { useSimulateTransactionV2, type SimulationResultV2, type SimulateTransactionV2BodyNetwork } from '@workspace/api-client-react';
import { SimulationResultView, isExecutionReport } from '@/components/sigil/SimulationResultView';
import { ScanAnimation } from '@/components/sigil/ScanAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ArrowRight, RotateCcw, Zap } from 'lucide-react';
import { Link } from 'wouter';

const EXAMPLE_INPUTS = [
  {
    label: "ERC-20 Approve (unlimited)",
    value: "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  },
  {
    label: "ETH Transfer",
    value: '{"to":"0x742d35Cc6634C0532925a3b844Bc454e4438f44e","value":"0xde0b6b3a7640000","data":"0x","gas":"0x5208"}',
  },
  {
    label: "Wallet prompt",
    value: "MetaMask is requesting permission to spend your USDC. Spender: 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F (Unverified). Amount: Unlimited.",
  },
];

const NETWORKS = [
  { value: 'mainnet', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' },
];

export default function SimulatePage() {
  const [rawData, setRawData] = useState('');
  const [network, setNetwork] = useState<SimulateTransactionV2BodyNetwork>('mainnet');
  const [result, setResult] = useState<SimulationResultV2 | undefined>(undefined);
  const [invalidReport, setInvalidReport] = useState(false);

  const simulateMutation = useSimulateTransactionV2({
    mutation: { onSuccess: (data) => {
      if (isExecutionReport(data)) setResult(data);
      else setInvalidReport(true);
    } }
  });

  const handleSimulate = () => {
    if (!rawData.trim()) return;
    setResult(undefined);
    setInvalidReport(false);
    simulateMutation.mutate({ data: { rawData: rawData.trim(), network } });
  };

  const handleReset = () => {
    setResult(undefined);
    simulateMutation.reset();
    setInvalidReport(false);
    setRawData('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AnimatePresence mode="wait">

        {/* Loading */}
        {simulateMutation.isPending && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanAnimation />
          </motion.div>
        )}

        {/* Result */}
        {!simulateMutation.isPending && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-primary transition-colors group cursor-pointer font-mono"
              >
                ← Back to Scanner
              </Link>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Check another
              </button>
            </div>
            <SimulationResultView data={result} />
          </motion.div>
        )}

        {/* Input form */}
        {!simulateMutation.isPending && !result && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10 pt-6"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold uppercase tracking-widest">
                <Zap className="w-3.5 h-3.5" />
                Read-only Execution Check
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight">
                Check{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #c084fc 100%)' }}
                >
                  Before Signing
                </span>
              </h1>
              <p className="text-base text-white/35 max-w-xl mx-auto leading-relaxed">
                No complete execution simulation or signing clearance is available.
              </p>
            </div>

            {/* Input area */}
            <div className="space-y-3">
              {/* Network row */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={network}
                    onChange={e => setNetwork(e.target.value as SimulateTransactionV2BodyNetwork)}
                    className="bg-white/4 border border-white/8 text-white/80 font-mono text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-primary/40 appearance-none pr-8 cursor-pointer hover:bg-white/6 transition-colors tracking-wider"
                  >
                    {NETWORKS.map(n => (
                      <option key={n.value} value={n.value} className="bg-[#0e0a1e] text-white">{n.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                </div>
                <span className="text-xs text-white/20 font-mono">Select network</span>
              </div>

              {/* Textarea */}
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(139,92,246,0.03)',
                  boxShadow: '0 0 0 1px rgba(139,92,246,0.12)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <textarea
                  value={rawData}
                  onChange={e => setRawData(e.target.value)}
                  placeholder={`Paste any of these:\n• Raw hex calldata:  0x095ea7b3000000...\n• JSON tx object:   {"to":"0x...","data":"0x..."}\n• Wallet prompt:    "MetaMask is asking permission..."`}
                  rows={8}
                  className="w-full bg-transparent px-5 py-5 text-white/80 font-mono text-sm focus:outline-none placeholder:text-white/15 resize-none leading-relaxed"
                />
              </div>

              {/* Simulate button */}
              <button
                onClick={handleSimulate}
                disabled={!rawData.trim()}
                className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-display font-bold text-base text-white uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)' }} />
                <Zap className="relative z-10 w-4 h-4" strokeWidth={2} />
                <span className="relative z-10">Check Read-only Call</span>
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {(simulateMutation.isError || invalidReport) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-xl text-destructive/90 font-mono text-sm"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  Remote execution check unavailable. No outcome or signing clearance established.
                </motion.div>
              )}
            </div>

            {/* Examples */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Try an example</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXAMPLE_INPUTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setRawData(ex.value)}
                    className="text-left p-4 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 hover:border-primary/20 transition-all group"
                  >
                    <span className="text-xs font-mono text-primary/60 font-semibold group-hover:text-primary transition-colors">{ex.label}</span>
                    <p className="text-[10px] text-white/20 mt-1 font-mono truncate">{ex.value.substring(0, 28)}…</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
