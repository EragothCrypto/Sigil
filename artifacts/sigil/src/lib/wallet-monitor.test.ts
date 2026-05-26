import assert from "node:assert/strict";
import type { WatchlistEntry } from "./watchlist.js";
import { buildWalletMonitorReport } from "./wallet-monitor.js";

const baseEntry: Omit<WatchlistEntry, "id" | "label" | "address" | "status"> = {
  network: "mainnet",
  kind: "wallet",
  createdAt: "2026-05-26T08:00:00.000Z",
  updatedAt: "2026-05-26T08:00:00.000Z",
  lastCheckedAt: "2026-05-26T08:30:00.000Z",
  coverageStatus: "limited",
  coverageMessage: "Coverage is limited but usable.",
};

const riskyWallet: WatchlistEntry = {
  ...baseEntry,
  id: "mainnet:0x111",
  label: "Hot wallet",
  address: "0x1111111111111111111111111111111111111111",
  status: "high-risk",
  approvalSummary: {
    healthScore: 24,
    totalActive: 8,
    unlimited: 3,
    critical: 1,
    high: 2,
  },
};

const cleanWallet: WatchlistEntry = {
  ...baseEntry,
  id: "base:0x222",
  label: "Base vault",
  address: "0x2222222222222222222222222222222222222222",
  network: "base",
  status: "clean",
  approvalSummary: {
    healthScore: 92,
    totalActive: 0,
    unlimited: 0,
    critical: 0,
    high: 0,
  },
};

const uncheckedWallet: WatchlistEntry = {
  ...baseEntry,
  id: "polygon:0x333",
  label: "Polygon wallet",
  address: "0x3333333333333333333333333333333333333333",
  network: "polygon",
  status: "unchecked",
  lastCheckedAt: undefined,
  approvalSummary: undefined,
};

const report = buildWalletMonitorReport([cleanWallet, riskyWallet, uncheckedWallet]);

assert.equal(report.totalWallets, 3);
assert.equal(report.networksMonitored, 3);
assert.equal(report.highRiskWallets, 1);
assert.equal(report.uncheckedWallets, 1);
assert.equal(report.activeApprovals, 8);
assert.equal(report.unlimitedApprovals, 3);
assert.equal(report.criticalOrHighApprovals, 3);
assert.equal(report.hygieneScore < 70, true);
assert.equal(report.riskLevel, "high");
assert.equal(report.fixFirst[0].kind, "high-risk-approvals");
assert.match(report.fixFirst[0].title, /Hot wallet/);
assert.equal(report.fixFirst.some((item) => item.kind === "unchecked-wallet"), true);

const cleanReport = buildWalletMonitorReport([cleanWallet]);
assert.equal(cleanReport.hygieneScore, 92);
assert.equal(cleanReport.riskLevel, "low");
assert.equal(cleanReport.fixFirst[0].kind, "maintenance");
