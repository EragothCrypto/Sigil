import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAnalyzeInput } from '@workspace/api-client-react';
import { ScanAnimation } from '@/components/sigil/ScanAnimation';
import { Shield, ChevronDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [, setLocation] = useLocation();

  const analyzeMutation = useAnalyzeInput({
    mutation: {
      onSuccess: (data) => {
        // Automatically navigate to the analysis results page
        setLocation(`/analysis/${data.id}`);
      }
    }
  });

  const handleAnalyze = () => {
    if (!input.trim()) return;
    analyzeMutation.mutate({ data: { input: input.trim(), network } });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] max-w-4xl mx-auto w-full">
      {analyzeMutation.isPending ? (
        <ScanAnimation />
      ) : (
        <motion.div 
          className="w-full space-y-12 flex flex-col items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight drop-shadow-2xl">
              The <span className="text-primary drop-shadow-[0_0_25px_rgba(0,229,255,0.4)]">Trust Layer</span> of Web3
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-mono max-w-2xl mx-auto leading-relaxed">
              Paste any transaction hash or contract address. Understand exactly what you're signing before you execute.
            </p>
          </div>

          <div className="w-full mt-10">
            <div className="flex flex-col md:flex-row w-full shadow-2xl shadow-primary/5 rounded-2xl transition-all focus-within:shadow-primary/20 focus-within:ring-2 focus-within:ring-primary/50 bg-black/60 border border-white/10 backdrop-blur-md overflow-hidden">
              <div className="relative w-full md:w-56 border-b md:border-b-0 md:border-r border-white/10">
                <select 
                  value={network}
                  onChange={e => setNetwork(e.target.value)}
                  className="w-full bg-transparent px-6 py-6 text-white font-mono text-sm focus:outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors uppercase tracking-widest"
                >
                  <option value="mainnet" className="bg-secondary text-white">Ethereum</option>
                  <option value="polygon" className="bg-secondary text-white">Polygon</option>
                  <option value="arbitrum" className="bg-secondary text-white">Arbitrum</option>
                  <option value="optimism" className="bg-secondary text-white">Optimism</option>
                  <option value="base" className="bg-secondary text-white">Base</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
              </div>
              
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                placeholder="Paste tx hash or contract (0x...)"
                className="flex-1 bg-transparent px-6 py-6 text-white font-mono text-base focus:outline-none placeholder:text-white/20"
              />
              
              <button 
                onClick={handleAnalyze}
                disabled={!input.trim() || analyzeMutation.isPending}
                className="bg-primary text-primary-foreground font-display font-bold text-lg px-12 py-6 hover:bg-white transition-all duration-300 shadow-[inset_0_0_15px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                DECODE
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            {analyzeMutation.isError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive font-mono text-sm flex items-center gap-3 backdrop-blur-sm"
              >
                <Shield className="w-5 h-5" />
                Error: {(analyzeMutation.error as any)?.message || "Failed to analyze input. Please verify the hash and network."}
              </motion.div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-16">
            {[
              { title: "Human Readable", desc: "Complex bytecode translated into plain English descriptions." },
              { title: "Risk Scoring", desc: "Instant evaluation of malicious patterns and hidden threats." },
              { title: "Multi-chain Support", desc: "Supports Ethereum, L2s, and major EVM compatible networks." }
            ].map((feature, i) => (
               <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-8 backdrop-blur-sm hover:border-primary/30 transition-colors">
                 <h4 className="font-display font-bold text-lg text-primary mb-3">{feature.title}</h4>
                 <p className="text-sm text-muted-foreground font-mono leading-relaxed">{feature.desc}</p>
               </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
