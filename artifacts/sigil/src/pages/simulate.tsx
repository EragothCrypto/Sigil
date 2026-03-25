import { useState } from 'react';
import { useSimulateTransaction } from '@workspace/api-client-react';
import { SimulationResultView } from '@/components/sigil/SimulationResultView';
import { ScanAnimation } from '@/components/sigil/ScanAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ArrowRight, RotateCcw } from 'lucide-react';
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
    label: "Wallet prompt text",
    value: "MetaMask is requesting permission to spend your USDC. Spender: 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F (Unverified). Amount: Unlimited.",
  },
];

export default function SimulatePage() {
  const [rawData, setRawData] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [result, setResult] = useState<ReturnType<typeof useSimulateTransaction>['data']>(undefined);

  const simulateMutation = useSimulateTransaction({
    mutation: {
      onSuccess: (data) => setResult(data),
    }
  });

  const handleSimulate = () => {
    if (!rawData.trim()) return;
    setResult(undefined);
    simulateMutation.mutate({ data: { rawData: rawData.trim(), network } });
  };

  const handleReset = () => {
    setResult(undefined);
    simulateMutation.reset();
    setRawData('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {simulateMutation.isPending ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanAnimation />
          </motion.div>
        ) : result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors group cursor-pointer"
              >
                ← BACK TO SCANNER
              </Link>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Simulate another
              </button>
            </div>
            <SimulationResultView data={result as any} />
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
          >
            {/* Header */}
            <div className="text-center space-y-4 pt-8">
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight">
                Simulate <span className="text-primary drop-shadow-[0_0_25px_rgba(0,229,255,0.4)]">Before Signing</span>
              </h1>
              <p className="text-lg text-muted-foreground font-mono max-w-2xl mx-auto leading-relaxed">
                Paste raw calldata, a JSON transaction, or a wallet prompt. See exactly what will change in your wallet before you sign anything.
              </p>
            </div>

            {/* Input area */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={network}
                    onChange={e => setNetwork(e.target.value)}
                    className="bg-black/60 border border-white/10 text-white font-mono text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-primary/50 appearance-none pr-8 cursor-pointer hover:bg-white/5 transition-colors tracking-wider"
                  >
                    <option value="mainnet" className="bg-secondary">Ethereum</option>
                    <option value="polygon" className="bg-secondary">Polygon</option>
                    <option value="arbitrum" className="bg-secondary">Arbitrum</option>
                    <option value="optimism" className="bg-secondary">Optimism</option>
                    <option value="base" className="bg-secondary">Base</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
                <span className="text-muted-foreground font-mono text-sm">Select network</span>
              </div>

              <div className="relative group">
                <textarea
                  value={rawData}
                  onChange={e => setRawData(e.target.value)}
                  placeholder={`Paste any of these:\n• Raw hex calldata:  0x095ea7b3000000...\n• JSON tx object:   {"to":"0x...","data":"0x...","value":"0x..."}\n• Wallet prompt:    "MetaMask is asking permission to spend your USDC..."`}
                  rows={8}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-white font-mono text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/20 resize-none transition-all group-hover:border-white/20 leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSimulate}
                  disabled={!rawData.trim() || simulateMutation.isPending}
                  className="flex-1 bg-primary text-primary-foreground font-display font-bold text-lg px-10 py-4 rounded-xl hover:bg-white transition-all duration-300 shadow-[inset_0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                  SIMULATE TRANSACTION
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {simulateMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive font-mono text-sm flex items-center gap-3"
                >
                  <Shield className="w-5 h-5" />
                  {(simulateMutation.error as any)?.message || "Simulation failed. Please check your input."}
                </motion.div>
              )}
            </div>

            {/* Example inputs */}
            <div className="space-y-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Try an example</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXAMPLE_INPUTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setRawData(ex.value)}
                    className="text-left bg-black/40 border border-white/5 rounded-xl p-4 hover:border-primary/30 hover:bg-black/60 transition-all group"
                  >
                    <span className="text-xs font-mono text-primary font-semibold group-hover:text-white transition-colors">{ex.label}</span>
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{ex.value.substring(0, 30)}…</p>
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
