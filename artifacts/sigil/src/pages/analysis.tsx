import { useParams, Link, useLocation, useSearch } from 'wouter';
import { getGetAnalysisByIdQueryKey, useGetAnalysisById, useAnalyzeInput, type AnalyzeInputMutationError } from '@workspace/api-client-react';
import { AnalysisResultView } from '@/components/sigil/AnalysisResultView';
import { ArrowLeft, ShieldAlert, History, RefreshCw } from 'lucide-react';
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
        Transaction check
      </Link>

      {/* ── Cached banner ── */}
      {isCached && !isLoading && data && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-border"
        >
          <span className="flex items-center gap-2 text-sm text-subtle">
            <History className="w-4 h-4 shrink-0" />
            Previously saved report
          </span>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzeMutation.isPending}
            className="flex items-center gap-1.5 min-h-8 text-sm text-subtle hover:text-primary-text transition-colors disabled:opacity-50 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text"
          >
            <RefreshCw className={`w-3 h-3 ${reanalyzeMutation.isPending ? 'animate-spin' : ''}`} />
            {reanalyzeMutation.isPending ? 'Analyzing…' : 'Re-analyze fresh'}
          </button>
        </div>
      )}

      {isCurrentReanalysis && reanalyzeMutation.isPending && (
        <p role="status" className="text-sm text-subtle">Re-analysis in progress. The previous report is still shown.</p>
      )}
      {isCurrentReanalysis && reanalyzeMutation.isError && (
        <p role="alert" className="border-l-2 border-amber-400 pl-4 py-3 text-sm text-amber-200">Re-analysis unavailable. The previous report is still shown; no fresh assessment or signing clearance was produced.</p>
      )}

      {isLoading && (
        <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <RefreshCw className="w-5 h-5 text-subtle animate-spin" />
          <p className="text-subtle text-sm">Retrieving analysis...</p>
        </div>
      )}

      {!isLoading && (isError || !hasAnalysisData) && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center min-h-[50vh]"
        >
          <div className="border-l-2 border-rose-400 pl-4 py-3 max-w-md">
            <div className="mb-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" strokeWidth={1.7} />
            </div>
            <h2 className="text-xl font-display font-bold text-rose-300 mb-3">Record Not Found</h2>
            <p className="text-subtle text-sm leading-relaxed">
              This analysis record doesn't exist or the link has expired.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && hasAnalysisData && (
        <AnalysisResultView data={data as any} />
      )}
    </div>
  );
}
