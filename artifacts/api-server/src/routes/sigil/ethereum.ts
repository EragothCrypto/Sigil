import { logger } from "../../lib/logger.js";

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
  methodId?: string;
}

export interface ContractData {
  address: string;
  contractName?: string;
  compilerVersion?: string;
  abi?: string;
  isVerified: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  totalSupply?: string;
  isToken?: boolean;
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

async function rpcCall(network: string, method: string, params: unknown[]): Promise<unknown> {
  const endpoints = PUBLIC_RPC[network] ?? PUBLIC_RPC.mainnet;
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
      if (json.error) {
        lastErr = new Error(json.error.message);
        continue;
      }
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All RPC endpoints failed");
}

export async function fetchTransaction(
  hash: string,
  network: string,
): Promise<TransactionData | null> {
  try {
    const [tx, receipt] = await Promise.allSettled([
      rpcCall(network, "eth_getTransactionByHash", [hash]),
      rpcCall(network, "eth_getTransactionReceipt", [hash]),
    ]);

    const txData = tx.status === "fulfilled" ? (tx.value as Record<string, string> | null) : null;
    const receiptData = receipt.status === "fulfilled"
      ? (receipt.value as Record<string, string> | null)
      : null;

    if (!txData) {
      logger.warn({ hash, network }, "Transaction not found on any RPC endpoint");
      return null;
    }

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
      methodId: (txData.input ?? "0x").length >= 10
        ? (txData.input as string).substring(0, 10)
        : undefined,
    };
  } catch (err) {
    logger.warn({ err, hash, network }, "Failed to fetch transaction via RPC");
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

async function etherscanFetch(network: string, params: Record<string, string>): Promise<unknown> {
  const domain = ETHERSCAN_DOMAINS[network] ?? "api.etherscan.io";
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "YourApiKeyToken";
  const url = new URL(`https://${domain}/api`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}

export async function fetchContract(address: string, network: string): Promise<ContractData> {
  const result: ContractData = { address, isVerified: false };

  try {
    const [sourceRes, tokenRes] = await Promise.allSettled([
      etherscanFetch(network, { module: "contract", action: "getsourcecode", address }),
      etherscanFetch(network, { module: "account", action: "tokeninfo", contractaddress: address }),
    ]);

    if (sourceRes.status === "fulfilled") {
      const source = (sourceRes.value as Record<string, Record<string, string>[]>)?.result?.[0];
      if (source?.ContractName) {
        result.contractName = source.ContractName;
        result.compilerVersion = source.CompilerVersion;
        result.abi = source.ABI;
        result.isVerified = source.ABI !== "Contract source code not verified";
      }
    }

    if (tokenRes.status === "fulfilled") {
      const token = (tokenRes.value as Record<string, Record<string, string>[]>)?.result?.[0];
      if (token) {
        result.tokenName = token.tokenName;
        result.tokenSymbol = token.symbol;
        result.totalSupply = token.totalSupply;
        result.isToken = true;
      }
    }
  } catch (err) {
    logger.warn({ err, address, network }, "Failed to fetch contract metadata");
  }

  return result;
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
