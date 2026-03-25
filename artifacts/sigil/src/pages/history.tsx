import { useGetAnalysisHistory } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const { data, isLoading } = useGetAnalysisHistory({ limit: 50 });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-4">
            <Clock className="w-8 h-8 text-primary" />
            Global Intel Feed
          </h1>
          <p className="text-muted-foreground font-mono mt-3 text-sm md:text-base">Real-time feed of recent contract and transaction analyses.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="text-center py-32 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-md">
          <ShieldAlert className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-30" />
          <h3 className="text-2xl font-display font-semibold text-white">No history found</h3>
          <p className="text-muted-foreground font-mono mt-3 text-lg">The feed is currently empty. Be the first to decode a contract.</p>
          <Link href="/" className="inline-block mt-8 px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-mono transition-colors">
            Run an Analysis
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map((record, i) => {
            let badgeColor = "bg-success/10 text-success border-success/20";
            if (record.riskScore > 25) badgeColor = "bg-warning/10 text-warning border-warning/20";
            if (record.riskScore > 50) badgeColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
            if (record.riskScore > 75) badgeColor = "bg-destructive/10 text-destructive border-destructive/20";

            return (
              <Link key={record.id} href={`/analysis/${record.id}`} className="block h-full outline-none">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  className="bg-card/60 border border-card-border p-6 rounded-3xl hover:border-primary/50 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(0,229,255,0.15)] group h-full flex flex-col backdrop-blur-sm hover:bg-card/80"
                >
                  <div className="flex justify-between items-start mb-5 gap-4">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1">{record.network}</span>
                      <span className="font-mono text-sm text-white/80 group-hover:text-primary transition-colors truncate">
                        {record.input.length > 12 
                          ? `${record.input.slice(0, 6)}...${record.input.slice(-4)}` 
                          : record.input}
                      </span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold tracking-wider shrink-0 ${badgeColor}`}>
                      {record.riskScore}
                    </div>
                  </div>
                  
                  <p className="text-white/90 text-sm flex-1 leading-relaxed line-clamp-3 mb-6">
                    {record.summary}
                  </p>
                  
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5 group-hover:text-primary transition-colors font-bold uppercase tracking-wider">
                      View <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
