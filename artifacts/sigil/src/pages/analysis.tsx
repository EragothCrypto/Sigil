import { useParams, Link, useLocation } from 'wouter';
import { getGetAnalysisByIdQueryKey, useGetAnalysisById, useAnalyzeInput } from '@workspace/api-client-react';
import { AnalysisResultView } from '@/components/sigil/AnalysisResultView';
import { ArrowLeft, ShieldAlert, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;
  const [location, setLocation] = useLocation();
  const isCached = location.includes('cached=1');

  const { data, isLoading, isError } = useGetAnalysisById(id, {
    query: { queryKey: getGetAnalysisByIdQueryKey(id), enabled: !!id, retry: false }
  });

  const reanalyzeMutation = useAnalyzeInput({
    mutation: {
      onSuccess: (freshData) => setLocation(`/analysis/${freshData.id}`),
    }
  });

  const handleReanalyze = () => {
    if (!data) return;
    reanalyzeMutation.mutate({
      data: { input: data.input, network: data.network, fresh: true }
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-mono text-white/30 hover:text-primary transition-colors group cursor-pointer w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Scanner
      </Link>

      {/* ── Cached banner ── */}
      {isCached && !isLoading && data && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/6"
        >
          <span className="flex items-center gap-2 text-xs font-mono text-violet-300">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            Instant result — served from cache
          </span>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzeMutation.isPending}
            className="flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
            {reanalyzeMutation.isPending ? 'Analyzing…' : 'Re-analyze fresh'}
          </button>
        </motion.div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl border border-primary/25 bg-primary/8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
          <p className="font-mono text-white/30 tracking-widest text-xs uppercase animate-pulse">Retrieving analysis…</p>
        </div>
      )}

      {!isLoading && (isError || !data) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[50vh]"
        >
          <div className="p-10 rounded-2xl border border-rose-500/15 bg-rose-500/5 text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-6 h-6 text-rose-400" strokeWidth={1.7} />
            </div>
            <h2 className="text-xl font-display font-bold text-rose-300 mb-3">Record Not Found</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              This analysis record doesn't exist or the link has expired.
            </p>
          </div>
        </motion.div>
      )}

      {!isLoading && !isError && data && (
        <AnalysisResultView data={data as any} />
      )}
    </div>
  );
}
