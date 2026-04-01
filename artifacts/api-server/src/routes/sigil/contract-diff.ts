import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../../lib/logger.js";
import { rpcCall, etherscanFetch } from "./ethereum.js";

// EIP-1967 standard implementation storage slot
// keccak256("eip1967.proxy.implementation") - 1
const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// OpenZeppelin legacy slot: keccak256("org.zeppelinos.proxy.implementation")
const OZ_LEGACY_SLOT =
  "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3";

// Upgraded(address indexed implementation) event topic
const UPGRADED_TOPIC =
  "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b";

export type DiffRisk = "critical" | "high" | "medium" | "low" | "info";

export interface AbiFunction {
  name: string;
  signature: string;   // "name(type,type)"
  stateMutability: string;
  inputs: { name: string; type: string }[];
}

export interface DiffEntry {
  status: "added" | "removed" | "unchanged";
  fn: AbiFunction;
  risk: DiffRisk;
  riskReason?: string;
}

export interface UpgradeEvent {
  implementation: string;
  txHash: string;
  blockNumber: string;
}

export interface ContractDiffResult {
  isProxy: boolean;
  proxyAddress: string;
  currentImplementation?: string;
  previousImplementation?: string;
  currentImplName?: string;
  previousImplName?: string;
  upgradeHistory: UpgradeEvent[];
  diff: DiffEntry[];
  addedCount: number;
  removedCount: number;
  riskySummary: string[];
  analysisNote: string;
}

function parseAbi(abiStr: string | undefined): AbiFunction[] {
  if (!abiStr || abiStr === "Contract source code not verified") return [];
  try {
    const items = JSON.parse(abiStr) as Array<Record<string, unknown>>;
    return items
      .filter((item) => item.type === "function")
      .map((item) => {
        const inputs = (item.inputs as Array<{ name: string; type: string }>) ?? [];
        const sig = `${item.name}(${inputs.map((i) => i.type).join(",")})`;
        return {
          name: String(item.name ?? ""),
          signature: sig,
          stateMutability: String(item.stateMutability ?? "nonpayable"),
          inputs,
        };
      });
  } catch {
    return [];
  }
}

// Heuristic risk classification for a function based on its name and mutability
function classifyFunctionRisk(fn: AbiFunction): { risk: DiffRisk; reason?: string } {
  const name = fn.name.toLowerCase();

  const criticalNames = [
    "selfdestruct", "suicide", "destroycontract",
    "transferownership", "setowner", "changeowner",
    "withdrawall", "draintoken", "emergencywithdraw",
    "setemergency",
  ];
  if (criticalNames.some((n) => name.includes(n))) {
    return { risk: "critical", reason: `Dangerous control function: ${fn.name}` };
  }

  const highRiskNames = [
    "setapprovalforall", "approve", "permit", "transferfrom",
    "mint", "burn", "pausable", "pause", "unpause",
    "upgradeto", "upgradetoandcall", "migrat",
    "setfee", "setrate", "setmaxsupply", "setwhitelist",
    "blacklist", "whitelist", "addminter", "removeminter",
    "setadmin", "addadmin", "removeadmin", "grantrole",
    "revokerole",
  ];
  if (
    fn.stateMutability !== "view" &&
    fn.stateMutability !== "pure" &&
    highRiskNames.some((n) => name.includes(n))
  ) {
    return { risk: "high", reason: `Privileged or sensitive function: ${fn.name}` };
  }

  const mediumNames = [
    "withdraw", "claim", "sweep", "collect",
    "setprice", "setcap", "settax", "setslippage",
    "execute", "call", "delegatecall", "multicall",
    "initialize", "reinitializ",
  ];
  if (
    fn.stateMutability !== "view" &&
    fn.stateMutability !== "pure" &&
    mediumNames.some((n) => name.includes(n))
  ) {
    return { risk: "medium", reason: `Potentially sensitive state-changing function: ${fn.name}` };
  }

  if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
    return { risk: "info" };
  }

  return { risk: "low" };
}

async function fetchImplName(address: string, network: string): Promise<string | undefined> {
  try {
    const res = await etherscanFetch(network, {
      module: "contract",
      action: "getsourcecode",
      address,
    });
    const source = (res as Record<string, Record<string, string>[]>)?.result?.[0];
    return source?.ContractName ?? undefined;
  } catch {
    return undefined;
  }
}

async function fetchImplAbi(address: string, network: string): Promise<string | undefined> {
  try {
    const res = await etherscanFetch(network, {
      module: "contract",
      action: "getsourcecode",
      address,
    });
    const source = (res as Record<string, Record<string, string>[]>)?.result?.[0];
    const abi = source?.ABI;
    return abi && abi !== "Contract source code not verified" ? abi : undefined;
  } catch {
    return undefined;
  }
}

async function getImplementationFromSlot(
  proxyAddress: string,
  network: string,
  slot: string,
): Promise<string | null> {
  try {
    const raw = await rpcCall(network, "eth_getStorageAt", [proxyAddress, slot, "latest"]);
    const hex = String(raw ?? "0x");
    if (!hex || hex === "0x" || hex === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return null;
    }
    // Address is the last 20 bytes (40 hex chars)
    const addr = "0x" + hex.slice(-40);
    if (addr === "0x0000000000000000000000000000000000000000") return null;
    return addr;
  } catch {
    return null;
  }
}

async function getUpgradeHistory(proxyAddress: string, network: string): Promise<UpgradeEvent[]> {
  try {
    const logs = await rpcCall(network, "eth_getLogs", [
      {
        address: proxyAddress,
        topics: [UPGRADED_TOPIC],
        fromBlock: "0x0",
        toBlock: "latest",
      },
    ]);
    const entries = (logs as Array<Record<string, string>>) ?? [];
    return entries.map((log) => {
      // Implementation address is in the first indexed topic (topics[1])
      const implHex = log.topics?.[1] ?? "";
      const impl = "0x" + implHex.slice(-40);
      return {
        implementation: impl,
        txHash: log.transactionHash ?? "",
        blockNumber: parseInt(log.blockNumber ?? "0x0", 16).toString(),
      };
    });
  } catch {
    return [];
  }
}

async function aiRiskSummary(addedFns: AbiFunction[], removedFns: AbiFunction[]): Promise<string[]> {
  if (addedFns.length === 0 && removedFns.length === 0) {
    return ["No ABI-level changes detected between implementations."];
  }

  try {
    const addedList = addedFns.map((f) => f.signature).join(", ") || "none";
    const removedList = removedFns.map((f) => f.signature).join(", ") || "none";

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are a smart contract security expert. Given a list of added and removed function signatures from a proxy upgrade, return a JSON array of 2-4 concise risk observations in plain English. Each observation should be one sentence. Focus only on security implications.",
        },
        {
          role: "user",
          content: `Added functions: ${addedList}\nRemoved functions: ${removedList}\n\nReturn ONLY a JSON array of strings, no markdown, no explanation.`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "[]";
    const arr = JSON.parse(text.replace(/```json|```/g, "").trim()) as string[];
    return Array.isArray(arr) ? arr.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export async function computeContractDiff(
  proxyAddress: string,
  network: string,
): Promise<ContractDiffResult> {
  const base: ContractDiffResult = {
    isProxy: false,
    proxyAddress,
    upgradeHistory: [],
    diff: [],
    addedCount: 0,
    removedCount: 0,
    riskySummary: [],
    analysisNote: "",
  };

  // 1. Check if proxy via EIP-1967 or legacy OZ slot
  const [eip1967Impl, ozImpl] = await Promise.all([
    getImplementationFromSlot(proxyAddress, network, EIP1967_IMPL_SLOT),
    getImplementationFromSlot(proxyAddress, network, OZ_LEGACY_SLOT),
  ]);

  const currentImpl = eip1967Impl ?? ozImpl;

  if (!currentImpl) {
    base.analysisNote = "This contract does not appear to be an upgradeable proxy. No implementation slot found.";
    return base;
  }

  base.isProxy = true;
  base.currentImplementation = currentImpl;

  // 2. Get upgrade history
  const history = await getUpgradeHistory(proxyAddress, network);
  base.upgradeHistory = history;

  // Previous implementation = second-to-last in history (most recent before current)
  const previousImpl =
    history.length >= 2
      ? history[history.length - 2].implementation
      : undefined;
  base.previousImplementation = previousImpl;

  // 3. Fetch names and ABIs in parallel
  const [currentName, previousName, currentAbiStr, previousAbiStr] = await Promise.all([
    fetchImplName(currentImpl, network),
    previousImpl ? fetchImplName(previousImpl, network) : Promise.resolve(undefined),
    fetchImplAbi(currentImpl, network),
    previousImpl ? fetchImplAbi(previousImpl, network) : Promise.resolve(undefined),
  ]);

  base.currentImplName = currentName;
  base.previousImplName = previousName;

  // 4. Parse and diff ABIs
  const currentFns = parseAbi(currentAbiStr);
  const previousFns = parseAbi(previousAbiStr);

  const previousSigs = new Set(previousFns.map((f) => f.signature));
  const currentSigs = new Set(currentFns.map((f) => f.signature));

  const added = currentFns.filter((f) => !previousSigs.has(f.signature));
  const removed = previousFns.filter((f) => !currentSigs.has(f.signature));
  const unchanged = currentFns.filter((f) => previousSigs.has(f.signature));

  const diff: DiffEntry[] = [
    ...added.map((fn) => {
      const { risk, reason } = classifyFunctionRisk(fn);
      return { status: "added" as const, fn, risk, riskReason: reason };
    }),
    ...removed.map((fn) => ({
      status: "removed" as const,
      fn,
      risk: "info" as DiffRisk,
    })),
    ...unchanged.map((fn) => ({
      status: "unchanged" as const,
      fn,
      risk: "info" as DiffRisk,
    })),
  ];

  // Sort: added first (by risk desc), then removed, then unchanged
  const riskOrder: Record<DiffRisk, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  diff.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder = { added: 0, removed: 1, unchanged: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return riskOrder[a.risk] - riskOrder[b.risk];
  });

  base.diff = diff;
  base.addedCount = added.length;
  base.removedCount = removed.length;

  // 5. AI risk summary
  base.riskySummary = await aiRiskSummary(added, removed);

  if (!previousImpl) {
    base.analysisNote =
      "This is the first recorded implementation. No previous version to compare against.";
  } else if (currentAbiStr && previousAbiStr) {
    base.analysisNote = `Comparing ${previousName ?? previousImpl.slice(0, 8) + "…"} → ${currentName ?? currentImpl.slice(0, 8) + "…"}`;
  } else if (!currentAbiStr || !previousAbiStr) {
    base.analysisNote =
      "One or both implementations are not verified on Etherscan. ABI diff may be incomplete.";
  }

  return base;
}
