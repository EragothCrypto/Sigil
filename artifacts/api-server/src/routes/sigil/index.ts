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
} from "./ethereum.js";
import {
  analyzeTransaction,
  analyzeContract,
  analyzeUnknown,
} from "./ai-analyzer.js";

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

    if (inputType === "transaction") {
      const tx = await fetchTransaction(trimmed, network);
      const methodName = tx?.methodId ? decodeMethodId(tx.methodId) : null;
      aiResult = await analyzeTransaction(tx, methodName, network, trimmed);
      details = {
        from: tx?.from,
        to: tx?.to,
        value: tx?.value,
        gasUsed: tx?.gasUsed,
        methodName,
        rawData: { hash: tx?.hash, blockNumber: tx?.blockNumber, status: tx?.status },
      };
    } else if (inputType === "contract") {
      const contract = await fetchContract(trimmed, network);
      aiResult = await analyzeContract(contract, network);
      details = {
        contractName: contract.contractName,
        tokenSymbol: contract.tokenSymbol,
        isVerified: contract.isVerified,
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
