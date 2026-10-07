import { logger } from "../../lib/logger.js";
import { getEtherscanApiKey } from "./etherscan-api.js";
import { summarizeReceipt, readContractMetadata, historicalExample, contractSourceFailure, type ReceiptEvidence, type ContractMetadataIssue } from "./transaction-evidence.js";
import { boundedRpcJson } from './evidence-rpc.js';
import type { AnalysisEvidence } from './analysis-adapters.js';

export function isTransactionHash(input: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(input);
}

export function isContractAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input);
}

export type InputType = "transaction" | "contract" | "unknown";

export function detectInputType(input: string): InputType {
  if (isTransactionHash(input)) return "transaction";
  if (isContractAddress(input)) return "contract";
  return "unknown";
}

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed?: string;
  gasPrice: string;
  input: string;
  blockNumber: string;
  status?: string;
  inclusionStatus?: "mined" | "pending" | "unknown";
  receiptIssue?: "not_returned" | "malformed_receipt" | "identity_mismatch" | "rpc_unavailable";
  methodId?: string;
  receiptEvidence?: ReceiptEvidence;
  destinationVerification?: ContractData["verificationStatus"];
  destinationHasCode?: boolean;
  historicalExample?: ReturnType<typeof historicalExample>;
  analysisEvidence?: AnalysisEvidence;
}

export interface ContractData {
  address: string;
  contractName?: string;
  compilerVersion?: string;
  abi?: string;
  isVerified: boolean;
  verificationStatus?: "verified" | "unverified" | "unknown";
  tokenName?: string;
  tokenSymbol?: string;
  totalSupply?: string;
  isToken?: boolean;
  isProxy?: boolean;
  implementation?: string;
  metadataIssue?: ContractMetadataIssue;
}

// Public RPC endpoints — no API key required, tested and working
const PUBLIC_RPC: Record<string, string[]> = {
  mainnet:  [
    "https://ethereum.publicnode.com",
    "https://eth-mainnet.public.blastapi.io",
    "https://1rpc.io/eth",
    "https://rpc.eth.gateway.fm",
  ],
  polygon:  [
    "https://polygon.publicnode.com",
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon.llamarpc.com",
  ],
  arbitrum: [
    "https://arbitrum-one.publicnode.com",
    "https://arbitrum-one-rpc.publicnode.com",
    "https://arb1.arbitrum.io/rpc",
  ],
  optimism: [
    "https://optimism.publicnode.com",
    "https://mainnet.optimism.io",
  ],
  base:     [
    "https://base.publicnode.com",
    "https://mainnet.base.org",
  ],
  bsc:      [
    "https://bsc.publicnode.com",
    "https://bsc-dataseed.binance.org",
  ],
  goerli:   ["https://ethereum-goerli.publicnode.com"],
  sepolia:  ["https://ethereum-sepolia.publicnode.com"],
};

export function isSupportedNetwork(network: string): boolean {
  return Object.hasOwn(PUBLIC_RPC, network);
}

export function getEvidenceEndpoints(network: string): readonly string[] {
  if (!isSupportedNetwork(network)) throw new Error('Unsupported network');
  return PUBLIC_RPC[network]!;
}

export function verifiedEvidence(contract: ContractData): boolean | undefined {
  return contract.verificationStatus === "unknown" ? undefined : contract.isVerified;
}

export function transactionEvidenceDetails(tx: TransactionData | null): Record<string, unknown> {
  return {
    sourceVerification: tx?.destinationVerification ?? "unknown",
    transactionInclusion: tx?.inclusionStatus ?? "unknown",
    executionOutcome: tx?.status === "0x1" ? "success" : tx?.status === "0x0" ? "reverted" : "unknown; receipt outcome unavailable",
    receiptDiagnostic: tx?.receiptIssue ?? "none",
    destinationCode: tx?.destinationHasCode === true ? "present at transaction block"
      : tx?.destinationHasCode === false ? "absent at transaction block; source verification not applicable" : "lookup unavailable",
    transferCoverage: tx?.receiptEvidence?.status === "available"
      ? `${tx.receiptEvidence.transfers.length} Transfer-shaped events recorded; ${tx.receiptEvidence.complete ? "bounded event scan complete" : "partial event scan"}; internal traces not collected`
      : `${tx?.receiptEvidence?.status ?? "unavailable"}; asset movement not established`,
    ...(tx?.historicalExample ? { historicalContext: `${tx.historicalExample.name} (curated retrospective example, not live exploit detection)` } : {}),
  };
}

export async function rpcCall(network: string, method: string, params: unknown[], acceptResult?: (value: unknown) => boolean): Promise<unknown> {
  const endpoints = isSupportedNetwork(network) ? PUBLIC_RPC[network] : undefined;
  if (!endpoints) throw new Error("Unsupported network");
  let lastErr: unknown;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: unknown; error?: { message: string } };
      if (!json || typeof json !== "object" || (!Object.hasOwn(json, "result") && !json.error)) {
        lastErr = new Error("Malformed JSON-RPC response");
        continue;
      }
      if (json.error) {
        lastErr = new Error(json.error.message);
        continue;
      }
      if (acceptResult && !acceptResult(json.result)) {
        lastErr = new Error("RPC result failed validation");
        continue;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All RPC endpoints failed");
}

function receiptIssueFor(tx: Record<string, unknown>, value: unknown): TransactionData["receiptIssue"] {
  if (value == null) return "not_returned";
  if (typeof value !== "object" || Array.isArray(value)) return "malformed_receipt";
  const receipt = value as Record<string, unknown>;
  if (typeof receipt.transactionHash !== "string" || !isTransactionHash(receipt.transactionHash)
    || typeof receipt.blockHash !== "string" || !isTransactionHash(receipt.blockHash)
    || typeof receipt.blockNumber !== "string" || !/^0x[a-f0-9]+$/i.test(receipt.blockNumber)
    || !Array.isArray(receipt.logs) || !["0x0", "0x1"].includes(receipt.status as string)) return "malformed_receipt";
  if (receipt.transactionHash.toLowerCase() !== (tx.hash as string).toLowerCase()
    || typeof tx.blockHash !== "string" || receipt.blockHash.toLowerCase() !== tx.blockHash.toLowerCase()
    || typeof tx.blockNumber !== "string" || !/^0x[a-f0-9]+$/i.test(tx.blockNumber)
    || BigInt(receipt.blockNumber) !== BigInt(tx.blockNumber)) return "identity_mismatch";
  return undefined;
}

function validTransaction(value: unknown, hash: string): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const tx = value as Record<string, unknown>;
  return typeof tx.hash === "string" && tx.hash.toLowerCase() === hash.toLowerCase()
    && typeof tx.from === "string" && isContractAddress(tx.from)
    && (tx.to == null || (typeof tx.to === "string" && isContractAddress(tx.to)))
    && typeof tx.input === "string" && /^0x(?:[a-f0-9]{2})*$/i.test(tx.input)
    && typeof tx.value === "string" && /^0x[a-f0-9]+$/i.test(tx.value);
}

export async function fetchTransaction(
  hash: string,
  network: string,
): Promise<TransactionData | null> {
  try {
    const txData = await rpcCall(network, "eth_getTransactionByHash", [hash], value => validTransaction(value, hash));

    if (!validTransaction(txData, hash)) {
      logger.warn({ network }, "Transaction data unavailable after RPC fallback");
      return null;
    }

    const blockTag = typeof txData.blockNumber === "string" && /^0x[a-f0-9]+$/i.test(txData.blockNumber) ? txData.blockNumber : undefined;
    const inclusionStatus = blockTag && typeof txData.blockHash === "string" && isTransactionHash(txData.blockHash)
      ? "mined" : txData.blockNumber == null && txData.blockHash == null ? "pending" : "unknown";
    let receiptIssue: TransactionData["receiptIssue"];
    const hasDestination = !!txData.to && isContractAddress(txData.to);
    const [receipt, metadata, code] = await Promise.allSettled([
      rpcCall(network, "eth_getTransactionReceipt", [hash], value => {
        receiptIssue = receiptIssueFor(txData, value);
        return receiptIssue === undefined || (value == null && inclusionStatus !== "mined");
      }),
      hasDestination ? fetchContract(txData.to!, network, false) : Promise.resolve(undefined),
      hasDestination && blockTag ? rpcCall(network, "eth_getCode", [txData.to!, blockTag]) : Promise.resolve(undefined),
    ]);
    const receiptData = receipt.status === "fulfilled" && receipt.value
      ? receipt.value as Record<string, string> : null;
    if (receipt.status === "rejected") receiptIssue ??= "rpc_unavailable";
    if (!receiptData && inclusionStatus === "mined") logger.warn({ network, receiptIssue, inclusionStatus }, "Mined transaction receipt unavailable after RPC fallback");
    const destination = metadata.status === "fulfilled" ? metadata.value : undefined;
    let destinationHasCode: boolean | undefined;
    if (code.status === "fulfilled" && typeof code.value === "string" && /^0x(?:[a-f0-9]{2})*$/i.test(code.value)) destinationHasCode = code.value !== "0x";

    return {
      hash: txData.hash ?? hash,
      from: txData.from ?? "unknown",
      to: txData.to ?? "contract creation",
      value: txData.value ?? "0x0",
      gas: txData.gas ?? "0x0",
      gasUsed: receiptData?.gasUsed,
      gasPrice: txData.gasPrice ?? txData.maxFeePerGas ?? "0x0",
      input: txData.input ?? "0x",
      blockNumber: txData.blockNumber ?? "pending",
      status: receiptData?.status,
      inclusionStatus,
      receiptIssue,
      receiptEvidence: summarizeReceipt(receiptData),
      destinationVerification: destinationHasCode === true ? destination?.verificationStatus ?? "unknown" : "unknown",
      destinationHasCode,
      historicalExample: historicalExample(hash, network),
      methodId: (txData.input ?? "0x").length >= 10
        ? (txData.input as string).substring(0, 10)
        : undefined,
    };
  } catch {
    logger.warn({ network, diagnostic: "transaction_data_unavailable" }, "Transaction data unavailable after RPC fallback");
    return null;
  }
}

// Etherscan for contract metadata (verification, ABI, token info)
const ETHERSCAN_DOMAINS: Record<string, string> = {
  mainnet:  "api.etherscan.io",
  goerli:   "api-goerli.etherscan.io",
  sepolia:  "api-sepolia.etherscan.io",
  polygon:  "api.polygonscan.com",
  bsc:      "api.bscscan.com",
  arbitrum: "api.arbiscan.io",
  optimism: "api-optimistic.etherscan.io",
  base:     "api.basescan.org",
};

// Etherscan chain IDs for V2 API
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

export async function etherscanFetch(network: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const apiKey = getEtherscanApiKey();
  const chainId = Object.hasOwn(ETHERSCAN_CHAIN_IDS, network) ? ETHERSCAN_CHAIN_IDS[network] : undefined;
  if (!chainId) throw new Error("Unsupported network");

  // Use V2 unified API endpoint
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", chainId);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(6000)]) : AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return signal ? boundedRpcJson(res) : res.json();
}

export async function fetchContract(address: string, network: string, includeTokenInfo = true, signal?: AbortSignal): Promise<ContractData> {
  let result: ContractData = { address, isVerified: false, verificationStatus: "unknown" };

  try {
    const [sourceRes, tokenRes] = await Promise.allSettled([
      etherscanFetch(network, { module: "contract", action: "getsourcecode", address }, signal),
      includeTokenInfo ? etherscanFetch(network, { module: "account", action: "tokeninfo", contractaddress: address }, signal) : Promise.resolve(undefined),
    ]);

    result = readContractMetadata(address,
      sourceRes.status === "fulfilled" ? sourceRes.value : undefined,
      tokenRes.status === "fulfilled" ? tokenRes.value : undefined);
    if (sourceRes.status === 'rejected') result.metadataIssue = contractSourceFailure(sourceRes.reason, signal);
  } catch (err) {
    result.metadataIssue = contractSourceFailure(err, signal);
    logger.warn({ issue: result.metadataIssue, network }, "Failed to fetch contract metadata");
  }

  return result;
}

// Max uint256 — signals an unlimited approval
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
// Common "unlimited" threshold: anything above 10^30 tokens is effectively unlimited
const UNLIMITED_THRESHOLD = BigInt("1000000000000000000000000000000"); // 10^30

export interface ApprovalDecoded {
  type: "approve" | "increaseAllowance" | "permit";
  spender: string;
  amountRaw: string;         // hex
  amountDecimal: bigint;
  isUnlimited: boolean;
  isRevoke: boolean;         // amount === 0
}

// Decode ABI-encoded (address, uint256) from calldata (offset past methodId)
function decodeAddressUint256(calldata: string): { address: string; amount: bigint } | null {
  try {
    const hex = calldata.replace(/^0x/, "");
    if (hex.length < 8 + 64 + 64) return null; // need methodId + 2 x 32 bytes
    const addressHex = hex.slice(8 + 24, 8 + 64);    // last 20 bytes of first 32-byte slot
    const amountHex   = hex.slice(8 + 64, 8 + 64 + 64); // second 32-byte slot
    return {
      address: `0x${addressHex}`,
      amount:  BigInt(`0x${amountHex}`),
    };
  } catch {
    return null;
  }
}

export function decodeApprovalCalldata(calldata: string): ApprovalDecoded | null {
  if (!calldata || calldata === "0x" || calldata.length < 10) return null;
  const methodId = calldata.substring(0, 10).toLowerCase();

  let type: ApprovalDecoded["type"] | null = null;
  if (methodId === "0x095ea7b3") type = "approve";
  else if (methodId === "0x39509351") type = "increaseAllowance";
  else return null;

  const decoded = decodeAddressUint256(calldata);
  if (!decoded) return null;

  const isUnlimited = decoded.amount >= UNLIMITED_THRESHOLD;
  const isRevoke    = type === "approve" && decoded.amount === BigInt(0);

  return {
    type,
    spender: `0x${decoded.address.replace(/^0x/, "").toLowerCase()}`,
    amountRaw: `0x${decoded.amount.toString(16)}`,
    amountDecimal: decoded.amount,
    isUnlimited,
    isRevoke,
  };
}

export function formatApprovalAmount(decoded: ApprovalDecoded, tokenDecimals?: number): string {
  if (decoded.isRevoke)    return "0 (attempted revoke; allowance state not checked)";
  if (decoded.isUnlimited) return "Unlimited-sized raw value (token semantics not established)";
  if (tokenDecimals === undefined) return `${decoded.amountDecimal.toString()} raw units (decimals unknown)`;
  try {
    const divisor = BigInt(10 ** tokenDecimals);
    const whole   = decoded.amountDecimal / divisor;
    const frac    = decoded.amountDecimal % divisor;
    const fracStr = frac.toString().padStart(tokenDecimals, "0").slice(0, 6).replace(/0+$/, "");
    return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  } catch {
    return decoded.amountRaw;
  }
}

const COMMON_METHOD_SIGNATURES: Record<string, string> = {
  "0xa9059cbb": "transfer(address,uint256) — Token Transfer",
  "0x23b872dd": "transferFrom(address,address,uint256) — Token Transfer From",
  "0x095ea7b3": "approve(address,uint256) — Token Approval",
  "0x18160ddd": "totalSupply()",
  "0x70a08231": "balanceOf(address)",
  "0x7ff36ab5": "swapExactETHForTokens — Uniswap Swap",
  "0x38ed1739": "swapExactTokensForTokens — Uniswap Swap",
  "0x8803dbee": "swapTokensForExactTokens — Uniswap Swap",
  "0xe8e33700": "addLiquidity — Liquidity Add",
  "0xf305d719": "addLiquidityETH — Liquidity Add",
  "0xbaa2abde": "removeLiquidity — Liquidity Remove",
  "0x40c10f19": "mint(address,uint256) — Token Minting",
  "0x42966c68": "burn(uint256) — Token Burn",
  "0x1249c58b": "mint() — NFT/Token Mint",
  "0x6a627842": "mint(address) — NFT/Token Mint",
  "0x2e1a7d4d": "withdraw(uint256) — Withdrawal",
  "0xd0e30db0": "deposit() — ETH Deposit/Wrap",
  "0xa0712d68": "mint(uint256) — Batch Mint",
  "0x4e71d92d": "claim() — Reward Claim",
  "0x3ccfd60b": "withdraw() — Full Withdrawal",
  "0xf2fde38b": "transferOwnership(address) — Ownership Transfer ⚠️",
  "0x715018a6": "renounceOwnership() — Ownership Renounce",
};

export function decodeMethodId(methodId: string): string | null {
  return COMMON_METHOD_SIGNATURES[methodId] ?? null;
}

// Convert hex wei to human-readable ETH
export function hexWeiToEth(hex: string): string {
  try {
    const wei = BigInt(hex);
    const eth = Number(wei) / 1e18;
    if (eth === 0) return "0 ETH";
    if (eth < 0.0001) return `${wei.toString()} wei`;
    return `${eth.toFixed(6)} ETH`;
  } catch {
    return hex;
  }
}
