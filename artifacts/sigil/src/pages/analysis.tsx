import { useParams, Link, useLocation, useSearch } from 'wouter';
import { getGetAnalysisByIdQueryKey, useGetAnalysisById, useAnalyzeInput, type AnalyzeInputMutationError } from '@workspace/api-client-react';
import { AnalysisResultView } from '@/components/sigil/AnalysisResultView';
import { ArrowLeft, ShieldAlert, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;
  const reanalyzeRecordId = useRef<string | null>(null);
  const reanalyzeGeneration = useRef<number | null>(null);
  const currentRecordId = useRef(id);
  const navigationGeneration = useRef(0);
  if (currentRecordId.current !== id) navigationGeneration.current += 1;
  currentRecordId.current = id;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isCached = new URLSearchParams(search).get('cached') === '1';

  const { data, isLoading, isError } = useGetAnalysisById(id, {
    query: { queryKey: getGetAnalysisByIdQueryKey(id), enabled: !!id, retry: false }
  });

  const reanalyzeMutation = useAnalyzeInput<AnalyzeInputMutationError, { reportId: string | null; generation: number | null }>({
    mutation: {
      onMutate: () => ({ reportId: reanalyzeRecordId.current, generation: reanalyzeGeneration.current }),
      onSuccess: (freshData, _variables, context) => {
        if (!mounted.current || context?.reportId !== currentRecordId.current || context.generation !== navigationGeneration.current) return;
        if (!freshData || Array.isArray(freshData) || typeof freshData.id !== 'string'
          || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(freshData.id)
          || freshData.id.toLowerCase() === currentRecordId.current.toLowerCase()) {
          throw new Error('Fresh analysis response unavailable');
        }
        setLocation(`/analysis/${freshData.id}`);
      },
    }
  });

  const hasAnalysisData = Boolean(
    data &&
    !Array.isArray(data) &&
    typeof (data as { input?: unknown }).input === 'string',
  );
  const isCurrentReanalysis = hasAnalysisData && !isError && reanalyzeRecordId.current === id
    && reanalyzeGeneration.current === navigationGeneration.current;

  const handleReanalyze = () => {
    if (!hasAnalysisData) return;
    reanalyzeRecordId.current = id;
    reanalyzeGeneration.current = navigationGeneration.current;
    reanalyzeMutation.mutate({
      data: { input: (data as any).input, network: (data as any).network, fresh: true }
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-mono text-subtle hover:text-primary-text transition-colors group cursor-pointer w-fit"
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
            Previously saved report
          </span>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzeMutation.isPending}
            className="flex items-center gap-1.5 text-xs font-mono text-subtle hover:text-primary-text transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
            {reanalyzeMutation.isPending ? 'Analyzing…' : 'Re-analyze fresh'}
          </button>
        </motion.div>
      )}

      {isCurrentReanalysis && reanalyzeMutation.isPending && (
        <p role="status" className="text-sm text-subtle">Re-analysis in progress. The previous report is still shown.</p>
      )}
      {isCurrentReanalysis && reanalyzeMutation.isError && (
        <p role="alert" className="border-l-2 border-amber-400 pl-4 py-3 text-sm text-amber-200">Re-analysis unavailable. The previous report is still shown; no fresh assessment or signing clearance was produced.</p>
      )}

      {isLoading && (
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative w-12 h-12 rounded-xl border border-primary/25 bg-primary/8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
          <p className="font-mono text-subtle tracking-widest text-xs uppercase animate-pulse">Retrieving analysis…</p>
        </div>
      )}

      {!isLoading && (isError || !hasAnalysisData) && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[50vh]"
        >
          <div className="p-10 rounded-2xl border border-rose-500/15 bg-rose-500/5 text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-6 h-6 text-rose-400" strokeWidth={1.7} />
            </div>
            <h2 className="text-xl font-display font-bold text-rose-300 mb-3">Record Not Found</h2>
            <p className="text-subtle text-sm leading-relaxed">
              This analysis record doesn't exist or the link has expired.
            </p>
          </div>
        </motion.div>
      )}

      {!isLoading && !isError && hasAnalysisData && (
        <AnalysisResultView data={data as any} />
      )}
    </div>
  );
}
