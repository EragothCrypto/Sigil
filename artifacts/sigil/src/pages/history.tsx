import { useGetAnalysisHistory } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Activity, ArrowRight, Shield, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

function riskConfig(score: number) {
  if (score > 75) return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'HIGH' };
  if (score > 50) return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'MED' };
  if (score > 25) return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'LOW' };
  return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'SAFE' };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncateInput(input: string) {
  if (input.length <= 14) return input;
  return `${input.slice(0, 6)}…${input.slice(-4)}`;
}

export default function HistoryPage() {
  const { data, isLoading } = useGetAnalysisHistory({ limit: 50 });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" strokeWidth={1.7} />
            </div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Global Intel Feed</h1>
          </div>
          <p className="text-sm text-white/35 pl-12">Real-time feed of decoded contracts and transactions.</p>
        </div>

        {data && data.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-primary/80">{data.length} records</span>
          </div>
        )}
      </motion.div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-white/5 bg-white/2 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!data || data.length === 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 rounded-2xl border border-white/5 bg-white/1"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center mb-6">
            <Shield className="w-7 h-7 text-primary/40" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl font-semibold text-white/60 mb-2">Feed is empty</h3>
          <p className="text-sm text-white/25 mb-8">Be the first to decode a contract or transaction.</p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
          >
            Open Scanner
          </Link>
        </motion.div>
      )}

      {/* Cards grid */}
      {!isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((record, i) => {
            const risk = riskConfig(record.riskScore);
            const isContract = /^0x[a-fA-F0-9]{40}$/.test(record.input);

            return (
              <Link key={record.id} href={`/analysis/${record.id}`} className="block outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="relative h-full flex flex-col p-5 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/4 hover:border-primary/20 transition-all duration-200 group cursor-pointer overflow-hidden"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">
                        {record.network} · {isContract ? 'CONTRACT' : 'TX'}
                      </div>
                      <div className="font-mono text-sm text-white/70 group-hover:text-primary transition-colors truncate">
                        {truncateInput(record.input)}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shrink-0 ${risk.bg} ${risk.border}`}>
                      <span className={`text-xs font-mono font-bold ${risk.color}`}>{record.riskScore}</span>
                      <span className={`text-[9px] font-mono font-semibold tracking-wider ${risk.color} opacity-60`}>{risk.label}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-white/55 leading-relaxed line-clamp-3 flex-1 mb-4">
                    {record.summary}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-white/25 font-mono">
                      <Clock className="w-3 h-3" />
                      {timeAgo(record.createdAt)}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-white/25 font-mono group-hover:text-primary transition-colors">
                      View
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
