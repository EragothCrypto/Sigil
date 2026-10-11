import { lookupEntity, type KnownEntity, type TrustLevel } from "./known-entities.js";

export const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const UNLIMITED_THRESHOLD = BigInt("1000000000000000000000000000000");

export const SUPPORTED_APPROVAL_NETWORKS = new Set([
  "mainnet",
  "polygon",
  "arbitrum",
  "optimism",
  "base",
  "bsc",
  "sepolia",
]);

const CHAIN_IDS: Record<string, string> = {
  mainnet: "1",
  polygon: "137",
  arbitrum: "42161",
  optimism: "10",
  base: "8453",
  bsc: "56",
  sepolia: "11155111",
};

const EXPLORER_DOMAINS: Record<string, string> = {
  mainnet: "etherscan.io",
  polygon: "polygonscan.com",
  arbitrum: "arbiscan.io",
  optimism: "optimistic.etherscan.io",
  base: "basescan.org",
  bsc: "bscscan.com",
  sepolia: "sepolia.etherscan.io",
};

export interface ExplorerApprovalLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp?: string;
  transactionHash: string;
}

export interface RawApproval {
  token: string;
  spender: string;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: string | null;
  network: string;
  wallet: string;
}

export interface ApprovalHealthItem {
  id: string;
  token: string;
  spender: string;
  spenderEntity: KnownEntity | null;
  amountRaw: string;
  amountLabel: string;
  isUnlimited: boolean;
  riskScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  trustLevel: TrustLevel;
  recommendation: string;
  blockNumber: string;
  transactionHash: string;
  timestamp: string | null;
  explorerUrl: string;
  revokeUrl: string;
}

export function normalizeAddress(address: string): string {
  return `0x${address.replace(/^0x/i, "").toLowerCase()}`;
}

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function topicAddress(address: string): string {
  return `0x${address.replace(/^0x/i, "").toLowerCase().padStart(64, "0")}`;
}

function addressFromTopic(topic: string): string | null {
  const clean = topic.replace(/^0x/i, "");
  if (clean.length !== 64) return null;
  return `0x${clean.slice(24).toLowerCase()}`;
}

function parseHexBigInt(value: string): bigint {
  if (!value || value === "0x") return 0n;
  return BigInt(value);
}

function parseBlockNumber(value: string): bigint {
  return value.startsWith("0x") ? BigInt(value) : BigInt(value);
}

function parseTimestamp(value?: string): string | null {
  if (!value) return null;
  const seconds = value.startsWith("0x") ? Number(BigInt(value)) : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function pairKey(token: string, spender: string): string {
  return `${token.toLowerCase()}:${spender.toLowerCase()}`;
}

export function normalizeApprovalLogs(
  logs: ExplorerApprovalLog[],
  network: string,
  wallet: string,
): RawApproval[] {
  const latestByPair = new Map<string, RawApproval>();

  for (const log of logs) {
    const spender = addressFromTopic(log.topics?.[2] ?? "");
    if (!spender || !isEvmAddress(log.address)) continue;

    const token = normalizeAddress(log.address);
    const amount = parseHexBigInt(log.data);
    const approval: RawApproval = {
      token,
      spender,
      amount,
      blockNumber: parseBlockNumber(log.blockNumber),
      transactionHash: log.transactionHash,
      timestamp: parseTimestamp(log.timeStamp),
      network,
      wallet: normalizeAddress(wallet),
    };

    const key = pairKey(token, spender);
    const current = latestByPair.get(key);
    if (!current || approval.blockNumber >= current.blockNumber) {
      latestByPair.set(key, approval);
    }
  }

  return [...latestByPair.values()].filter((approval) => approval.amount > 0n);
}

function riskLevel(score: number): ApprovalHealthItem["riskLevel"] {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function recommendation(level: ApprovalHealthItem["riskLevel"]): string {
  if (level === "critical") return "Prioritize this recorded approval event; verify the current allowance before deciding whether to revoke.";
  if (level === "high") return "Review this recorded approval event and verify the current allowance before deciding whether to revoke.";
  if (level === "medium") return "Review this recorded approval event; verify the current allowance against your intended use.";
  return "Lower event-review priority; the current allowance and wallet safety are not established.";
}

function explorerUrl(network: string, address: string): string {
  const domain = EXPLORER_DOMAINS[network] ?? EXPLORER_DOMAINS.mainnet;
  return `https://${domain}/address/${address}`;
}

export function revokeUrl(network: string, wallet: string): string {
  const chainId = CHAIN_IDS[network] ?? CHAIN_IDS.mainnet;
  return `https://revoke.cash/address/${wallet}?chainId=${chainId}`;
}

export function scoreApproval(approval: RawApproval): ApprovalHealthItem {
  const isUnlimited = approval.amount === MAX_UINT256 || approval.amount >= UNLIMITED_THRESHOLD;
  const entity = lookupEntity(approval.spender);
  const trustLevel = entity?.trustLevel ?? "unknown";

  let score = 45;
  if (isUnlimited) score = 90;
  if (trustLevel === "trusted") score = isUnlimited ? 52 : 18;
  if (trustLevel === "caution") score = isUnlimited ? 78 : 65;
  if (trustLevel === "dangerous") score = 96;

  const level = riskLevel(score);

  return {
    id: `${approval.network}:${approval.token}:${approval.spender}`,
    token: approval.token,
    spender: approval.spender,
    spenderEntity: entity,
    amountRaw: approval.amount.toString(),
    amountLabel: approval.amount.toString(),
    isUnlimited,
    riskScore: score,
    riskLevel: level,
    trustLevel,
    recommendation: recommendation(level),
    blockNumber: approval.blockNumber.toString(),
    transactionHash: approval.transactionHash,
    timestamp: approval.timestamp,
    explorerUrl: explorerUrl(approval.network, approval.spender),
    revokeUrl: revokeUrl(approval.network, approval.wallet),
  };
}
