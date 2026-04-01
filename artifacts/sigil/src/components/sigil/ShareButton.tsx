import { Share2, Twitter } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react';

function buildTweetText(data: AnalysisResult): string {
  const appUrl = window.location.origin;
  const verdict = data.verdict ?? 'caution';

  const topPattern = data.patterns?.[0];
  const patternNote = topPattern
    ? topPattern.type === 'drainer'
      ? 'It matches patterns from known wallet drainers.'
      : topPattern.type === 'honeypot'
      ? 'It matches a honeypot token pattern.'
      : topPattern.type === 'fake_approval'
      ? 'It hides a token approval inside a harmless-looking signature.'
      : topPattern.type === 'rug_pull'
      ? 'It has rug pull indicators.'
      : `It matches a ${topPattern.name} pattern.`
    : null;

  const shortInput =
    data.input.length > 20
      ? `${data.input.slice(0, 10)}…${data.input.slice(-6)}`
      : data.input;

  let tweet = '';

  if (verdict === 'dangerous') {
    tweet = `🚨 This transaction looked normal but Sigil flagged it as DANGEROUS (risk ${data.riskScore}/100).\n\n`;
    if (patternNote) tweet += `${patternNote}\n\n`;
    tweet += `"${data.verdictReason}"\n\n`;
    tweet += `Always decode before you sign 👇\n${appUrl}`;
  } else if (verdict === 'caution') {
    tweet = `⚠️ Ran this transaction through Sigil. Verdict: Proceed with Caution (risk ${data.riskScore}/100).\n\n`;
    tweet += `"${data.verdictReason}"\n\n`;
    tweet += `Decode any tx before signing 👇\n${appUrl}`;
  } else {
    tweet = `✅ Just verified a transaction with Sigil — risk score ${data.riskScore}/100. Came back clean.\n\n`;
    tweet += `"${data.summary}"\n\n`;
    tweet += `${appUrl} — decode any tx before you sign it.`;
  }

  if (tweet.length > 270) {
    const cutAt = tweet.lastIndexOf('\n', 250);
    tweet = tweet.slice(0, cutAt > 0 ? cutAt : 250) + `\n\n${appUrl}`;
  }

  return tweet;
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
  const verdict = (data.verdict ?? 'caution') as keyof typeof VERDICT_STYLE;
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
