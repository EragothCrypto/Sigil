import { useParams, Link } from 'wouter';
import { useGetAnalysisById } from '@workspace/api-client-react';
import { AnalysisResultView } from '@/components/sigil/AnalysisResultView';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useGetAnalysisById(id, {
    query: { enabled: !!id, retry: false }
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-mono text-white/30 hover:text-primary transition-colors group cursor-pointer w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Scanner
      </Link>

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
