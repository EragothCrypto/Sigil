import { Share2 } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react';
import { parseValidatedReport } from '@/lib/validated-report';

function buildTweetText(data: AnalysisResult): string {
  const appUrl = window.location.origin;
  const report = parseValidatedReport(data.details);
  let status = 'Legacy or unvalidated report. Review current evidence before relying on it.';
  if (report?.version === 'findings-v1') {
    status = 'Legacy validated report with narrower coverage.';
  } else if (report?.version === 'findings-v2') {
    const finding = report.findings.some(item => item.category === 'risk')
      ? 'Attributed risk findings recorded.'
      : 'No concrete risk findings in acquired data.';
    const coverage = report.coverage === 'complete_for_supported_checks' ? 'supported checks only' : report.coverage;
    status = `${finding} Coverage: ${coverage}.`;
  }
  // Share only bounded status and the app origin, never private IDs or model-authored narrative.
  return `Sigil: ${status} No safety guarantee or signing clearance.\n${appUrl}`;
}

export function ShareButton({ data }: { data: AnalysisResult }) {
  const handleShare = () => {
    const text = buildTweetText(data);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      title="Share report on X"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-subtle hover:text-foreground hover:bg-accent transition-colors text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text"
    >
      <Share2 className="w-4 h-4 shrink-0" strokeWidth={1.8} />
      Share report on X
    </button>
  );
}
