import assert from "node:assert/strict";
import {
  addWatchlistEntry,
  importWatchlistEntries,
  statusFromApprovalSummary,
  type WatchlistEntry,
} from "./watchlist.js";

const first = addWatchlistEntry([], {
  label: "Treasury",
  address: "0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48",
  network: "mainnet",
  kind: "multisig",
});

assert.equal(first.length, 1);
assert.equal(first[0].address, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
assert.equal(first[0].label, "Treasury");
assert.equal(first[0].status, "unchecked");

assert.throws(
  () =>
    addWatchlistEntry(first, {
      label: "Duplicate",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      network: "mainnet",
      kind: "wallet",
    }),
  /already on your watchlist/,
);

const imported = importWatchlistEntries([
  first[0],
  { label: "Bad", address: "nope", network: "mainnet", kind: "wallet" },
  {
    label: "Base Vault",
    address: "0x1111111111111111111111111111111111111111",
    network: "base",
    kind: "vault",
  },
] as WatchlistEntry[]);

assert.equal(imported.length, 2);
assert.equal(statusFromApprovalSummary({ coverageStatus: "unavailable", totalActive: 0, high: 0, critical: 0 }), "unavailable");
assert.equal(statusFromApprovalSummary({ coverageStatus: "limited", totalActive: 0, high: 0, critical: 0 }), "clean");
assert.equal(statusFromApprovalSummary({ coverageStatus: "limited", totalActive: 2, high: 0, critical: 0 }), "review");
assert.equal(statusFromApprovalSummary({ coverageStatus: "limited", totalActive: 2, high: 1, critical: 0 }), "high-risk");
