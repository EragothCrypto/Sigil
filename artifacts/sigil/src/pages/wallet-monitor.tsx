import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Chrome,
  CheckCircle2,
  Crown,
  ListChecks as ListIcon,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { buildWalletMonitorReport, type WalletMonitorRiskLevel } from "@/lib/wallet-monitor";
import {
  WATCHLIST_STORAGE_KEY,
  addWatchlistEntry,
  exportWatchlistEntries,
  importWatchlistEntries,
  removeWatchlistEntry,
  statusFromApprovalSummary,
  updateWatchlistEntry,
  type WatchlistEntry,
  type WatchlistKind,
  type WatchlistNetwork,
  type WatchlistStatus,
} from "@/lib/watchlist";

interface ApprovalHealthResponse {
  coverage: {
    status: "limited" | "unavailable";
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
  { value: "mainnet", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
  { value: "bsc", label: "BNB Chain" },
  { value: "sepolia", label: "Sepolia" },
];

const KINDS: Array<{ value: WatchlistKind; label: string }> = [
  { value: "wallet", label: "Wallet" },
  { value: "vault", label: "Vault" },
  { value: "multisig", label: "Multisig" },
];

function loadEntries(): WatchlistEntry[] {
  try {
    return importWatchlistEntries(JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function saveEntries(entries: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, exportWatchlistEntries(entries));
}

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function networkLabel(network: WatchlistNetwork): string {
  return NETWORKS.find((item) => item.value === network)?.label ?? network;
}

function statusCopy(status: WatchlistStatus): { label: string; classes: string; icon: typeof ShieldCheck } {
  if (status === "clean") {
    return { label: "No flags", classes: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200", icon: CheckCircle2 };
  }
  if (status === "review") {
    return { label: "Review", classes: "border-yellow-500/25 bg-yellow-500/10 text-yellow-100", icon: ShieldAlert };
  }
  if (status === "high-risk") {
    return { label: "High risk", classes: "border-red-500/30 bg-red-500/10 text-red-200", icon: AlertTriangle };
  }
  if (status === "unavailable") {
    return { label: "Unavailable", classes: "border-white/15 bg-white/[0.06] text-white/58", icon: ShieldAlert };
  }
  return { label: "Unchecked", classes: "border-primary/25 bg-primary/10 text-primary-text", icon: ShieldCheck };
}

function riskCopy(risk: WalletMonitorRiskLevel): { label: string; classes: string } {
  if (risk === "critical") return { label: "Critical", classes: "border-red-500/30 bg-red-500/10 text-red-200" };
  if (risk === "high") return { label: "High", classes: "border-red-500/30 bg-red-500/10 text-red-200" };
  if (risk === "medium") return { label: "Medium", classes: "border-yellow-500/25 bg-yellow-500/10 text-yellow-100" };
  return { label: "Low", classes: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" };
}

function scoreTone(score: number | null): string {
  if (score === null) return "text-subtle";
  if (score >= 75) return "text-emerald-300";
  if (score >= 45) return "text-yellow-200";
  return "text-red-300";
}

export default function WalletMonitorPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => loadEntries());
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<WatchlistNetwork>("mainnet");
  const [kind, setKind] = useState<WatchlistKind>("wallet");
  const [error, setError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const report = useMemo(() => buildWalletMonitorReport(entries), [entries]);
  const risk = riskCopy(report.riskLevel);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const next = addWatchlistEntry(entries, { label, address, network, kind });
      setEntries(next);
      setLabel("");
      setAddress("");
      setKind("wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this wallet.");
    }
  }

  async function refreshEntry(entry: WatchlistEntry) {
    setRefreshingId(entry.id);
    setError(null);

    try {
      const params = new URLSearchParams({ address: entry.address, network: entry.network });
      const response = await fetch(`/api/sigil/approvals/health?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as ApprovalHealthResponse | null;
      if (!response.ok || !payload) throw new Error("Wallet monitor refresh failed.");

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
      const message = err instanceof Error ? err.message : "Wallet monitor refresh failed.";
      setEntries((current) =>
        updateWatchlistEntry(current, {
          ...entry,
          status: "unavailable",
          lastCheckedAt: new Date().toISOString(),
          coverageStatus: "unavailable",
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

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-text">
            <Crown className="h-3.5 w-3.5" />
            Sigil Wallet Monitor
          </div>

          <div className="space-y-4">
            <h1 className="max-w-4xl font-display text-4xl font-bold tracking-normal text-white sm:text-5xl">
              Recorded approval events, sorted for review.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/58">
              Save public wallets for event review. Manual refresh sends the selected address and network to Sigil's API and explorer providers. Current allowances are not established; the local heuristic is not a wallet safety assessment.
            </p>
          </div>

          <form onSubmit={handleAdd} className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/20">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_150px]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">Label</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Main wallet, vault, multisig..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition-colors placeholder:text-subtle focus:border-primary/50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">Network</span>
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
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">Type</span>
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
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">Public wallet address</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="0x..."
                  spellCheck={false}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 font-mono text-sm text-white outline-none transition-colors placeholder:text-subtle focus:border-primary/50"
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-xl border border-primary/35 bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add wallet
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
              href="/extension"
              className="rounded-2xl border border-primary/15 bg-primary/[0.06] p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                <Chrome className="mt-0.5 h-5 w-5 text-primary-text" />
                <div>
                  <h2 className="text-sm font-bold text-white">Review the next signing prompt</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Wallet Monitor reviews recorded event candidates; the extension adds best-effort advisory context to compatible requests.
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/watchlist"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-primary/25"
            >
              <div className="flex items-start gap-3">
                <ListIcon className="mt-0.5 h-5 w-5 text-white/65" />
                <div>
                  <h2 className="text-sm font-bold text-white">Manage saved addresses</h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/48">
                    Import, export, and organize wallets, vaults, multisigs, and contracts.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-subtle">Event-review heuristic</p>
              <p className={`mt-2 text-6xl font-bold ${scoreTone(report.eventCoverageComplete ? report.hygieneScore : null)}`}>
                {report.eventCoverageComplete ? report.hygieneScore : "--"}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${report.eventCoverageComplete ? risk.classes : "border-white/15 bg-white/[0.06] text-subtle"}`}>
              {report.eventCoverageComplete ? risk.label : "Coverage incomplete"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-white">{report.totalWallets}</p>
              <p className="mt-1 text-xs text-subtle">Wallets</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-amber-200">{report.eventCoverageComplete ? report.unlimitedApprovals : "--"}</p>
              <p className="mt-1 text-xs text-subtle">Large values</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
              <p className="text-2xl font-bold text-red-200">{report.eventCoverageComplete ? report.criticalOrHighApprovals : "--"}</p>
              <p className="mt-1 text-xs text-subtle">Flagged events</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={refreshAll}
              disabled={entries.length === 0 || refreshingId !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-primary-text transition-colors hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh all
            </button>
            <Link
              href="/watchlist"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary-text"
            >
              Watchlist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-subtle">Fix this first</p>
              <h2 className="mt-1 text-2xl font-bold text-white">Priority checklist</h2>
            </div>
            <ShieldAlert className="h-5 w-5 text-primary-text" />
          </div>

          <div className="mt-5 space-y-3">
            {report.fixFirst.slice(0, 5).map((item) => (
              <div key={`${item.kind}-${item.entryId ?? "global"}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/52">{item.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-subtle">
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-10 text-center">
              <Wallet className="mx-auto h-9 w-9 text-primary-text" />
              <h2 className="mt-4 text-lg font-bold text-white">No monitored wallets yet</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
                Add a public wallet address to start building a local monitor report.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const status = statusCopy(entry.status);
              const hasEventCoverage = entry.coverageStatus === "limited";
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
                        <h3 className="text-xl font-bold text-white">{entry.label}</h3>
                        <p className="mt-1 font-mono text-sm text-white/60">{entry.address}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-subtle">Event candidates</p>
                          <p className="mt-1 text-sm font-semibold text-white">{hasEventCoverage ? entry.approvalSummary?.totalActive ?? "-" : "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-subtle">Large values</p>
                          <p className="mt-1 text-sm font-semibold text-amber-200">{hasEventCoverage ? entry.approvalSummary?.unlimited ?? "-" : "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-subtle">Flagged events</p>
                          <p className="mt-1 text-sm font-semibold text-red-200">{hasEventCoverage ? (entry.approvalSummary?.critical ?? 0) + (entry.approvalSummary?.high ?? 0) : "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-subtle">Event heuristic</p>
                          <p className="mt-1 text-sm font-semibold text-white">{hasEventCoverage ? entry.approvalSummary?.healthScore ?? "-" : "-"}</p>
                        </div>
                      </div>

                      <p className="max-w-3xl text-sm leading-relaxed text-white/50">
                        {entry.coverageMessage ??
                          (hasEventCoverage
                            ? "Saved event summary; not a verified scan or current allowance assessment."
                            : entry.status === "unavailable"
                              ? "Saved scan coverage is unavailable; no current allowance assessment."
                              : entry.lastCheckedAt
                            ? `Last checked ${new Date(entry.lastCheckedAt).toLocaleString()}`
                            : "Not checked yet.")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => refreshEntry(entry)}
                        disabled={refreshingId !== null}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-primary-text transition-colors hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Check
                      </button>
                      <Link
                        href={`/approvals?address=${entry.address}&network=${entry.network}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-sm font-semibold text-white/70 transition-colors hover:border-primary/30 hover:text-primary-text"
                      >
                        Approvals
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEntries((current) => removeWatchlistEntry(current, entry.id))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.05] text-subtle transition-colors hover:border-red-500/30 hover:text-red-200"
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
        </div>
      </section>
    </div>
  );
}
