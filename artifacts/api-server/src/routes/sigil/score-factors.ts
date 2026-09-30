/**
 * Sigil — Risk Score Factor Engine
 * Computes deterministic, human-readable factors that explain the AI risk score.
 * Each factor carries a delta (+/−) representing its contribution.
 */

import type { KnownEntity } from "./known-entities.js";
import type { PatternMatch } from "./pattern-detector.js";

export interface ScoreFactor {
  label: string;
  delta: number;       // positive = raises risk, negative = lowers risk
  severity: "critical" | "high" | "medium" | "positive";
  category: "approval" | "contract" | "pattern" | "reputation" | "entity";
  detail?: string;     // one-line explanation for tooltips
}

interface FactorInputs {
  inputType: "transaction" | "contract" | "unknown";
  isVerified?: boolean;
  knownEntity: KnownEntity | null;
  approvalInfo?: {
    isApproval: boolean;
    isRevoke?: boolean;
    isUnlimited?: boolean;
    riskLevel?: string;
    spenderEntity?: KnownEntity | null;
  } | null;
  reputation?: {
    tier: string;
    trustScore: number;
    isExploited?: boolean;
    contractAge?: number; // days
  } | null;
  patterns: PatternMatch[];
  riskScore: number;
}

export function computeScoreFactors(inputs: FactorInputs): ScoreFactor[] {
  const factors: ScoreFactor[] = [];
  const { inputType, isVerified, knownEntity, approvalInfo, reputation, patterns } = inputs;

  // ── Contract verification ──────────────────────────────────────────────────
  if (inputType === "contract" || inputType === "transaction") {
    if (isVerified === false) {
      factors.push({
        label: "Unverified source code",
        delta: 30,
        severity: "high",
        category: "contract",
        detail: "Source code not published on Etherscan — cannot inspect what this contract does",
      });
    } else if (isVerified === true) {
      factors.push({
        label: "Source code verified",
        delta: -15,
        severity: "positive",
        category: "contract",
        detail: "Source code is publicly available and matches the deployed bytecode",
      });
    }
  }

  // ── Approval factors ───────────────────────────────────────────────────────
  if (approvalInfo?.isApproval) {
    if (approvalInfo.isRevoke) {
      factors.push({
        label: "Zero-value approval intent",
        delta: 0,
        severity: "medium",
        category: "approval",
        detail: "Calldata contains zero; token semantics and post-transaction allowance state were not checked. No confirmed revoke or safety credit.",
      });
    } else if (approvalInfo.isUnlimited) {
      factors.push({
        label: "Large-value approval intent",
        delta: 40,
        severity: "critical",
        category: "approval",
        detail: "Calldata contains a large raw value. If this is an executed ERC20 approval it may grant broad access; NFT token IDs and failed/pending calls differ.",
      });
    } else {
      factors.push({
        label: "Bounded-value approval intent",
        delta: 0,
        severity: "medium",
        category: "approval",
        detail: "Raw calldata value is below the large-value heuristic; token decimals, NFT semantics and executed permission state are unknown.",
      });
    }

    if (approvalInfo.spenderEntity) {
      if (approvalInfo.spenderEntity.trustLevel === "trusted") {
        factors.push({
          label: `Spender is ${approvalInfo.spenderEntity.name}`,
          delta: -20,
          severity: "positive",
          category: "approval",
          detail: "Spender address belongs to a well-known, trusted protocol",
        });
      }
    } else if (!approvalInfo.isRevoke) {
      factors.push({
        label: "Spender is unrecognized",
        delta: 25,
        severity: "high",
        category: "approval",
        detail: "The requested spender is not in the local protocol registry; granted permission is not established",
      });
    }
  }

  // ── Known entity ───────────────────────────────────────────────────────────
  if (knownEntity) {
    if (knownEntity.trustLevel === "trusted") {
      factors.push({
        label: `Known protocol: ${knownEntity.name}`,
        delta: -25,
        severity: "positive",
        category: "entity",
        detail: `Recognized as ${knownEntity.category} — a verified, widely-used protocol`,
      });
    } else if (knownEntity.trustLevel === "caution") {
      factors.push({
        label: `Protocol flagged: ${knownEntity.name}`,
        delta: 20,
        severity: "medium",
        category: "entity",
        detail: "Known contract but has caution flags in Sigil's database",
      });
    }
  } else if (inputType === "contract") {
    factors.push({
      label: "Contract not recognized",
      delta: 12,
      severity: "medium",
      category: "entity",
      detail: "Not found in Sigil's database of known protocols and tokens",
    });
  }

  // ── Pattern matches ────────────────────────────────────────────────────────
  for (const pattern of patterns) {
    const delta = Math.min(pattern.riskDelta, 60);
    const severity: ScoreFactor["severity"] =
      pattern.confidence === "confirmed" || pattern.confidence === "high"
        ? "critical"
        : "high";

    factors.push({
      label: pattern.name,
      delta,
      severity,
      category: "pattern",
      detail: pattern.description,
    });
  }

  // ── Reputation tier ────────────────────────────────────────────────────────
  if (reputation) {
    if (reputation.isExploited) {
      factors.push({
        label: "Known exploit history",
        delta: 55,
        severity: "critical",
        category: "reputation",
        detail: "This contract address is associated with a recorded exploit or hack",
      });
    } else if (reputation.tier === "new" || reputation.tier === "unproven") {
      factors.push({
        label: "Newly deployed contract",
        delta: 22,
        severity: "high",
        category: "reputation",
        detail:
          reputation.contractAge !== undefined && reputation.contractAge < 7
            ? `Contract is only ${reputation.contractAge} day(s) old — no track record`
            : "Little to no transaction history — insufficient track record",
      });
    } else if (reputation.tier === "established") {
      factors.push({
        label: "Established contract",
        delta: -12,
        severity: "positive",
        category: "reputation",
        detail: "Contract has significant transaction history and a solid track record",
      });
    } else if (reputation.tier === "trusted") {
      factors.push({
        label: "Highly trusted contract",
        delta: -20,
        severity: "positive",
        category: "reputation",
        detail: "Top-tier trust score — long history, verified, widely used",
      });
    } else if (reputation.tier === "emerging") {
      factors.push({
        label: "Emerging contract",
        delta: 8,
        severity: "medium",
        category: "reputation",
        detail: "Growing history but still building a track record",
      });
    }
  }

  // ── Sort by absolute impact (largest delta first) ─────────────────────────
  return factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
}
