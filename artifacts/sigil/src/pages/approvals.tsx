import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Chrome,
  CheckCircle2,
  ExternalLink,
  Infinity,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
type CoverageStatus = 'limited' | 'unavailable';

interface KnownEntity {
  name: string;
  category: string;
  trustLevel: 'trusted' | 'caution' | 'unknown' | 'dangerous';
  url: string;
  description: string;
  logoLetter: string;
}

interface ApprovalHealthItem {
  id: string;
  token: string;
  spender: string;
  spenderEntity: KnownEntity | null;
  amountRaw: string;
  amountLabel: string;
  isUnlimited: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  trustLevel: 'trusted' | 'caution' | 'unknown' | 'dangerous';
  recommendation: string;
  blockNumber: string;
  transactionHash: string;
  timestamp: string | null;
  explorerUrl: string;
  revokeUrl: string;
}

interface ApprovalHealthResponse {
  wallet: string;
  network: string;
  generatedAt: string;
  coverage: {
    status: CoverageStatus;
    message: string;
  };
  summary: {
    healthScore: number;
    totalActive: number;
    unlimited: number;
    critical: number;
    high: number;
  };
  approvals: ApprovalHealthItem[];
  revokeUrl: string;
}

const NETWORKS = [
  { value: 'mainnet', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' },
  { value: 'bsc', label: 'BNB Chain' },
  { value: 'sepolia', label: 'Sepolia' },
];

const EXAMPLE_WALLETS = [
  '0x0000000000000000000000000000000000000000',
  '0x1111111111111111111111111111111111111111',
];

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function riskClasses(level: RiskLevel): string {
  if (level === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-200';
  if (level === 'high') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (level === 'medium') return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-100';
  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
}

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-300';
  if (score >= 45) return 'text-yellow-200';
  return 'text-red-300';
}

function validateAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function ApprovalRow({ approval }: { approval: ApprovalHealthItem }) {
  const entity = approval.spenderEntity;

  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 px-5 py-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${riskClasses(approval.riskLevel)}`}>
              {approval.isUnlimited && <Infinity className="h-3.5 w-3.5" />}
              {approval.riskLevel}
            </span>
            {entity ? (
              <a
                href={entity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary transition-colors hover:border-primary/50"
              >
                <span className="font-mono text-xs">{entity.logoLetter}</span>
                {entity.name}
                {entity.trustLevel === 'trusted' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
              </a>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/55">
                Unknown spender
              </span>
            )}
          </div>

          <div>
            <p className="text-sm text-white/45">Spender</p>
            <a
              href={approval.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-2 font-mono text-sm text-white/85 transition-colors hover:text-primary"
            >
              <span className="truncate">{approval.spender}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Token contract</p>
              <p className="mt-1 font-mono text-sm text-white/70">{shortAddress(approval.token)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Allowance</p>
              <p className="mt-1 font-mono text-sm text-white/80">{approval.amountLabel}</p>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-white/62">{approval.recommendation}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left lg:text-right">
            <p className="text-xs uppercase tracking-wide text-white/35">Risk score</p>
            <p className="mt-1 text-2xl font-bold text-white">{approval.riskScore}</p>
          </div>
          <a
            href={approval.revokeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/12 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/55 hover:bg-primary/18"
          >
            Open revoke
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function ApprovalsPage() {
  const initialParams = new URLSearchParams(window.location.search);
  const initialNetwork = initialParams.get('network');
  const [address, setAddress] = useState(initialParams.get('address') ?? '');
  const [network, setNetwork] = useState(
    NETWORKS.some((item) => item.value === initialNetwork) ? initialNetwork as string : 'mainnet',
  );
  const [result, setResult] = useState<ApprovalHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = useMemo(() => validateAddress(address), [address]);

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isValid) {
      setError('Paste a valid EVM wallet address to scan approvals.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ address: address.trim(), network });
      const response = await fetch(`/api/sigil/approvals/health?${params.toString()}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Approval scan failed.');
      }

      setResult(payload as ApprovalHealthResponse);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Approval scan failed.');
    } finally {
      setLoading(false);
    }
  }

  const hasApprovals = (result?.approvals.length ?? 0) > 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Approval Health Check
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl font-display text-4xl font-bold tracking-normal text-white sm:text-5xl">
              Find wallet approvals worth cleaning up.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/58">
              Paste a wallet address, scan approval events on the selected EVM network, and spot unlimited or unknown spender permissions before they become daily-use baggage.
            </p>
          </div>

          <form onSubmit={handleScan} className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/20">
            <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Network</span>
                <select
                  value={network}
                  onChange={(event) => setNetwork(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition-colors focus:border-primary/50"
                >
                  {NETWORKS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-background text-white">
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Wallet address</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="0x..."
                  spellCheck={false}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 font-mono text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/50"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-0 inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl border border-primary/35 bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Scan
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_WALLETS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setAddress(example)}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-white/50 transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {shortAddress(example)}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                {error}
              </div>
            )}
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/monitor"
              className="group rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 transition-colors hover:border-emerald-500/30"
            >
              <div className="flex items-start gap-3">
                <WalletCards className="mt-0.5 h-5 w-5 text-emerald-200" />
                <div>
                  <h2 className="text-sm font-bold text-white">Monitor this wallet over time</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Save important wallets and keep a hygiene score plus fix-first checklist.
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/extension"
              className="group rounded-2xl border border-primary/15 bg-primary/[0.06] p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <Chrome className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-white">Catch risky approvals before signing</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Install the Chrome extension so Sigil reviews approval prompts in the wallet flow.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/45">Wallet health</p>
              <p className={`mt-2 text-5xl font-bold ${result ? scoreTone(result.summary.healthScore) : 'text-white/35'}`}>
                {result ? result.summary.healthScore : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              {result?.summary.healthScore && result.summary.healthScore >= 65 ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-white">{result?.summary.totalActive ?? 0}</p>
              <p className="mt-1 text-xs text-white/40">Active</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-amber-200">{result?.summary.unlimited ?? 0}</p>
              <p className="mt-1 text-xs text-white/40">Unlimited</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-red-200">{(result?.summary.critical ?? 0) + (result?.summary.high ?? 0)}</p>
              <p className="mt-1 text-xs text-white/40">High risk</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-white/35">Coverage</p>
            <p className="mt-2 text-sm leading-relaxed text-white/58">
              {result?.coverage.message ?? 'Ready to scan explorer approval logs for the selected network.'}
            </p>
          </div>
        </motion.aside>
      </section>

      {result && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-white/45">Scan result</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{shortAddress(result.wallet)} on {NETWORKS.find((item) => item.value === result.network)?.label ?? result.network}</h2>
            </div>
            <a
              href={result.revokeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/75 transition-colors hover:border-primary/35 hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Open wallet cleanup
            </a>
          </div>

          {!hasApprovals && (
            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-8 text-center">
              <ShieldCheck className="mx-auto h-9 w-9 text-emerald-300" />
              <h3 className="mt-4 text-lg font-bold text-white">No active approvals returned</h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                This scan did not return active non-zero approval events. Because explorer-log coverage is best effort, verify sensitive wallets with a dedicated revoke interface before assuming the wallet is fully clean.
              </p>
            </div>
          )}

          {hasApprovals && (
            <div className="space-y-3">
              {result.approvals.map((approval) => (
                <ApprovalRow key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
