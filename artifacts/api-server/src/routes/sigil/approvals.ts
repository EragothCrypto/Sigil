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

    const critical = approvals.filter((approval) => approval.riskLevel === "critical").length;
    const high = approvals.filter((approval) => approval.riskLevel === "high").length;
    const unlimited = approvals.filter((approval) => approval.isUnlimited).length;
    const maxRisk = approvals.reduce((max, approval) => Math.max(max, approval.riskScore), 0);

    return res.json({
      wallet,
      network,
      generatedAt: new Date().toISOString(),
      coverage: {
        status: "limited",
        message:
          "Explorer approval logs were scanned. Current allowance state can differ if a token uses non-standard behavior or explorer logs are incomplete.",
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
    req.log.warn({ err, network, wallet }, "Approval health scan unavailable");
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
