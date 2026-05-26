import type { WatchlistEntry } from "./watchlist";

export type WalletMonitorRiskLevel = "low" | "medium" | "high" | "critical";

export type WalletMonitorFixKind =
  | "high-risk-approvals"
  | "unlimited-approvals"
  | "unchecked-wallet"
  | "coverage-unavailable"
  | "maintenance";

export interface WalletMonitorFix {
  kind: WalletMonitorFixKind;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  entryId?: string;
}

export interface WalletMonitorReport {
  totalWallets: number;
  networksMonitored: number;
  checkedWallets: number;
  uncheckedWallets: number;
  unavailableWallets: number;
  highRiskWallets: number;
  reviewWallets: number;
  cleanWallets: number;
  activeApprovals: number;
  unlimitedApprovals: number;
  criticalOrHighApprovals: number;
  hygieneScore: number | null;
  riskLevel: WalletMonitorRiskLevel;
  fixFirst: WalletMonitorFix[];
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskLevelFromScore(score: number | null, highRiskWallets: number): WalletMonitorRiskLevel {
  if (highRiskWallets > 0 || (score !== null && score < 45)) return "high";
  if (score !== null && score < 70) return "medium";
  return "low";
}

function scoreEntries(entries: WatchlistEntry[]): number | null {
  const scored = entries.filter((entry) => entry.approvalSummary);
  if (!scored.length) return null;

  const average =
    scored.reduce((total, entry) => total + (entry.approvalSummary?.healthScore ?? 0), 0) / scored.length;
  const uncheckedPenalty = entries.filter((entry) => entry.status === "unchecked").length * 3;
  const unavailablePenalty = entries.filter((entry) => entry.status === "unavailable").length * 7;
  const highRiskPenalty = entries.filter((entry) => entry.status === "high-risk").length * 5;

  return clampScore(average - uncheckedPenalty - unavailablePenalty - highRiskPenalty);
}

function addFixesForEntry(entry: WatchlistEntry, fixes: WalletMonitorFix[]) {
  const summary = entry.approvalSummary;
  const riskyApprovals = (summary?.critical ?? 0) + (summary?.high ?? 0);

  if (riskyApprovals > 0) {
    fixes.push({
      kind: "high-risk-approvals",
      priority: summary?.critical ? "critical" : "high",
      title: `Review high-risk approvals on ${entry.label}`,
      description: `${riskyApprovals} critical or high-risk approvals need attention before this wallet is considered healthy.`,
      entryId: entry.id,
    });
  }

  if ((summary?.unlimited ?? 0) > 0) {
    fixes.push({
      kind: "unlimited-approvals",
      priority: "high",
      title: `Reduce unlimited approvals on ${entry.label}`,
      description: `${summary?.unlimited} unlimited approvals can keep token exposure open after you leave a dApp.`,
      entryId: entry.id,
    });
  }

  if (entry.status === "unchecked") {
    fixes.push({
      kind: "unchecked-wallet",
      priority: "medium",
      title: `Run first scan for ${entry.label}`,
      description: "This wallet is saved but has not been checked yet.",
      entryId: entry.id,
    });
  }

  if (entry.status === "unavailable") {
    fixes.push({
      kind: "coverage-unavailable",
      priority: "medium",
      title: `Verify coverage for ${entry.label}`,
      description: entry.coverageMessage || "Explorer coverage was unavailable during the latest scan.",
      entryId: entry.id,
    });
  }
}

function sortFixes(fixes: WalletMonitorFix[]): WalletMonitorFix[] {
  const weights: Record<WalletMonitorFix["priority"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return fixes.sort((a, b) => weights[a.priority] - weights[b.priority]);
}

export function buildWalletMonitorReport(entries: WatchlistEntry[]): WalletMonitorReport {
  const networks = new Set(entries.map((entry) => entry.network));
  const checkedWallets = entries.filter((entry) => Boolean(entry.lastCheckedAt)).length;
  const uncheckedWallets = entries.filter((entry) => entry.status === "unchecked").length;
  const unavailableWallets = entries.filter((entry) => entry.status === "unavailable").length;
  const highRiskWallets = entries.filter((entry) => entry.status === "high-risk").length;
  const reviewWallets = entries.filter((entry) => entry.status === "review").length;
  const cleanWallets = entries.filter((entry) => entry.status === "clean").length;

  const activeApprovals = entries.reduce((total, entry) => total + (entry.approvalSummary?.totalActive ?? 0), 0);
  const unlimitedApprovals = entries.reduce((total, entry) => total + (entry.approvalSummary?.unlimited ?? 0), 0);
  const criticalOrHighApprovals = entries.reduce(
    (total, entry) => total + (entry.approvalSummary?.critical ?? 0) + (entry.approvalSummary?.high ?? 0),
    0,
  );
  const hygieneScore = scoreEntries(entries);
  const fixes: WalletMonitorFix[] = [];

  entries.forEach((entry) => addFixesForEntry(entry, fixes));

  if (!fixes.length) {
    fixes.push({
      kind: "maintenance",
      priority: "low",
      title: entries.length ? "Keep monitoring on a regular cadence" : "Add a wallet to start monitoring",
      description: entries.length
        ? "No urgent approval exposure is visible from the latest scans."
        : "Paste a public wallet address to build your first Sigil Wallet Monitor report.",
    });
  }

  return {
    totalWallets: entries.length,
    networksMonitored: networks.size,
    checkedWallets,
    uncheckedWallets,
    unavailableWallets,
    highRiskWallets,
    reviewWallets,
    cleanWallets,
    activeApprovals,
    unlimitedApprovals,
    criticalOrHighApprovals,
    hygieneScore,
    riskLevel: riskLevelFromScore(hygieneScore, highRiskWallets),
    fixFirst: sortFixes(fixes),
  };
}
