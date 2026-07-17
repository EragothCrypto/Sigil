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
  let scoredCount = 0;
  let totalScore = 0;
  let uncheckedPenalty = 0;
  let unavailablePenalty = 0;
  let highRiskPenalty = 0;

  // ⚡ Bolt: Use a single O(N) pass to compute scores and penalties instead of multiple filter/reduce calls.
  for (const entry of entries) {
    if (entry.approvalSummary) {
      scoredCount++;
      totalScore += entry.approvalSummary.healthScore ?? 0;
    }
    if (entry.status === "unchecked") uncheckedPenalty += 3;
    else if (entry.status === "unavailable") unavailablePenalty += 7;
    else if (entry.status === "high-risk") highRiskPenalty += 5;
  }

  if (scoredCount === 0) return null;

  const average = totalScore / scoredCount;
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
  const networks = new Set<string>();
  let checkedWallets = 0;
  let uncheckedWallets = 0;
  let unavailableWallets = 0;
  let highRiskWallets = 0;
  let reviewWallets = 0;
  let cleanWallets = 0;

  let activeApprovals = 0;
  let unlimitedApprovals = 0;
  let criticalOrHighApprovals = 0;

  const fixes: WalletMonitorFix[] = [];

  // ⚡ Bolt: Use a single O(N) pass to gather all metrics and fixes instead of 11 consecutive array traversals.
  for (const entry of entries) {
    networks.add(entry.network);

    if (entry.lastCheckedAt) checkedWallets++;

    if (entry.status === "unchecked") uncheckedWallets++;
    else if (entry.status === "unavailable") unavailableWallets++;
    else if (entry.status === "high-risk") highRiskWallets++;
    else if (entry.status === "review") reviewWallets++;
    else if (entry.status === "clean") cleanWallets++;

    if (entry.approvalSummary) {
      activeApprovals += entry.approvalSummary.totalActive ?? 0;
      unlimitedApprovals += entry.approvalSummary.unlimited ?? 0;
      criticalOrHighApprovals += (entry.approvalSummary.critical ?? 0) + (entry.approvalSummary.high ?? 0);
    }

    addFixesForEntry(entry, fixes);
  }

  const hygieneScore = scoreEntries(entries);

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
