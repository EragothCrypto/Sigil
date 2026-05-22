import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Globe2, Search, ShieldAlert, ShieldCheck } from 'lucide-react';
import { evaluateSiteReputation, type SiteReputationResult } from '@/lib/site-reputation';

const EXAMPLES = [
  'https://app.uniswap.org',
  'https://uniswap-airdrop.example',
  'https://metamask-security-alert.example',
];

function verdictStyle(result: SiteReputationResult) {
  if (result.verdict === 'safe') {
    return {
      icon: CheckCircle2,
      badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
      score: 'text-emerald-300',
    };
  }
  if (result.verdict === 'dangerous') {
    return {
      icon: AlertTriangle,
      badge: 'border-red-500/30 bg-red-500/10 text-red-200',
      score: 'text-red-300',
    };
  }
  return {
    icon: ShieldAlert,
    badge: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-100',
    score: 'text-yellow-100',
  };
}

export default function SitesPage() {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('https://app.uniswap.org');
  const result = useMemo(() => evaluateSiteReputation(submitted), [submitted]);
  const style = verdictStyle(result);
  const Icon = style.icon;

  function handleCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(input.trim() || submitted);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Globe2 className="h-3.5 w-3.5" />
            Site Reputation
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl font-display text-4xl font-bold tracking-normal text-white sm:text-5xl">
              Check dApp domains before the wallet prompt.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/58">
              Sigil checks official-domain matches, local phishing indicators, campaign wording, and clone-like URLs without connecting a wallet.
            </p>
          </div>

          <form onSubmit={handleCheck} className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/20">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Domain or URL</span>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="https://app.example.xyz"
                  spellCheck={false}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 font-mono text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/50"
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl border border-primary/35 bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
                Check
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setInput(example);
                    setSubmitted(example);
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-white/50 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {example.replace(/^https?:\/\//, '')}
                </button>
              ))}
            </div>
          </form>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/45">Domain risk</p>
              <p className={`mt-2 text-5xl font-bold ${style.score}`}>{result.riskScore}</p>
            </div>
            <div className={`rounded-2xl border p-3 ${style.badge}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Host</p>
              <p className="mt-1 break-all font-mono text-sm text-white/80">{result.host || 'Unreadable domain'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Verdict</p>
              <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${style.badge}`}>
                {result.verdict}
              </span>
            </div>
            {result.brand && (
              <div>
                <p className="text-xs uppercase tracking-wide text-white/35">Brand signal</p>
                <p className="mt-1 text-sm font-semibold text-white">{result.brand}</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/35 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{result.summary}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
              Site reputation is a fast local check. It helps catch obvious clones and suspicious campaign domains, but it does not replace transaction simulation or contract analysis.
            </p>
          </div>
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
        </div>

        {result.warnings.length > 0 && (
          <div className="mt-5 space-y-2">
            {result.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/68">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" />
                {warning}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
