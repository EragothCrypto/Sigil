import type { EvidenceRpc } from "./evidence-rpc.js";

const NETWORKS = new Set(["mainnet", "polygon", "arbitrum", "optimism", "base", "bsc", "goerli", "sepolia"]);
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]{0,63})$/;
const BYTES = /^0x(?:[0-9a-fA-F]{2})*$/;
const MAX_INPUT_BYTES = 68 * 1024;
export interface ExecutionInput {
  network: string;
  transaction?: { to?: string; from?: string; data?: string; value?: string; gas?: string };
}
const LIMITATIONS = [
  "A read-only call is not mined execution or signing clearance.",
  "Internal traces, isolated wallet balance deltas and storage simulation are unavailable.",
  "No asset movement or granted permission is established. Historical archive support is not established.",
];
const CAPABILITIES = {
  readOnlyCall: true, internalTraces: false, walletBalanceDeltas: false,
  storageSimulation: false, permissionState: false, historicalArchive: false,
};
export function parseExecutionInput(body: unknown): ExecutionInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !["rawData", "network", "fromAddress"].includes(key))) return null;
  if (typeof input.rawData !== "string" || !input.rawData.trim() || Buffer.byteLength(input.rawData, "utf8") > MAX_INPUT_BYTES) return null;
  const network = input.network === undefined ? "mainnet" : input.network;
  if (typeof network !== "string" || !NETWORKS.has(network)) return null;
  if (input.fromAddress !== undefined && (typeof input.fromAddress !== "string" || !ADDRESS.test(input.fromAddress))) return null;
  const raw = input.rawData.trim();
  if (!raw.startsWith("{") && !raw.startsWith("[")) {
    if (raw.startsWith("0x") && (!BYTES.test(raw) || raw.length > 65538)) return null;
    return { network };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const tx = parsed as Record<string, unknown>;
  if (!Object.keys(tx).length || Object.keys(tx).some(key => !["to", "from", "data", "value", "gas"].includes(key))) return null;
  for (const key of ["to", "from"]) {
    if (tx[key] !== undefined && (typeof tx[key] !== "string" || !ADDRESS.test(tx[key]))) return null;
  }
  for (const key of ["value", "gas"]) {
    if (tx[key] !== undefined && (typeof tx[key] !== "string" || !QUANTITY.test(tx[key]))) return null;
  }
  if (tx.data !== undefined && (typeof tx.data !== "string" || !BYTES.test(tx.data) || tx.data.length > 65538)) return null;
  if (input.fromAddress && tx.from && String(input.fromAddress).toLowerCase() !== String(tx.from).toLowerCase()) return null;
  const transaction = { ...tx } as NonNullable<ExecutionInput["transaction"]>;
  if (input.fromAddress && !transaction.from) transaction.from = String(input.fromAddress);
  return { network, transaction };
}
function report(input: ExecutionInput) {
  return { reportVersion: "execution-check-v2" as const, network: input.network,
    capabilities: { ...CAPABILITIES }, limitations: [...LIMITATIONS] };
}
export async function checkExecution(input: ExecutionInput, rpc?: Pick<EvidenceRpc, "call">) {
  const base = report(input);
  if (!input.transaction?.to) return {
    ...base, assessmentStatus: "advisory_only" as const,
    summary: "No executable destination context. This input was not remotely validated.",
    limitations: [...base.limitations, "Plaintext, calldata-only and contract creation are not supported call checks."],
  };
  const unavailable = () => ({ ...base, assessmentStatus: "unavailable" as const,
    summary: "The read-only call check is unavailable; no execution outcome is established.",
    limitations: [...base.limitations, "RPC evidence was unavailable, malformed or exceeded its budget."],
  });
  if (!rpc) return unavailable();
  try {
    const blockNumber = await rpc.call("eth_blockNumber", [], value => typeof value === "string" && QUANTITY.test(value));
    if (typeof blockNumber !== "string" || !QUANTITY.test(blockNumber)) return unavailable();
    const output = await rpc.call("eth_call", [input.transaction, blockNumber], value => typeof value === "string" && value.length <= 65538 && BYTES.test(value));
    if (typeof output !== "string" || output.length > 65538 || !BYTES.test(output)) return unavailable();
    return { ...base, assessmentStatus: "call_check" as const,
      summary: "Read-only eth_call completed at the recorded block. This is not a safety assessment.",
      callCheck: { outcome: "success" as const, blockNumber, to: input.transaction.to,
        ...(input.transaction.from ? { from: input.transaction.from } : {}) },
      limitations: [...base.limitations, ...(!input.transaction.from ? ["Caller address was omitted; the provider's default caller context applies."] : [])],
    };
  } catch { return unavailable(); }
}
