import { Share2, Twitter } from 'lucide-react';
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

const VERDICT_STYLE = {
  dangerous: {
    bg: 'bg-rose-500/8 hover:bg-rose-500/14',
    border: 'border-rose-500/20 hover:border-rose-500/35',
    text: 'text-rose-400',
    icon: 'text-rose-400',
  },
  caution: {
    bg: 'bg-amber-500/8 hover:bg-amber-500/14',
    border: 'border-amber-500/20 hover:border-amber-500/35',
    text: 'text-amber-400',
    icon: 'text-amber-400',
  },
  safe: {
    bg: 'bg-emerald-500/8 hover:bg-emerald-500/14',
    border: 'border-emerald-500/20 hover:border-emerald-500/35',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
  },
} as const;

export function ShareButton({ data }: { data: AnalysisResult }) {
  const report = parseValidatedReport(data.details);
  const verdict = (report?.version === 'findings-v2'
    ? report.decisionScore <= 25 ? 'safe' : report.decisionScore <= 60 ? 'caution' : 'dangerous'
    : data.verdict ?? 'caution') as keyof typeof VERDICT_STYLE;
  const style = VERDICT_STYLE[verdict] || VERDICT_STYLE.caution;

  const handleShare = () => {
    const text = buildTweetText(data);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <button
      onClick={handleShare}
      className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-200 cursor-pointer group ${style.bg} ${style.border}`}
    >
      <Share2 className={`w-4 h-4 ${style.icon} group-hover:scale-110 transition-transform`} strokeWidth={1.8} />
      <span className={`font-display font-semibold text-sm ${style.text}`}>
        Share This Transaction on
      </span>
      <Twitter className={`w-4 h-4 ${style.icon}`} strokeWidth={1.8} />
      <span className={`font-display font-semibold text-sm ${style.text}`}>
        X / Twitter
      </span>
    </button>
  );
}
