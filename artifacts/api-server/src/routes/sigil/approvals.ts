import { Router, type IRouter } from "express";
import { etherscanFetch, isContractAddress } from "./ethereum.js";
import {
  APPROVAL_TOPIC,
  normalizeAddress,
  normalizeApprovalLogs,
  revokeUrl,
  scoreApproval,
  SUPPORTED_APPROVAL_NETWORKS,
  topicAddress,
  type ExplorerApprovalLog,
} from "./approval-health.js";

interface EtherscanLogResponse {
  status?: string;
  message?: string;
  result?: ExplorerApprovalLog[] | string;
}

async function fetchApprovalLogs(network: string, wallet: string): Promise<ExplorerApprovalLog[]> {
  const response = (await etherscanFetch(network, {
    module: "logs",
    action: "getLogs",
    fromBlock: "0",
    toBlock: "latest",
    topic0: APPROVAL_TOPIC,
    topic1: topicAddress(wallet),
    topic0_1_opr: "and",
  })) as EtherscanLogResponse;

  if (typeof response.result === "string" && response.result.toLowerCase().includes("no records found")) {
    return [];
  }

  if (!Array.isArray(response.result)) {
    throw new Error(typeof response.result === "string" ? response.result : response.message ?? "Approval log scan failed");
  }

  return response.result;
}

const router: IRouter = Router();

router.get("/approvals/health", async (req, res) => {
  const wallet = typeof req.query.address === "string" ? normalizeAddress(req.query.address.trim()) : "";
  const network = typeof req.query.network === "string" ? req.query.network.trim().toLowerCase() : "mainnet";

  if (!isContractAddress(wallet)) {
    return res.status(400).json({ error: "A valid EVM wallet address is required." });
  }

  if (!SUPPORTED_APPROVAL_NETWORKS.has(network)) {
    return res.status(400).json({ error: `Unsupported network: ${network}` });
  }

  try {
    const logs = await fetchApprovalLogs(network, wallet);
    const approvals = normalizeApprovalLogs(logs, network, wallet)
      .map(scoreApproval)
      .sort((a, b) => b.riskScore - a.riskScore);

    // ⚡ Bolt Optimization: Replace 4x O(N) array passes (.filter, .reduce) with a single O(N) loop
    let critical = 0;
    let high = 0;
    let unlimited = 0;
    let maxRisk = 0;

    for (let i = 0; i < approvals.length; i++) {
      const approval = approvals[i];
      if (approval.riskLevel === "critical") critical++;
      if (approval.riskLevel === "high") high++;
      if (approval.isUnlimited) unlimited++;
      if (approval.riskScore > maxRisk) maxRisk = approval.riskScore;
    }

    return res.json({
      wallet,
      network,
      generatedAt: new Date().toISOString(),
      coverage: {
        status: "limited",
        message:
          "Explorer approval-event candidates were scanned. Current allowances and token units were not checked; log coverage is bounded and incomplete. Scores are event-review heuristics, not wallet safety assessments.",
      },
      summary: {
        healthScore: Math.max(0, 100 - maxRisk),
        totalActive: approvals.length,
        unlimited,
        critical,
        high,
      },
      approvals,
      revokeUrl: revokeUrl(network, wallet),
    });
  } catch (err) {
    req.log.warn({ err, network }, "Approval health scan unavailable");
    return res.json({
      wallet,
      network,
      generatedAt: new Date().toISOString(),
      coverage: {
        status: "unavailable",
        message:
          "The explorer API did not return approval logs for this scan. Try again later or check the wallet directly with a revoke tool.",
      },
      summary: {
        healthScore: 0,
        totalActive: 0,
        unlimited: 0,
        critical: 0,
        high: 0,
      },
      approvals: [],
      revokeUrl: revokeUrl(network, wallet),
    });
  }
});

export default router;
