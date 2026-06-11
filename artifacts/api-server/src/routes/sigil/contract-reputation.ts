/**
 * Sigil — Contract Reputation Layer
 * A "credit score" for smart contracts: 0-100 trust score based on
 * age, verification, transaction activity, and exploit history.
 */
import { logger } from "../../lib/logger.js";
import { getEtherscanApiKey } from "./etherscan-api.js";
import type { KnownEntity } from "./known-entities.js";

// ── Known Exploit Registry ────────────────────────────────────────────────────
// Addresses (lowercase) of contracts involved in notable exploits
const KNOWN_EXPLOITS: Record<string, { name: string; lostUSD: string; date: string }> = {
  // Euler Finance (March 2023 — $197M flash loan attack)
  "0x27182842e098f60e3d576794a5bffb0777e025d3": { name: "Euler Finance Exploit", lostUSD: "$197M", date: "2023-03-13" },
  "0xb66cd966670d962c227b3eaba30a872dbfb995db": { name: "Euler Finance Attacker", lostUSD: "$197M", date: "2023-03-13" },
  // Nomad Bridge (August 2022 — $190M mass exploit)
  "0x88a1493366d48225fc3cefbdae9ebe20301bb480": { name: "Nomad Bridge Exploit", lostUSD: "$190M", date: "2022-08-02" },
  // Wormhole Bridge (February 2022 — $320M)
  "0x98f3c9e6e3face36baad05fe09d375ef1464288b": { name: "Wormhole Bridge", lostUSD: "$320M", date: "2022-02-02" },
  // Cream Finance (October 2021 — $130M flash loan)
  "0x9de2405e9e5d27cf0caac22fb8e9b29d1dc32ebb": { name: "Cream Finance Exploit", lostUSD: "$130M", date: "2021-10-27" },
  // Harvest Finance (October 2020 — $34M)
  "0xfae2809935233d4bfe8a56c2355c4a2e7d1fff1a": { name: "Harvest Finance Exploit", lostUSD: "$34M", date: "2020-10-26" },
  // BadgerDAO (December 2021 — $120M frontend attack)
  "0x1fcdb04d0c5364fbd92c73ca8af9baa72c269107": { name: "BadgerDAO Exploit", lostUSD: "$120M", date: "2021-12-02" },
  // Multichain (July 2023 — $130M)
  "0x1eed63efba5f81d95bfe37d82c8e736b974f477b": { name: "Multichain Exploit", lostUSD: "$130M", date: "2023-07-07" },
  // Poly Network (August 2021 — $611M)
  "0x37f0000000000000000000000000000000000000": { name: "Poly Network Exploit", lostUSD: "$611M", date: "2021-08-10" },
  // Tornado Cash (OFAC sanctioned)
  "0x7f268357a8c2552623316e2562d90e642bb538e5": { name: "Tornado Cash (Sanctioned)", lostUSD: "OFAC Sanctioned", date: "2022-08-08" },
  // Beanstalk (April 2022 — $182M governance attack)
  "0xc1e088fc1323b20bcbee9bd1b9fc9546db5624c5": { name: "Beanstalk Exploit", lostUSD: "$182M", date: "2022-04-17" },
  // Ronin Network (March 2022 — $624M)
  "0x54a2d42a40f51259dedd1978f6c118a0f0eff078": { name: "Ronin Bridge Exploit", lostUSD: "$624M", date: "2022-03-23" },
};

// ── Etherscan V2 API ──────────────────────────────────────────────────────────
const ETHERSCAN_CHAIN_IDS: Record<string, string> = {
  mainnet:  "1",
  goerli:   "5",
  sepolia:  "11155111",
  polygon:  "137",
  bsc:      "56",
  arbitrum: "42161",
  optimism: "10",
  base:     "8453",
};

async function etherscanFetch(network: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getEtherscanApiKey();
  const chainId = ETHERSCAN_CHAIN_IDS[network] ?? "1";
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", chainId);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ReputationFactor {
  name: string;
  earned: number;     // points awarded
  max: number;        // max possible points
  label: string;      // human label, e.g. "Deployed 2 years ago"
  verdict: "positive" | "neutral" | "negative";
}

export interface ContractReputation {
  trustScore: number;                                                               // 0-100
  tier: "new" | "unproven" | "emerging" | "established" | "trusted" | "exploited";
  tierLabel: string;
  tierDescription: string;    // one short sentence for the tier
  summary: string;            // plain English "credit score" verdict
  isExploited: boolean;
  exploitInfo?: { name: string; lostUSD: string; date: string };
  ageInDays?: number;
  deployedAt?: string;        // ISO date string
  deployerAddress?: string;
  txCountEstimate?: number;   // "at least N" based on fetched page size
  hasRecentActivity?: boolean;
  factors: ReputationFactor[];
}

// ── Raw data fetch ────────────────────────────────────────────────────────────
async function fetchReputationData(address: string, network: string): Promise<{
  deployedAt?: Date;
  deployerAddress?: string;
  txCountEstimate?: number;
  hasRecentActivity?: boolean;
}> {
  const addr = address.toLowerCase();
  const result: ReturnType<typeof fetchReputationData> extends Promise<infer R> ? R : never = {};

  try {
    // 1. Contract creation info — V2 API returns timestamp directly
    const creationRes = await etherscanFetch(network, {
      module: "contract",
      action: "getcontractcreation",
      contractaddresses: addr,
    }) as { status: string; result?: Array<{ contractCreator: string; txHash: string; timestamp?: string; blockNumber?: string }> };

    const creationInfo = creationRes?.result?.[0];

    if (creationInfo) {
      result.deployerAddress = creationInfo.contractCreator;

      // V2 includes timestamp directly — no extra block lookup needed
      if (creationInfo.timestamp) {
        result.deployedAt = new Date(parseInt(creationInfo.timestamp, 10) * 1000);
      }
    }
  } catch (err) {
    logger.warn({ err, address }, "Could not fetch contract creation info");
  }

  try {
    // 2. Transaction count estimation — fetch page 1 with 100 results, then page 2
    const [page1, page2] = await Promise.allSettled([
      etherscanFetch(network, {
        module: "account",
        action: "txlist",
        address: addr,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "100",
        sort: "desc",
      }) as Promise<{ status: string; result?: unknown[] }>,
      etherscanFetch(network, {
        module: "account",
        action: "txlist",
        address: addr,
        startblock: "0",
        endblock: "99999999",
        page: "2",
        offset: "100",
        sort: "desc",
      }) as Promise<{ status: string; result?: unknown[] }>,
    ]);

    const p1Results = page1.status === "fulfilled" ? (page1.value?.result ?? []) : [];
    const p2Results = page2.status === "fulfilled" ? (page2.value?.result ?? []) : [];

    const totalFetched = p1Results.length + p2Results.length;
    result.txCountEstimate = totalFetched >= 200 ? 200 : totalFetched;

    // Check if any tx in page 1 (most recent) is within 30 days
    if (p1Results.length > 0) {
      const recentTx = (p1Results[0] as Record<string, string>);
      const ts = parseInt(recentTx.timeStamp ?? "0");
      const thirtyDaysAgo = Date.now() / 1000 - 30 * 86400;
      result.hasRecentActivity = ts > thirtyDaysAgo;
    }
  } catch (err) {
    logger.warn({ err, address }, "Could not estimate tx count");
  }

  return result;
}

// ── Scoring engine ────────────────────────────────────────────────────────────
export async function calculateContractReputation(
  address: string,
  network: string,
  isVerified: boolean,
  isToken: boolean,
  knownEntity: KnownEntity | null | undefined,
): Promise<ContractReputation> {
  const addr = address.toLowerCase();

  // Exploit check first — short-circuits immediately
  const exploitInfo = KNOWN_EXPLOITS[addr];
  if (exploitInfo) {
    return {
      trustScore: 0,
      tier: "exploited",
      tierLabel: "EXPLOITED",
      tierDescription: "This contract is associated with a known exploit or is OFAC sanctioned.",
      summary: `⛔ This contract is linked to a known security incident: ${exploitInfo.name} (${exploitInfo.lostUSD} lost on ${exploitInfo.date}). Do not interact with it.`,
      isExploited: true,
      exploitInfo,
      factors: [
        { name: "Security History", earned: 0, max: 25, label: `Known exploit: ${exploitInfo.name}`, verdict: "negative" },
        { name: "Verification", earned: isVerified ? 25 : 0, max: 25, label: isVerified ? "Source code verified" : "Unverified contract", verdict: isVerified ? "positive" : "negative" },
        { name: "Age", earned: 0, max: 30, label: "Exploit history overrides age score", verdict: "negative" },
        { name: "Activity", earned: 0, max: 20, label: "Flagged — do not interact", verdict: "negative" },
      ],
    };
  }

  // Fetch on-chain reputation data
  const repData = await fetchReputationData(addr, network);

  const factors: ReputationFactor[] = [];
  let totalScore = 0;

  // ── Factor 1: Age (0-30 pts) ──────────────────────────────────────────────
  let ageScore = 0;
  let ageLabel = "Deployment date unknown";
  let ageInDays: number | undefined;

  if (repData.deployedAt) {
    ageInDays = Math.floor((Date.now() - repData.deployedAt.getTime()) / 86400000);
    if (ageInDays < 7) {
      ageScore = 0;
      ageLabel = `Deployed ${ageInDays} day${ageInDays === 1 ? "" : "s"} ago — very new`;
    } else if (ageInDays < 30) {
      ageScore = 8;
      ageLabel = `Deployed ${ageInDays} days ago — less than 1 month old`;
    } else if (ageInDays < 180) {
      ageScore = 15;
      const months = Math.floor(ageInDays / 30);
      ageLabel = `Deployed ${months} month${months === 1 ? "" : "s"} ago`;
    } else if (ageInDays < 365) {
      ageScore = 22;
      const months = Math.floor(ageInDays / 30);
      ageLabel = `Deployed ${months} months ago — approaching 1 year`;
    } else {
      ageScore = 30;
      const years = (ageInDays / 365).toFixed(1);
      ageLabel = `Deployed ${years} year${parseFloat(years) >= 2 ? "s" : ""} ago — battle-tested`;
    }
  } else {
    ageScore = 5; // unknown but not penalized
    ageLabel = "Deployment date could not be determined";
  }

  totalScore += ageScore;
  factors.push({
    name: "Contract Age",
    earned: ageScore,
    max: 30,
    label: ageLabel,
    verdict: ageScore >= 20 ? "positive" : ageScore >= 8 ? "neutral" : "negative",
  });

  // ── Factor 2: Verification (0-25 pts) ─────────────────────────────────────
  const verifScore = isVerified ? 25 : 0;
  totalScore += verifScore;
  factors.push({
    name: "Source Verification",
    earned: verifScore,
    max: 25,
    label: isVerified
      ? "Source code verified and publicly auditable"
      : "Source code NOT verified — cannot inspect the code",
    verdict: isVerified ? "positive" : "negative",
  });

  // ── Factor 3: Transaction Activity (0-20 pts) ─────────────────────────────
  let activityScore = 0;
  let activityLabel = "No transaction history found";
  const txCount = repData.txCountEstimate ?? 0;

  if (txCount >= 200) {
    activityScore = 20;
    activityLabel = "200+ transactions — high on-chain activity";
  } else if (txCount >= 100) {
    activityScore = 17;
    activityLabel = `${txCount} transactions — active contract`;
  } else if (txCount >= 50) {
    activityScore = 13;
    activityLabel = `${txCount} transactions — moderate activity`;
  } else if (txCount >= 10) {
    activityScore = 8;
    activityLabel = `${txCount} transactions — limited history`;
  } else if (txCount >= 1) {
    activityScore = 4;
    activityLabel = `${txCount} transaction${txCount === 1 ? "" : "s"} — almost no history`;
  } else {
    activityScore = 0;
    activityLabel = "No transactions found — completely untested";
  }

  totalScore += activityScore;
  factors.push({
    name: "On-Chain Activity",
    earned: activityScore,
    max: 20,
    label: activityLabel,
    verdict: activityScore >= 15 ? "positive" : activityScore >= 8 ? "neutral" : "negative",
  });

  // ── Factor 4: Protocol Recognition (0-25 pts) ─────────────────────────────
  let recognitionScore = 0;
  let recognitionLabel = "Unknown contract — not in any trusted protocol registry";

  if (knownEntity) {
    if (knownEntity.trustLevel === "trusted") {
      recognitionScore = 25;
      recognitionLabel = `Verified as ${knownEntity.name} (${knownEntity.category}) — top-tier trusted protocol`;
    } else if (knownEntity.trustLevel === "caution") {
      recognitionScore = 8;
      recognitionLabel = `Known as ${knownEntity.name} — use with caution`;
    } else {
      recognitionScore = 15;
      recognitionLabel = `Recognized as ${knownEntity.name} — known protocol`;
    }
  } else if (isToken) {
    recognitionScore = 5;
    recognitionLabel = "Token contract — not in trusted registry but follows token standards";
  }

  totalScore += recognitionScore;
  factors.push({
    name: "Protocol Recognition",
    earned: recognitionScore,
    max: 25,
    label: recognitionLabel,
    verdict: recognitionScore >= 20 ? "positive" : recognitionScore >= 5 ? "neutral" : "negative",
  });

  // ── Final score & tier ────────────────────────────────────────────────────
  const score = Math.min(100, Math.max(0, totalScore));

  let tier: ContractReputation["tier"];
  let tierLabel: string;
  let tierDescription: string;

  if (score < 20) {
    tier = "new";
    tierLabel = "NEW";
    tierDescription = "Little or no on-chain history. Proceed with extreme caution.";
  } else if (score < 40) {
    tier = "unproven";
    tierLabel = "UNPROVEN";
    tierDescription = "Early-stage contract with limited track record.";
  } else if (score < 60) {
    tier = "emerging";
    tierLabel = "EMERGING";
    tierDescription = "Some history, but not yet battle-tested at scale.";
  } else if (score < 80) {
    tier = "established";
    tierLabel = "ESTABLISHED";
    tierDescription = "Solid track record with meaningful on-chain activity.";
  } else {
    tier = "trusted";
    tierLabel = "TRUSTED";
    tierDescription = "Highly trusted — verified, aged, and widely used protocol.";
  }

  // ── Plain-English summary ─────────────────────────────────────────────────
  const agePart = ageInDays !== undefined
    ? ageInDays < 7
      ? "brand new"
      : ageInDays < 30
        ? "less than a month old"
        : ageInDays < 365
          ? `${Math.floor(ageInDays / 30)} months old`
          : `${Math.floor(ageInDays / 365)} year${Math.floor(ageInDays / 365) >= 2 ? "s" : ""} old`
    : "of unknown age";

  let summary = "";
  if (knownEntity?.trustLevel === "trusted") {
    summary = `This is ${knownEntity.name}, one of the most trusted protocols in DeFi${repData.deployedAt ? `, deployed ${agePart}` : ""}. Its source code is public and audited.`;
  } else if (score >= 80) {
    summary = `This contract has a strong trust record — it is ${agePart}, source-verified, and has significant on-chain activity.`;
  } else if (score >= 60) {
    summary = `This contract has a reasonable track record. It is ${agePart}${isVerified ? " with verified source code" : " but its source code is not verified"}${txCount > 0 ? ` and has been used ${txCount >= 200 ? "many" : txCount} times` : ""}.`;
  } else if (score >= 40) {
    summary = `This contract is ${agePart} with limited trust history. ${isVerified ? "Its source code is verified" : "Its source code is not verified"}${txCount < 10 ? " and it has almost no transaction history" : ""}.`;
  } else if (score >= 20) {
    summary = `This contract has low trust signals — it is ${agePart}${!isVerified ? ", unverified" : ""}${txCount < 5 ? ", and has minimal transaction history" : ""}. Exercise caution.`;
  } else {
    summary = `This contract is ${agePart}${!isVerified ? ", unverified" : ""}, and has no meaningful transaction history. It is essentially unknown — treat it as high risk.`;
  }

  return {
    trustScore: score,
    tier,
    tierLabel,
    tierDescription,
    summary,
    isExploited: false,
    ageInDays,
    deployedAt: repData.deployedAt?.toISOString(),
    deployerAddress: repData.deployerAddress,
    txCountEstimate: repData.txCountEstimate,
    hasRecentActivity: repData.hasRecentActivity,
    factors,
  };
}
