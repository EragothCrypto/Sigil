export interface ObservedTransfer {
  kind: "erc20-shaped" | "erc721-shaped";
  token: string;
  from: string;
  to: string;
  amountRaw?: string;
  tokenIdRaw?: string;
}

export interface ReceiptEvidence {
  status: "available" | "unavailable" | "reverted";
  complete: boolean;
  logsExamined: number;
  totalLogs: number | null;
  malformedTransferLogs: number;
  transfers: ObservedTransfer[];
}

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const MAX_LOGS = 200;
const MAX_TRANSFERS = 50;
const ADDRESS = /^0x[0-9a-f]{40}$/i;
const ADDRESS_WORD = /^0x0{24}[0-9a-f]{40}$/i;
const UINT_WORD = /^0x[0-9a-f]{64}$/i;

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

export function summarizeReceipt(value: unknown): ReceiptEvidence {
  const receipt = object(value);
  const result: ReceiptEvidence = {
    status: receipt?.status === "0x0" ? "reverted" : "unavailable",
    complete: false, logsExamined: 0, totalLogs: null, malformedTransferLogs: 0, transfers: [],
  };
  if (receipt?.status !== "0x1" || !Array.isArray(receipt.logs)) return result;
  result.status = "available";
  result.totalLogs = receipt.logs.length;
  result.complete = receipt.logs.length <= MAX_LOGS;
  for (const value of receipt.logs.slice(0, MAX_LOGS)) {
    result.logsExamined++;
    const log = object(value);
    if (!log || !Array.isArray(log.topics)) { result.complete = false; continue; }
    if (typeof log.topics[0] !== "string" || log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
    const [, from, to, tokenId] = log.topics;
    const valid = typeof log.address === "string" && ADDRESS.test(log.address)
      && typeof from === "string" && ADDRESS_WORD.test(from)
      && typeof to === "string" && ADDRESS_WORD.test(to) && log.removed !== true;
    const fungible = log.topics.length === 3 && typeof log.data === "string" && UINT_WORD.test(log.data);
    const nft = log.topics.length === 4 && typeof tokenId === "string" && UINT_WORD.test(tokenId) && log.data === "0x";
    if (!valid || (!fungible && !nft)) { result.malformedTransferLogs++; result.complete = false; continue; }
    if (result.transfers.length >= MAX_TRANSFERS) { result.complete = false; continue; }
    // Decode only fixed ABI words, not arbitrary calldata or a claimed token standard.
    result.transfers.push({
      kind: fungible ? "erc20-shaped" : "erc721-shaped",
      token: (log.address as string).toLowerCase(),
      from: `0x${(from as string).slice(-40).toLowerCase()}`,
      to: `0x${(to as string).slice(-40).toLowerCase()}`,
      ...(fungible ? { amountRaw: BigInt(log.data as string).toString() } : { tokenIdRaw: BigInt(tokenId as string).toString() }),
    });
  }
  return result;
}

function explorerRow(value: unknown): Record<string, unknown> | undefined {
  const envelope = object(value);
  return envelope?.status === "1" && Array.isArray(envelope.result) ? object(envelope.result[0]) : undefined;
}

function usableAbi(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((entry: unknown) => {
    const item = object(entry);
    if (!item || !["function", "event", "error", "constructor", "fallback", "receive"].includes(item.type as string)) return false;
    if (["function", "event", "error"].includes(item.type as string)
      && (typeof item.name !== "string" || !item.name.trim())) return false;
    if (!["fallback", "receive"].includes(item.type as string) && !Array.isArray(item.inputs)) return false;
    return [item.inputs, item.outputs].every(parameters => parameters === undefined
      || (Array.isArray(parameters) && parameters.every(parameter => usableParameter(parameter))));
  });
}

function usableParameter(value: unknown, depth = 0): boolean {
  const param = object(value);
  if (!param || depth > 8 || typeof param.type !== "string" || param.type.length > 128) return false;
  const match = /^(address|bool|string|bytes(?:[1-9]|[12]\d|3[0-2])?|u?int(?:\d+)?|u?fixed(?:\d+x\d+)?|function|tuple)((?:\[(?:[1-9]\d*)?\])*)$/.exec(param.type);
  if (!match) return false;
  const integer = /^u?int(\d+)$/.exec(match[1]!);
  if (integer && (+integer[1]! < 8 || +integer[1]! > 256 || +integer[1]! % 8 !== 0)) return false;
  const fixed = /^u?fixed(\d+)x(\d+)$/.exec(match[1]!);
  if (fixed && (+fixed[1]! < 8 || +fixed[1]! > 256 || +fixed[1]! % 8 !== 0 || +fixed[2]! < 1 || +fixed[2]! > 80)) return false;
  return match[1] !== "tuple" || (Array.isArray(param.components) && param.components.every(component => usableParameter(component, depth + 1)));
}

export function readContractMetadata(address: string, sourceEnvelope: unknown, tokenEnvelope: unknown) {
  const result: {
    address: string; isVerified: boolean; verificationStatus: "verified" | "unverified" | "unknown";
    contractName?: string; compilerVersion?: string; abi?: string;
    tokenName?: string; tokenSymbol?: string; totalSupply?: string; isToken?: boolean;
    isProxy?: boolean; implementation?: string;
  } = { address, isVerified: false, verificationStatus: "unknown" };
  const source = explorerRow(sourceEnvelope);
  if (source?.Proxy === '0' || source?.Proxy === '1') result.isProxy = source.Proxy === '1';
  if (typeof source?.Implementation === 'string' && ADDRESS.test(source.Implementation)) result.implementation = source.Implementation.toLowerCase();
  if (typeof source?.ABI === "string" && Buffer.byteLength(source.ABI, 'utf8') <= 262144) {
    if (source.ABI === "Contract source code not verified") result.verificationStatus = "unverified";
    else {
      try {
        const abi: unknown = JSON.parse(source.ABI);
        if (Array.isArray(abi) && abi.length <= 256 && usableAbi(abi)) {
          result.verificationStatus = "verified";
          result.isVerified = true;
          result.abi = source.ABI;
        }
      } catch { /* Invalid ABI is missing evidence, not unverified source. */ }
    }
  }
  if (typeof source?.ContractName === "string" && source.ContractName.trim() && source.ContractName.length <= 256) result.contractName = source.ContractName;
  if (typeof source?.CompilerVersion === "string" && source.CompilerVersion.trim() && source.CompilerVersion.length <= 256) result.compilerVersion = source.CompilerVersion;
  const token = explorerRow(tokenEnvelope);
  if (typeof token?.tokenName === "string" && token.tokenName.trim() && token.tokenName.length <= 256
    && typeof token.symbol === "string" && token.symbol.trim() && token.symbol.length <= 64
    && typeof token.totalSupply === "string" && /^\d{1,78}$/.test(token.totalSupply)) {
    result.tokenName = token.tokenName;
    result.tokenSymbol = token.symbol;
    result.totalSupply = token.totalSupply;
    result.isToken = true;
  }
  return result;
}

export function historicalExample(hash: string, network: string) {
  if (network !== "mainnet" || hash.toLowerCase() !== "0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d") return undefined;
  return {
    name: "Euler exploit example",
    provenance: "Sigil curated homepage example; retrospective context, not live exploit detection",
    incidentSource: "https://www.euler.finance/blog/war-peace-behind-the-scenes-of-eulers-240m-exploit-recovery",
    limitation: "Exact execution path and losses are not independently established by this scanner; no internal traces were collected.",
  };
}
