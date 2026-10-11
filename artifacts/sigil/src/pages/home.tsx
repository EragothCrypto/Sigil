import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowRight, AlertTriangle, GraduationCap, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StreamingAnalysisView, type StreamPhase } from '@/components/sigil/StreamingAnalysisView';

const NETWORKS = [
  { value: 'mainnet',  label: 'Ethereum' },
  { value: 'polygon',  label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base',     label: 'Base' },
];

const EXAMPLES = [
  { label: 'USDC Contract',          value: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', warning: false },
  { label: 'Uniswap V2',             value: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', warning: false },
  { label: 'Tornado Cash (historical)', value: '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291', warning: true },
  { label: 'Euler Finance Exploit',  value: '0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d', warning: true },
];

export default function Home() {
  const [input, setInput] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [phase, setPhase] = useState<StreamPhase>({ kind: 'idle' });
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setShowOnboardingPrompt(localStorage.getItem('sigil:onboarding-complete') !== 'true');
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase({ kind: 'idle' });
  }, []);

  const handleAnalyzeValue = useCallback(async (trimmed: string) => {
    if (!trimmed) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setPhase({ kind: 'step1', label: 'Gathering on-chain signals…' });

    try {
      const response = await fetch('/api/sigil/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmed, network }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Analysis failed' }));
        setPhase({ kind: 'error', message: (err as { message?: string }).message || 'Analysis failed' });
        return;
      }

      if (!response.body) {
        setPhase({ kind: 'error', message: 'No response stream received' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      let terminalEvent = false;

      const handleEvent = (event: Record<string, unknown>) => {
        if (terminalEvent) return;
        const type = event.type as string;

        if (type === 'cached') {
          terminalEvent = true;
          toast({
            title: 'Cached result',
            description: 'Served from cache. No new AI call needed.',
            duration: 3000,
          });
          setLocation(`/analysis/${event.id}?cached=1`);
          return;
        }

        if (type === 'step') {
          const step = event.step as number;
          const label = event.label as string;
          if (step === 1) {
            setPhase({ kind: 'step1', label });
          } else {
            setPhase({ kind: 'validating', label });
          }
          return;
        }

        // Legacy preview events are not validated findings.
        if (type === 'metadata' || type === 'token') return;

        if (type === 'done') {
          terminalEvent = true;
          setLocation(`/analysis/${event.id}`);
          return;
        }

        if (type === 'error') {
          terminalEvent = true;
          setPhase({ kind: 'error', message: (event.message as string) || 'Analysis failed' });
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const json = line.slice(6).trim();
            if (!json || json === '[DONE]') continue;
            try {
              handleEvent(JSON.parse(json) as Record<string, unknown>);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
      if (!terminalEvent) setPhase({ kind: 'error', message: 'Analysis stream ended before validation completed. No risk verdict was produced. Please retry.' });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase({ kind: 'error', message: 'Connection failed. Please try again.' });
    }
  }, [network, setLocation, toast]);

  const handleAnalyze = useCallback(() => {
    handleAnalyzeValue(input.trim());
  }, [input, handleAnalyzeValue]);

  const isStreaming = phase.kind !== 'idle' && phase.kind !== 'error';

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 flex-1">
      {isStreaming ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <StreamingAnalysisView phase={phase} onCancel={handleCancel} />
        </div>
      ) : (
        <>
          <section aria-labelledby="check-heading">
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-8">
            <div>
            <h1 id="check-heading" className="text-2xl font-display font-semibold text-foreground">Check a transaction or contract</h1>
            <p className="mt-2 text-sm text-subtle">
              {NETWORKS.length} selectable EVM networks. Read-only. No wallet authorization.
            </p>
            </div>
            <section aria-labelledby="permissions-heading" className="border-l-2 border-primary-text pl-4">
              <Link href="/solana" className="console-link inline-flex min-h-11 items-center gap-3 text-xl font-display font-semibold">
                <span id="permissions-heading">Check wallet permissions</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <p className="mt-1 text-sm text-subtle">Solana legacy SPL Token delegates. Token-2022 and other authority types are not supported.</p>
            </section>
            </div>

            <form
              className="mt-5 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end"
              onSubmit={event => {
                event.preventDefault();
                handleAnalyze();
              }}
            >
              <div className="min-w-0">
                <label htmlFor="scan-network" className="mb-2 block text-sm font-medium text-foreground">Network</label>
                <select
                  id="scan-network"
                  value={network}
                  onChange={e => setNetwork(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                >
                  {NETWORKS.map(n => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="scan-input" className="mb-2 block text-sm font-medium text-foreground">Transaction hash or contract address</label>
                <input
                  id="scan-input"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="0x..."
                  autoCapitalize="none"
                  spellCheck={false}
                  className="h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="console-button entry-analyze inline-flex h-11 items-center justify-center gap-2"
              >
                Analyze
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            {phase.kind === 'error' && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {phase.message || 'Failed to analyze. Please verify the hash and network.'}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5">
              <span className="col-span-2 text-xs text-subtle">Examples (runs analysis):</span>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setInput(ex.value);
                    handleAnalyzeValue(ex.value);
                  }}
                  className="example-action inline-flex min-h-11 items-center justify-between gap-2 text-left text-sm text-primary-text"
                >
                  {ex.warning && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  {ex.label}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-subtle">Partial evidence. Not signing clearance. No warning does not mean safe.</p>
            <details className="mt-2 text-sm text-subtle" data-evidence>
              <summary className="min-h-8 inline-flex items-center console-link">Scope and limitations</summary>
            <p className="mt-2 leading-relaxed max-w-3xl">
              Review findings and coverage limits. Evidence may be partial or unavailable; unknown attacks may not be detected.
              No warning is not a safety guarantee or signing clearance. Scores are heuristics, not probabilities of loss.
            </p>
            </details>
          </section>

          {showOnboardingPrompt && (
            <aside aria-label="Onboarding" className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-subtle">
                <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
                <p>New to Sigil? Review approvals, signatures and report limits.</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href="/onboarding" className="inline-flex min-h-9 items-center gap-2 rounded-md text-sm font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                  Start onboarding
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('sigil:onboarding-complete', 'true');
                    setShowOnboardingPrompt(false);
                  }}
                  aria-label="Dismiss onboarding"
                  title="Dismiss onboarding"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-subtle transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </aside>
          )}

          <section aria-labelledby="evm-tools-heading" className="mt-6 border-t border-border pt-5">
            <h2 id="evm-tools-heading" className="text-base font-semibold text-foreground">EVM approval tools</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <Link href="/approvals" className="inline-flex min-h-9 items-center gap-2 rounded-md text-sm font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                  Review approval events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="text-sm leading-relaxed text-subtle">Review recorded approval events, not current allowances or effective rights.</p>
              </div>
              <div>
                <Link href="/monitor" className="inline-flex min-h-9 items-center gap-2 rounded-md text-sm font-medium text-primary-text hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
                  Review a wallet's approval events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="text-sm leading-relaxed text-subtle">Approval-event candidates with manual refresh, not background monitoring or complete history.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
