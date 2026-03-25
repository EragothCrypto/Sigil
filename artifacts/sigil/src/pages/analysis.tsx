import { useParams, Link } from 'wouter';
import { useGetAnalysisById } from '@workspace/api-client-react';
import { AnalysisResultView } from '@/components/sigil/AnalysisResultView';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useGetAnalysisById(id, {
    query: { enabled: !!id, retry: false }
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors mb-4 group cursor-pointer w-fit">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        BACK TO SCANNER
      </Link>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
          </div>
          <p className="font-mono text-primary animate-pulse tracking-[0.2em] uppercase text-sm">Retrieving payload...</p>
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-destructive/5 border border-destructive/20 rounded-3xl p-10 text-center max-w-lg shadow-2xl backdrop-blur-md">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-display font-bold text-destructive mb-4">Record Not Found</h2>
            <p className="text-white/70 font-mono text-sm leading-relaxed">
              The analysis record you are looking for does not exist in the registry or the link has expired.
            </p>
          </div>
        </div>
      ) : (
        <AnalysisResultView data={data as any} />
      )}
    </div>
  );
}
