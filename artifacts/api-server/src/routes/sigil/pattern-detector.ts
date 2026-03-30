/**
 * Sigil Pattern Detection Engine
 * Static heuristic analysis for known scam/exploit patterns.
 * Runs in parallel with AI analysis for speed.
 */

import type { TransactionData, ContractData } from "./ethereum.js";
import type { KnownEntity } from "./known-entities.js";

export type PatternType =
  | "drainer"
  | "honeypot"
  | "fake_approval"
  | "rug_pull"
  | "phishing"
  | "flash_loan"
  | "suspicious";

export type PatternConfidence = "confirmed" | "high" | "medium" | "low";

export interface PatternMatch {
  id: string;
  type: PatternType;
  name: string;
  confidence: PatternConfidence;
  description: string;
  indicators: string[];
  historicalContext?: string;
  riskDelta: number; // how much this pattern adds to risk score (0-30)
}

// ── Known malicious / suspicious method selectors ──────────────────────────

/** Selectors that are inherently dangerous when sent to an unknown contract */
const HIGH_RISK_SELECTORS: Record<string, { label: string; pattern: PatternType; reason: string }> = {
  "0xd505accf": {
    label: "permit()",
    pattern: "phishing",
    reason: "Gasless approval — grants spending rights without appearing in wallet history",
  },
  "0xf3fef3a3": {
    label: "withdraw(address,uint256)",
    pattern: "drainer",
    reason: "Arbitrary withdraw to an address controlled by the caller",
  },
  "0x1a4d01d2": {
    label: "sweepToken(address,uint256,address)",
    pattern: "drainer",
    reason: "sweepToken is a known drainer toolkit function",
  },
  "0xb6b55f25": {
    label: "deposit(uint256)",
    pattern: "suspicious",
    reason: "Token deposit to an unverified contract",
  },
};

/** Selectors that are risky ONLY when the destination is an unknown/unverified contract */
const CONDITIONAL_RISK_SELECTORS: Record<string, { label: string; pattern: PatternType; reason: string }> = {
  "0xa22cb465": {
    label: "setApprovalForAll(address,bool)",
    pattern: "drainer",
    reason: "Grants blanket access to ALL NFTs in your wallet — a favourite of NFT drainer toolkits",
  },
  "0x095ea7b3": {
    label: "approve(address,uint256)",
    pattern: "fake_approval",
    reason: "Grants token spending access to the spender address",
  },
  "0x23b872dd": {
    label: "transferFrom(address,address,uint256)",
    pattern: "drainer",
    reason: "Moves tokens from one wallet to another — often abused after an approval is granted",
  },
  "0xf2fde38b": {
    label: "transferOwnership(address)",
    pattern: "rug_pull",
    reason: "Changes the owner of the contract — common precursor to rug pull",
  },
  "0x40c10f19": {
    label: "mint(address,uint256)",
    pattern: "rug_pull",
    reason: "Mints new tokens — if the deployer can mint freely this inflates supply and dilutes holders",
  },
  "0x4f1ef286": {
    label: "upgradeToAndCall(address,bytes)",
    pattern: "suspicious",
    reason: "Upgrades the contract logic — post-upgrade behaviour is unpredictable",
  },
};

/** ABI function names that signal a honeypot or back-door */
const HONEYPOT_FUNCTION_NAMES = [
  "isBlacklisted",
  "_isBlacklisted",
  "blacklist",
  "setBlacklist",
  "addToBlacklist",
  "setMaxWallet",
  "setMaxTxAmount",
  "_maxTxAmount",
  "setFeeWallet",
  "setCooldown",
  "enableTrading",
  "openTrading",
  "isBot",
];

/** Suspicious keywords in unverified contract names */
const SUSPICIOUS_NAME_KEYWORDS = [
  "airdrop",
  "reward",
  "official",
  "safe",
  "claim",
  "presale",
  "bonus",
  "giveaway",
  "mint",
];

// ── Historical context messages ────────────────────────────────────────────

const DRAINER_CONTEXT =
  "Patterns like these are used in >70% of NFT and ERC-20 wallet-draining incidents logged by blockchain security firms in 2023–2025.";

const HONEYPOT_CONTEXT =
  "Honeypot tokens typically allow buys but block sells via hidden blacklist or require() conditions. Victims cannot exit their position.";

const PERMIT_CONTEXT =
  "The permit() function is the #1 vector used by phishing sites to drain wallets without the victim seeing an approval in their wallet history.";

const RUG_CONTEXT =
  "Contracts with unrestricted minting or transferable ownership are the most common mechanism behind rug pull exit scams.";

const FAKE_APPROVAL_CONTEXT =
  "Unlimited approvals to unknown contracts are directly exploitable: the spender can drain your entire balance at any time with no further action needed from you.";

// ── Main detection function ────────────────────────────────────────────────

export interface PatternDetectionInput {
  tx?: TransactionData | null;
  contract?: ContractData | null;
  methodId?: string | null;
  calldata?: string | null;
  isUnlimitedApproval?: boolean;
  spender?: string | null;
  spenderKnown?: boolean;
  knownEntity?: KnownEntity | null;
}

export function detectPatterns(input: PatternDetectionInput): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const {
    tx,
    contract,
    methodId,
    calldata,
    isUnlimitedApproval,
    spender,
    spenderKnown,
    knownEntity,
  } = input;

  const isKnownTrusted = !!knownEntity && knownEntity.trustLevel === "trusted";

  // ── TRANSACTION patterns ───────────────────────────────────────────────

  if (methodId) {
    // 1. Unconditionally high-risk selectors
    const highRisk = HIGH_RISK_SELECTORS[methodId.toLowerCase()];
    if (highRisk && !isKnownTrusted) {
      matches.push({
        id: `selector-${methodId}`,
        type: highRisk.pattern,
        name: highRisk.pattern === "phishing" ? "Phishing Permit Attack" : "Known Exploit Selector",
        confidence: "high",
        description: highRisk.reason,
        indicators: [`Method selector ${methodId} (${highRisk.label}) matches known exploit signatures`],
        historicalContext:
          highRisk.pattern === "phishing" ? PERMIT_CONTEXT : DRAINER_CONTEXT,
        riskDelta: highRisk.pattern === "phishing" ? 25 : 20,
      });
    }

    // 2. Conditionally risky selectors — only flag when destination is unknown
    const condRisk = CONDITIONAL_RISK_SELECTORS[methodId.toLowerCase()];
    if (condRisk && !isKnownTrusted) {
      if (condRisk.pattern === "fake_approval" && isUnlimitedApproval && !spenderKnown) {
        matches.push({
          id: "unlimited-approval-unknown",
          type: "fake_approval",
          name: "Unlimited Approval to Unknown Contract",
          confidence: "high",
          description:
            "You are granting unlimited spending rights of your tokens to an unverified contract. This is the primary vector used by wallet-draining scams.",
          indicators: [
            `approve() selector (${methodId}) detected`,
            "Amount: unlimited (max uint256)",
            "Spender is not a recognised protocol",
          ],
          historicalContext: FAKE_APPROVAL_CONTEXT,
          riskDelta: 28,
        });
      } else if (condRisk.pattern === "drainer" && methodId === "0xa22cb465") {
        // setApprovalForAll — always concerning unless to a known marketplace
        if (!isKnownTrusted) {
          matches.push({
            id: "set-approval-for-all-unknown",
            type: "drainer",
            name: "NFT Blanket Approval",
            confidence: spenderKnown ? "medium" : "high",
            description:
              "setApprovalForAll grants a third party unrestricted access to every NFT in your wallet, not just one. This is the primary tool used by NFT drainer kits.",
            indicators: [
              "setApprovalForAll() detected",
              spenderKnown
                ? "Spender is a known protocol — reduced risk"
                : "Spender is an unverified contract",
            ],
            historicalContext: DRAINER_CONTEXT,
            riskDelta: spenderKnown ? 8 : 22,
          });
        }
      } else if (condRisk.pattern === "rug_pull") {
        if (!isKnownTrusted) {
          matches.push({
            id: `rug-${methodId}`,
            type: "rug_pull",
            name: methodId === "0xf2fde38b" ? "Ownership Transfer Detected" : "Unrestricted Minting",
            confidence: "medium",
            description: condRisk.reason,
            indicators: [`${condRisk.label} called on contract`, "No known entity association"],
            historicalContext: RUG_CONTEXT,
            riskDelta: 15,
          });
        }
      } else if (condRisk.pattern === "suspicious" && !isKnownTrusted) {
        matches.push({
          id: `suspicious-${methodId}`,
          type: "suspicious",
          name: "Suspicious Contract Upgrade",
          confidence: "medium",
          description: condRisk.reason,
          indicators: [`${condRisk.label} detected`, "Contract logic can be changed post-deploy"],
          riskDelta: 10,
        });
      }
    }

    // 3. Multicall abuse detection
    if (
      (methodId === "0xac9650d8" || methodId === "0x5ae401dc") &&
      !isKnownTrusted
    ) {
      matches.push({
        id: "multicall-abuse",
        type: "drainer",
        name: "Multicall Bundle",
        confidence: "medium",
        description:
          "This transaction bundles multiple calls into one. Attackers use multicall to execute a drain in a single atomic transaction before the victim can react.",
        indicators: [
          "multicall() selector detected",
          "Batch transactions are harder to inspect manually",
          !isKnownTrusted ? "Target is not a recognised protocol" : "",
        ].filter(Boolean),
        historicalContext: DRAINER_CONTEXT,
        riskDelta: 12,
      });
    }
  }

  // ── CONTRACT patterns ──────────────────────────────────────────────────

  if (contract) {
    // 4. Honeypot: unverified token with suspicious ABI functions
    if (!contract.isVerified && contract.isToken && !isKnownTrusted) {
      const abi = contract.abi as string | null;
      const foundHoneypotFns = abi
        ? HONEYPOT_FUNCTION_NAMES.filter((fn) => abi.includes(fn))
        : [];

      if (foundHoneypotFns.length > 0) {
        matches.push({
          id: "honeypot-blacklist",
          type: "honeypot",
          name: "Honeypot Token",
          confidence: foundHoneypotFns.length >= 2 ? "high" : "medium",
          description:
            "This token contract contains hidden blacklist or transfer-restriction functions. Tokens like this typically allow purchases but silently block sells, trapping buyer funds.",
          indicators: [
            `Suspicious functions found: ${foundHoneypotFns.slice(0, 3).join(", ")}`,
            "Contract source code is not verified",
            "Not a recognised token protocol",
          ],
          historicalContext: HONEYPOT_CONTEXT,
          riskDelta: 20,
        });
      } else if (!abi || abi === "Contract source code not verified") {
        // Unverified token — softer honeypot warning
        matches.push({
          id: "unverified-token",
          type: "honeypot",
          name: "Unverified Token Contract",
          confidence: "medium",
          description:
            "The source code for this token has not been published or verified on-chain. Hidden restrictions on sells or transfers cannot be ruled out.",
          indicators: [
            "No verified source code",
            "Token contract",
            "No known protocol match",
          ],
          historicalContext: HONEYPOT_CONTEXT,
          riskDelta: 12,
        });
      }
    }

    // 5. Suspicious contract name (social engineering)
    if (contract.contractName && !isKnownTrusted) {
      const nameLower = contract.contractName.toLowerCase();
      const suspiciousKeyword = SUSPICIOUS_NAME_KEYWORDS.find((kw) =>
        nameLower.includes(kw)
      );
      if (suspiciousKeyword) {
        matches.push({
          id: "suspicious-name",
          type: "phishing",
          name: "Social Engineering Name",
          confidence: "medium",
          description: `The contract name contains "${suspiciousKeyword}" — a word commonly used in fake airdrop/giveaway scams to appear legitimate.`,
          indicators: [
            `Contract name: "${contract.contractName}"`,
            `Keyword "${suspiciousKeyword}" is overrepresented in scam contracts`,
            !contract.isVerified ? "Source code unverified" : "",
          ].filter(Boolean),
          riskDelta: 10,
        });
      }
    }

    // 6. selfdestruct in ABI = contract can be wiped
    if (contract.abi && typeof contract.abi === "string" && contract.abi.includes("selfdestruct")) {
      matches.push({
        id: "selfdestruct",
        type: "rug_pull",
        name: "Self-Destruct Capability",
        confidence: "confirmed",
        description:
          "This contract can call selfdestruct(), which permanently wipes the contract and forwards all Ether to a designated address. Rug pulls and exit scams use this to vanish instantly.",
        indicators: [
          "selfdestruct() present in contract bytecode/ABI",
          "Contract owner can wipe the contract at any time",
        ],
        historicalContext: RUG_CONTEXT,
        riskDelta: 30,
      });
    }
  }

  // Deduplicate by id and sort by riskDelta descending
  const seen = new Set<string>();
  return matches
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => b.riskDelta - a.riskDelta);
}

/** Merge AI-detected patterns with static patterns, dedup by id/type+name */
export function mergePatterns(
  staticPatterns: PatternMatch[],
  aiPatterns: PatternMatch[]
): PatternMatch[] {
  const result = [...staticPatterns];
  const existingIds = new Set(staticPatterns.map((p) => p.id));
  const existingTypeNames = new Set(
    staticPatterns.map((p) => `${p.type}:${p.name.toLowerCase()}`)
  );

  for (const ap of aiPatterns) {
    if (!existingIds.has(ap.id) && !existingTypeNames.has(`${ap.type}:${ap.name.toLowerCase()}`)) {
      result.push(ap);
    }
  }

  return result.sort((a, b) => b.riskDelta - a.riskDelta);
}
