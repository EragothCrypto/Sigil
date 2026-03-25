import { ShieldCheck, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react';
import { RiskRing } from './RiskRing';
import { useToast } from '@/hooks/use-toast';

export function AnalysisResultView({ data }: { data: AnalysisResult }) {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Address copied to clipboard" });
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in zoom-in duration-700 fill-mode-both">
      
      {/* Header Panel */}
      <div className="bg-card/80 border border-card-border p-8 md:p-10 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col md:flex-row gap-10 items-center">
        <RiskRing score={data.riskScore} level={data.riskLevel} />
        
        <div className="flex-1 space-y-6 text-center md:text-left">
           <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
             <span className="px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full font-mono text-xs font-semibold tracking-wider">
               {data.network.toUpperCase()}
             </span>
             <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full font-mono text-xs text-muted-foreground tracking-wider">
               {data.inputType.toUpperCase()}
             </span>
           </div>
           
           <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-semibold text-white leading-tight">
             {data.summary}
           </h2>
           
           <div className="flex items-center justify-center md:justify-start gap-3 text-muted-foreground bg-black/40 w-fit px-4 py-2 rounded-lg border border-white/5 mx-auto md:mx-0">
             <span className="font-mono text-sm break-all">{data.input}</span>
             <button 
               onClick={() => handleCopy(data.input)} 
               className="hover:text-primary transition-colors p-1 rounded-md hover:bg-white/5"
               aria-label="Copy address"
             >
               <Copy className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>

      {/* Vectors Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Warnings */}
         <div className="bg-destructive/5 border border-destructive/20 rounded-3xl p-8 space-y-6 shadow-xl shadow-destructive/5">
           <h3 className="flex items-center gap-3 font-display text-xl text-destructive font-bold">
             <ShieldAlert className="w-6 h-6" /> Threat Vectors
           </h3>
           {data.warnings.length === 0 ? (
             <p className="text-muted-foreground text-sm font-mono bg-black/40 p-4 rounded-xl border border-white/5">No malicious threats detected.</p>
           ) : (
             <ul className="space-y-4">
               {data.warnings.map((w, i) => (
                 <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-destructive/10">
                   <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                   <span className="text-sm text-white/90 leading-relaxed font-sans">{w}</span>
                 </li>
               ))}
             </ul>
           )}
         </div>

         {/* Positives */}
         <div className="bg-success/5 border border-success/20 rounded-3xl p-8 space-y-6 shadow-xl shadow-success/5">
           <h3 className="flex items-center gap-3 font-display text-xl text-success font-bold">
             <ShieldCheck className="w-6 h-6" /> Trust Indicators
           </h3>
           {data.positives.length === 0 ? (
             <p className="text-muted-foreground text-sm font-mono bg-black/40 p-4 rounded-xl border border-white/5">No positive trust indicators found.</p>
           ) : (
             <ul className="space-y-4">
               {data.positives.map((p, i) => (
                 <li key={i} className="flex items-start gap-4 bg-black/40 p-4 rounded-xl border border-success/10">
                   <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                   <span className="text-sm text-white/90 leading-relaxed font-sans">{p}</span>
                 </li>
               ))}
             </ul>
           )}
         </div>
      </div>

      {/* Raw Details */}
      {data.details && Object.keys(data.details).length > 0 && (
        <div className="bg-card/50 border border-card-border rounded-3xl p-8 overflow-hidden backdrop-blur-sm">
          <h3 className="font-display text-xl text-white font-bold mb-8 flex items-center gap-2">
            Execution Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
            {Object.entries(data.details).map(([key, value]) => {
              if (value === undefined || value === null || key === 'rawData') return null;
              return (
                <div key={key} className="flex flex-col border-b border-white/10 pb-3 group">
                  <span className="text-xs text-muted-foreground font-mono uppercase tracking-[0.15em] mb-2 group-hover:text-primary transition-colors">{key}</span>
                  <span className="text-sm text-white font-mono break-all leading-tight">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}
