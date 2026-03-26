import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { AnalyzeInputBody } from "@workspace/api-zod";
import {
  detectInputType,
  fetchTransaction,
  fetchContract,
  decodeMethodId,
  decodeApprovalCalldata,
  formatApprovalAmount,
} from "./ethereum.js";
import {
  analyzeTransaction,
  analyzeContract,
  analyzeUnknown,
} from "./ai-analyzer.js";
import { lookupEntity } from "./known-entities.js";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const parseResult = AnalyzeInputBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const { input, network = "mainnet" } = parseResult.data;
  const trimmed = input.trim();
  const inputType = detectInputType(trimmed);

  try {
    let aiResult;
    let details: Record<string, unknown> = {};

    let knownEntity = null;

    let approvalInfo = null;

    if (inputType === "transaction") {
      const tx = await fetchTransaction(trimmed, network);
      const methodName = tx?.methodId ? decodeMethodId(tx.methodId) : null;
      // Check both `to` and common proxy addresses for known entity
      if (tx?.to) knownEntity = lookupEntity(tx.to);

      // ── Approval Inspector ────────────────────────────────────────────────
      const approval = tx?.input ? decodeApprovalCalldata(tx.input) : null;
      if (approval && tx) {
        const spenderEntity = lookupEntity(approval.spender);
        const tokenEntity   = lookupEntity(tx.to);
        const amountFormatted = formatApprovalAmount(approval);

        // Risk level: revoke = low, exact amount = medium, unlimited to unknown = critical
        let approvalRisk: "low" | "medium" | "high" | "critical" = "medium";
        if (approval.isRevoke) approvalRisk = "low";
        else if (approval.isUnlimited && !spenderEntity) approvalRisk = "critical";
        else if (approval.isUnlimited && spenderEntity?.trustLevel === "trusted") approvalRisk = "medium";
        else if (approval.isUnlimited) approvalRisk = "high";
        else approvalRisk = "medium";

        // Look up prior approvals to the same spender in our DB history
        const allHistory = await db
          .select()
          .from(analysesTable)
          .orderBy(desc(analysesTable.createdAt))
          .limit(200);

        const prior = allHistory
          .filter((r) => {
            const d = r.details as Record<string, unknown> | null;
            return d?.spender === approval.spender && r.input !== trimmed;
          })
          .slice(0, 5)
          .map((r) => {
            const d = r.details as Record<string, unknown>;
            return {
              id: String(r.id),
              analyzedAt: r.createdAt.toISOString(),
              amountFormatted: String(d.approvalAmount ?? "unknown"),
              isUnlimited: Boolean(d.approvalIsUnlimited),
              network: r.network,
            };
          });

        approvalInfo = {
          isApproval: true,
          isRevoke: approval.isRevoke,
          approvalType: approval.type,
          spender: approval.spender,
          spenderEntity: spenderEntity ?? undefined,
          tokenContract: tx.to,
          tokenEntity: tokenEntity ?? undefined,
          amountFormatted,
          isUnlimited: approval.isUnlimited,
          riskLevel: approvalRisk,
          priorApprovals: prior,
        };

        // Store spender in details so future runs can find it
        details = {
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasUsed: tx.gasUsed,
          methodName,
          spender: approval.spender,
          approvalAmount: amountFormatted,
          approvalIsUnlimited: approval.isUnlimited,
          ...(spenderEntity ? { spenderProtocol: spenderEntity.name } : {}),
          ...(knownEntity   ? { protocol: knownEntity.name } : {}),
          rawData: { hash: tx.hash, blockNumber: tx.blockNumber, status: tx.status },
        };
      } else {
        details = {
          from: tx?.from,
          to: tx?.to,
          value: tx?.value,
          gasUsed: tx?.gasUsed,
          methodName,
          ...(knownEntity ? { protocol: knownEntity.name } : {}),
          rawData: { hash: tx?.hash, blockNumber: tx?.blockNumber, status: tx?.status },
        };
      }

      aiResult = await analyzeTransaction(tx, methodName, network, trimmed, knownEntity, approvalInfo);
    } else if (inputType === "contract") {
      knownEntity = lookupEntity(trimmed);
      const contract = await fetchContract(trimmed, network);
      aiResult = await analyzeContract(contract, network, knownEntity);
      details = {
        contractName: contract.contractName,
        tokenSymbol: contract.tokenSymbol,
        isVerified: contract.isVerified,
        ...(knownEntity ? { protocol: knownEntity.name } : {}),
        rawData: {
          isToken: contract.isToken,
          tokenName: contract.tokenName,
          totalSupply: contract.totalSupply,
        },
      };
    } else {
      aiResult = await analyzeUnknown(trimmed, network);
    }

    const [saved] = await db
      .insert(analysesTable)
      .values({
        input: trimmed,
        inputType,
        network,
        summary: aiResult.summary,
        verdict: aiResult.verdict,
        verdictReason: aiResult.verdictReason,
        riskScore: aiResult.riskScore,
        riskLevel: aiResult.riskLevel,
        warnings: aiResult.warnings,
        positives: aiResult.positives,
        details,
      })
      .returning();

    res.json({
      id: String(saved.id),
      input: saved.input,
      inputType: saved.inputType,
      network: saved.network,
      summary: saved.summary,
      verdict: saved.verdict,
      verdictReason: saved.verdictReason,
      riskScore: saved.riskScore,
      riskLevel: saved.riskLevel,
      warnings: saved.warnings as string[],
      positives: saved.positives as string[],
      knownEntity: knownEntity ?? undefined,
      approvalInfo: approvalInfo ?? undefined,
      details: saved.details as Record<string, unknown>,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: "analysis_failed", message: "Failed to analyze input" });
  }
});

router.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
  const records = await db
    .select()
    .from(analysesTable)
    .orderBy(desc(analysesTable.createdAt))
    .limit(limit);

  res.json(
    records.map((r) => ({
      id: String(r.id),
      input: r.input,
      inputType: r.inputType,
      network: r.network,
      summary: r.summary,
      verdict: r.verdict,
      verdictReason: r.verdictReason,
      riskScore: r.riskScore,
      riskLevel: r.riskLevel,
      warnings: r.warnings as string[],
      positives: r.positives as string[],
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.get("/history/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  const [record] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, id))
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  res.json({
    id: String(record.id),
    input: record.input,
    inputType: record.inputType,
    network: record.network,
    summary: record.summary,
    verdict: record.verdict,
    verdictReason: record.verdictReason,
    riskScore: record.riskScore,
    riskLevel: record.riskLevel,
    warnings: record.warnings as string[],
    positives: record.positives as string[],
    details: record.details as Record<string, unknown>,
    createdAt: record.createdAt.toISOString(),
  });
});

export default router;
