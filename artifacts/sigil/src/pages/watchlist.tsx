import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  AlertTriangle,
  Chrome,
  CheckCircle2,
  Download,
  ExternalLink,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Link } from 'wouter';
import {
  WATCHLIST_STORAGE_KEY,
  addWatchlistEntry,
  exportWatchlistEntries,
  importWatchlistEntries,
  statusFromApprovalSummary,
  updateWatchlistEntry,
  removeWatchlistEntry,
  type WatchlistEntry,
  type WatchlistKind,
  type WatchlistNetwork,
  type WatchlistStatus,
} from '@/lib/watchlist';

interface ApprovalHealthResponse {
  coverage: {
    status: 'limited' | 'unavailable';
    message: string;
  };
  summary: {
    healthScore: number;
    totalActive: number;
    unlimited: number;
    critical: number;
    high: number;
  };
}

const NETWORKS: Array<{ value: WatchlistNetwork; label: string }> = [
  { value: 'mainnet', label: 'Ethereum' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'base', label: 'Base' },
  { value: 'bsc', label: 'BNB Chain' },
  { value: 'sepolia', label: 'Sepolia' },
];

const KINDS: Array<{ value: WatchlistKind; label: string }> = [
  { value: 'wallet', label: 'Wallet' },
  { value: 'vault', label: 'Vault' },
  { value: 'multisig', label: 'Multisig' },
  { value: 'contract', label: 'Contract' },
];

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function statusCopy(status: WatchlistStatus): { label: string; classes: string; icon: typeof ShieldCheck } {
  if (status === 'clean') {
    return { label: 'Clean', classes: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200', icon: CheckCircle2 };
  }
  if (status === 'review') {
    return { label: 'Review', classes: 'border-yellow-500/25 bg-yellow-500/10 text-yellow-100', icon: ShieldAlert };
  }
  if (status === 'high-risk') {
    return { label: 'High risk', classes: 'border-red-500/30 bg-red-500/10 text-red-200', icon: AlertTriangle };
  }
  if (status === 'unavailable') {
    return { label: 'Unavailable', classes: 'border-white/15 bg-white/[0.06] text-white/58', icon: ShieldAlert };
  }
  return { label: 'Unchecked', classes: 'border-primary/25 bg-primary/10 text-primary', icon: ShieldCheck };
}

function networkLabel(network: WatchlistNetwork): string {
  return NETWORKS.find((item) => item.value === network)?.label ?? network;
}

function loadEntries(): WatchlistEntry[] {
  try {
    return importWatchlistEntries(JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function saveEntries(entries: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, exportWatchlistEntries(entries));
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => loadEntries());
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<WatchlistNetwork>('mainnet');
  const [kind, setKind] = useState<WatchlistKind>('wallet');
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const summary = useMemo(() => {
    return {
      total: entries.length,
      clean: entries.filter((entry) => entry.status === 'clean').length,
      review: entries.filter((entry) => entry.status === 'review').length,
      highRisk: entries.filter((entry) => entry.status === 'high-risk').length,
      unchecked: entries.filter((entry) => entry.status === 'unchecked').length,
    };
  }, [entries]);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const next = addWatchlistEntry(entries, { label, address, network, kind });
      setEntries(next);
      setLabel('');
      setAddress('');
      setKind('wallet');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this address.');
    }
  }

  async function refreshEntry(entry: WatchlistEntry) {
    setRefreshingId(entry.id);
    setError(null);

    try {
      const params = new URLSearchParams({ address: entry.address, network: entry.network });
      const response = await fetch(`/api/sigil/approvals/health?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as ApprovalHealthResponse | null;
      if (!response.ok || !payload) throw new Error('Watchlist refresh failed.');

      const status = statusFromApprovalSummary({
        coverageStatus: payload.coverage.status,
        totalActive: payload.summary.totalActive,
        high: payload.summary.high,
        critical: payload.summary.critical,
      });

      setEntries((current) =>
        updateWatchlistEntry(current, {
          ...entry,
          status,
          lastCheckedAt: new Date().toISOString(),
          approvalSummary: payload.summary,
          coverageStatus: payload.coverage.status,
          coverageMessage: payload.coverage.message,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Watchlist refresh failed.';
      setEntries((current) =>
        updateWatchlistEntry(current, {
          ...entry,
          status: 'unavailable',
          lastCheckedAt: new Date().toISOString(),
          coverageStatus: 'unavailable',
          coverageMessage: message,
        }),
      );
    } finally {
      setRefreshingId(null);
    }
  }

  async function refreshAll() {
    for (const entry of entries) {
      await refreshEntry(entry);
    }
  }

  function handleRemove(id: string) {
    setEntries((current) => removeWatchlistEntry(current, id));
  }

  function handleExport() {
    const blob = new Blob([exportWatchlistEntries(entries)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sigil-watchlist.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importWatchlistEntries(JSON.parse(text));
      const merged = imported.reduce((current, entry) => {
        if (current.some((existing) => existing.network === entry.network && existing.address === entry.address)) {
          return current;
        }
        return [entry, ...current];
      }, entries);
      setEntries(merged);
      setError(null);
    } catch {
      setError('Could not import this watchlist file.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Address Watchlist
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl font-display text-4xl font-bold tracking-normal text-white sm:text-5xl">
              Keep important addresses in one calm security view.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/58">
              Track wallets, vaults, multisigs, and contracts locally. Use Wallet Monitor for the higher-level hygiene score and fix-first checklist.
            </p>
          </div>

          <form onSubmit={handleAdd} className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/20">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_160px]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Label</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Treasury, vault, cold wallet..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-primary/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Network</span>
                <select
                  value={network}
                  onChange={(event) => setNetwork(event.target.value as WatchlistNetwork)}
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
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Type</span>
                <select
                  value={kind}
                  onChange={(event) => setKind(event.target.value as WatchlistKind)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition-colors focus:border-primary/50"
                >
                  {KINDS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-background text-white">
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/45">Address</span>
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
                className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl border border-primary/35 bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
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
              className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4 transition-colors hover:border-emerald-500/30"
            >
              <div className="flex items-start gap-3">
                <WalletCards className="mt-0.5 h-5 w-5 text-emerald-200" />
                <div>
                  <h2 className="text-sm font-bold text-white">Open Wallet Monitor</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Turn saved wallets into a hygiene score and prioritized cleanup list.
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/extension"
              className="rounded-2xl border border-primary/15 bg-primary/[0.06] p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <Chrome className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-white">Install live protection</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Keep Sigil beside your wallet for transaction and signature prompts.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/45">Watchlist</p>
              <p className="mt-2 text-5xl font-bold text-white">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-emerald-200">{summary.clean}</p>
              <p className="mt-1 text-xs text-white/40">Clean</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-yellow-100">{summary.review}</p>
              <p className="mt-1 text-xs text-white/40">Review</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-red-200">{summary.highRisk}</p>
              <p className="mt-1 text-xs text-white/40">High risk</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-primary">{summary.unchecked}</p>
              <p className="mt-1 text-xs text-white/40">Unchecked</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={refreshAll}
              disabled={entries.length === 0 || refreshingId !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={entries.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary"
            >
              <FileUp className="h-4 w-4" />
              Import JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </div>
        </aside>
      </section>

      <section className="space-y-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-10 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 text-lg font-bold text-white">No addresses yet</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
              Add the wallets, vaults, multisigs, or contracts you check most often. Everything stays in this browser unless you export it; Wallet Monitor can turn the same saved addresses into a cleanup dashboard.
            </p>
            <Link
              href="/monitor"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/50"
            >
              Open Wallet Monitor
              <WalletCards className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          entries.map((entry) => {
            const status = statusCopy(entry.status);
            const Icon = status.icon;
            const isRefreshing = refreshingId === entry.id;
            return (
              <article key={entry.id} className="rounded-2xl border border-white/10 bg-black/35 px-5 py-5 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${status.classes}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                        {networkLabel(entry.network)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs capitalize text-white/55">
                        {entry.kind}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-white">{entry.label}</h2>
                      <p className="mt-1 font-mono text-sm text-white/60">{entry.address}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/35">Active</p>
                        <p className="mt-1 text-sm font-semibold text-white">{entry.approvalSummary?.totalActive ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/35">Unlimited</p>
                        <p className="mt-1 text-sm font-semibold text-amber-200">{entry.approvalSummary?.unlimited ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/35">High</p>
                        <p className="mt-1 text-sm font-semibold text-red-200">{(entry.approvalSummary?.critical ?? 0) + (entry.approvalSummary?.high ?? 0) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/35">Health</p>
                        <p className="mt-1 text-sm font-semibold text-white">{entry.approvalSummary?.healthScore ?? '-'}</p>
                      </div>
                    </div>

                    <p className="max-w-3xl text-sm leading-relaxed text-white/50">
                      {entry.coverageMessage ??
                        (entry.lastCheckedAt
                          ? `Last checked ${new Date(entry.lastCheckedAt).toLocaleString()}`
                          : 'Not checked yet. Refresh to pull the latest approval-health status.')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => refreshEntry(entry)}
                      disabled={refreshingId !== null}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Check
                    </button>
                    <Link
                      href={`/approvals?address=${entry.address}&network=${entry.network}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      Approvals
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-white/45 transition-colors hover:border-red-500/30 hover:text-red-200"
                      aria-label={`Remove ${entry.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
