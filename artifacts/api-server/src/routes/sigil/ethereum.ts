import { logger } from "../../lib/logger.js";

const ETHERSCAN_BASE = "https://api.etherscan.io/api";

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

const networkToEtherscanDomain: Record<string, string> = {
  mainnet: "api.etherscan.io",
  goerli: "api-goerli.etherscan.io",
  sepolia: "api-sepolia.etherscan.io",
  polygon: "api.polygonscan.com",
  bsc: "api.bscscan.com",
  arbitrum: "api.arbiscan.io",
};

async function etherscanFetch(
  network: string,
  params: Record<string, string>,
): Promise<unknown> {
  const domain = networkToEtherscanDomain[network] || "api.etherscan.io";
  const url = new URL(`https://${domain}/api`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", process.env.ETHERSCAN_API_KEY || "YourApiKeyToken");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}

export async function fetchTransaction(
  hash: string,
  network: string,
): Promise<TransactionData | null> {
  try {
    const [txRes, receiptRes] = await Promise.allSettled([
      etherscanFetch(network, {
        module: "proxy",
        action: "eth_getTransactionByHash",
        txhash: hash,
      }),
      etherscanFetch(network, {
        module: "proxy",
        action: "eth_getTransactionReceipt",
        txhash: hash,
      }),
    ]);

    const tx = txRes.status === "fulfilled" ? (txRes.value as any)?.result : null;
    const receipt =
      receiptRes.status === "fulfilled"
        ? (receiptRes.value as any)?.result
        : null;

    if (!tx) return null;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gas: tx.gas,
      gasUsed: receipt?.gasUsed,
      gasPrice: tx.gasPrice,
      input: tx.input,
      blockNumber: tx.blockNumber,
      status: receipt?.status,
      methodId: tx.input?.substring(0, 10),
    };
  } catch (err) {
    logger.warn({ err, hash, network }, "Failed to fetch transaction");
    return null;
  }
}

export async function fetchContract(
  address: string,
  network: string,
): Promise<ContractData> {
  const result: ContractData = {
    address,
    isVerified: false,
  };

  try {
    const [sourceRes, tokenRes] = await Promise.allSettled([
      etherscanFetch(network, {
        module: "contract",
        action: "getsourcecode",
        address,
      }),
      etherscanFetch(network, {
        module: "account",
        action: "tokeninfo",
        contractaddress: address,
      }),
    ]);

    if (sourceRes.status === "fulfilled") {
      const source = (sourceRes.value as any)?.result?.[0];
      if (source && source.ContractName) {
        result.contractName = source.ContractName;
        result.compilerVersion = source.CompilerVersion;
        result.abi = source.ABI;
        result.isVerified = source.ABI !== "Contract source code not verified";
      }
    }

    if (tokenRes.status === "fulfilled") {
      const token = (tokenRes.value as any)?.result?.[0];
      if (token) {
        result.tokenName = token.tokenName;
        result.tokenSymbol = token.symbol;
        result.totalSupply = token.totalSupply;
        result.isToken = true;
      }
    }
  } catch (err) {
    logger.warn({ err, address, network }, "Failed to fetch contract");
  }

  return result;
}

const COMMON_METHOD_SIGNATURES: Record<string, string> = {
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0x18160ddd": "totalSupply()",
  "0x70a08231": "balanceOf(address)",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x8803dbee": "swapTokensForExactTokens",
  "0xe8e33700": "addLiquidity",
  "0xf305d719": "addLiquidityETH",
  "0xbaa2abde": "removeLiquidity",
  "0x0902f1ac": "getReserves",
  "0x40c10f19": "mint(address,uint256) — MINTING",
  "0x42966c68": "burn(uint256)",
  "0x1249c58b": "mint()",
  "0x6a627842": "mint(address)",
};

export function decodeMethodId(methodId: string): string | null {
  return COMMON_METHOD_SIGNATURES[methodId] ?? null;
}
