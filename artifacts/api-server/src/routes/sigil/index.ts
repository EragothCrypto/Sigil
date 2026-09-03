import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db/schema";
import { desc, eq, ne, and, sql } from "drizzle-orm";
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
  analyzeTransactionStreaming,
  analyzeContractStreaming,
  type StreamEvent,
} from "./ai-analyzer.js";
import { lookupEntity } from "./known-entities.js";
import { calculateContractReputation, type ContractReputation } from "./contract-reputation.js";
import { detectPatterns, mergePatterns, type PatternMatch } from "./pattern-detector.js";
import { computeContractDiff } from "./contract-diff.js";
import { computeScoreFactors } from "./score-factors.js";
import { fetchTokenPrice, computeApprovalUsdValue } from "./token-price.js";
import { analysisCache, cacheKey } from "./analysis-cache.js";
import { ensureAnalysesSchema } from "./analysis-schema.js";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const parseResult = AnalyzeInputBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const { input, network = "mainnet", fresh } = parseResult.data as { input: string; network?: string; fresh?: boolean };
  const trimmed = input.trim();

  if (trimmed.length > 150) {
    res.status(400).json({ error: "validation_error", message: "Input is too long (max 150 characters)" });
    return;
  }
  const inputType = detectInputType(trimmed);
  const key = cacheKey(trimmed, network);

  // ── Cache hit — return instantly without any API / AI calls ───────────────
  if (!fresh) {
    const hit = analysisCache.get(key);
    if (hit) {
      res.json({ ...(hit as object), cached: true });
      return;
    }
  }

  try {
    await ensureAnalysesSchema();

    let aiResult;
    let details: Record<string, unknown> = {};

    let knownEntity = null;
    let approvalInfo = null;
    let reputation: ContractReputation | null = null;
    let patterns: PatternMatch[] = [];
    let isVerified: boolean | undefined = undefined;

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

        // Optimization: Push filtering down to the database using JSONB queries
        // instead of fetching 200 records and filtering in memory. This avoids
        // inefficient in-memory filtering and full table scans.
        const priorHistory = await db
          .select()
          .from(analysesTable)
          .where(
            and(
              sql`${analysesTable.details}->>'spender' = ${approval.spender}`,
              ne(analysesTable.input, trimmed)
            )
          )
          .orderBy(desc(analysesTable.createdAt))
          .limit(5);

        const prior = priorHistory
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

      // Fetch AI analysis and token price in parallel (price only needed for approvals)
      const pricePromise = (approval && tx?.to)
        ? fetchTokenPrice(tx.to, network)
        : Promise.resolve(null);

      const [txAiResult, priceResult] = await Promise.all([
        analyzeTransaction(tx, methodName, network, trimmed, knownEntity, approvalInfo),
        pricePromise,
      ]);
      aiResult = txAiResult;

      // Enrich approvalInfo with USD value now that both have resolved
      if (priceResult && approvalInfo) {
        const usd = computeApprovalUsdValue(
          approvalInfo.amountFormatted,
          approvalInfo.isUnlimited ?? false,
          priceResult.priceUsd,
        );
        approvalInfo = {
          ...approvalInfo,
          tokenPriceUsd: priceResult.priceUsd,
          approvalAmountUsd: usd?.approvalAmountUsd,
          approvalUsdLabel: usd?.displayLabel,
        };
      }

      // Static pattern detection for transactions
      const staticPatterns = detectPatterns({
        tx: tx ?? undefined,
        methodId: tx?.methodId ?? undefined,
        calldata: tx?.input ?? undefined,
        isUnlimitedApproval: approvalInfo?.isUnlimited ?? false,
        spender: approvalInfo?.spender ?? undefined,
        spenderKnown: !!approvalInfo?.spenderEntity,
        knownEntity,
      });
      patterns = mergePatterns(staticPatterns, aiResult.aiPatterns ?? []);
    } else if (inputType === "contract") {
      knownEntity = lookupEntity(trimmed);
      const contract = await fetchContract(trimmed, network);

      // Run AI analysis and reputation scoring in parallel
      const [contractAiResult, contractReputation] = await Promise.all([
        analyzeContract(contract, network, knownEntity),
        calculateContractReputation(
          trimmed,
          network,
          contract.isVerified,
          contract.isToken ?? false,
          knownEntity,
        ),
      ]);
      aiResult = contractAiResult;
      reputation = contractReputation;

      // Static pattern detection for contracts
      const staticContractPatterns = detectPatterns({
        contract,
        knownEntity,
      });
      patterns = mergePatterns(staticContractPatterns, contractAiResult.aiPatterns ?? []);

      isVerified = contract.isVerified;
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

    const scoreFactors = computeScoreFactors({
      inputType: inputType as "transaction" | "contract" | "unknown",
      isVerified,
      knownEntity,
      approvalInfo: approvalInfo
        ? {
            isApproval: approvalInfo.isApproval,
            isRevoke: approvalInfo.isRevoke,
            isUnlimited: approvalInfo.isUnlimited,
            riskLevel: approvalInfo.riskLevel,
            spenderEntity: approvalInfo.spenderEntity,
          }
        : null,
      reputation: reputation
        ? {
            tier: reputation.tier,
            trustScore: reputation.trustScore,
            isExploited: reputation.isExploited,
          }
        : null,
      patterns,
      riskScore: aiResult.riskScore,
    });

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

    const result = {
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
      breakdown: aiResult.breakdown ?? undefined,
      reputation: reputation ?? undefined,
      patterns: patterns.length > 0 ? patterns : undefined,
      scoreFactors: scoreFactors.length > 0 ? scoreFactors : undefined,
      details: saved.details as Record<string, unknown>,
      createdAt: saved.createdAt.toISOString(),
    };

    // Store in cache for future identical requests
    analysisCache.set(key, result);

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Analysis failed");
    res.status(500).json({ error: "analysis_failed", message: "Failed to analyze input" });
  }
});

// ── Streaming analysis endpoint ─────────────────────────────────────────────
router.post("/analyze-stream", async (req, res) => {
  const parseResult = AnalyzeInputBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const { input, network = "mainnet", fresh } = parseResult.data as { input: string; network?: string; fresh?: boolean };
  const trimmed = input.trim();

  if (trimmed.length > 150) {
    res.status(400).json({ error: "validation_error", message: "Input is too long (max 150 characters)" });
    return;
  }
  const inputType = detectInputType(trimmed);
  const key = cacheKey(trimmed, network);

  try {
    await ensureAnalysesSchema();
  } catch (err) {
    req.log.error({ err }, "Analysis schema check failed");
    res.status(500).json({
      error: "database_not_ready",
      message: "Analysis storage is not ready. Check the Vercel DATABASE_URL value and redeploy.",
    });
    return;
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    // Flush the buffer to ensure the client receives the event immediately
    if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
      (res as unknown as { flush: () => void }).flush();
    }
  };

  // ── Cache hit — emit a cached event with the existing result ────────────
  if (!fresh) {
    const hit = analysisCache.get(key) as ({ id?: string } & Record<string, unknown>) | undefined;
    if (hit) {
      send({ type: "cached", id: hit.id, ...hit });
      res.end();
      return;
    }
  }

  let stage = "start";
  try {
    let details: Record<string, unknown> = {};
    let knownEntity = null;
    let approvalInfo = null;
    let reputation: ContractReputation | null = null;
    let patterns: PatternMatch[] = [];
    let isVerified: boolean | undefined = undefined;

    // Emit events from the AI analyser in real-time
    const onEvent = (event: StreamEvent) => send(event as unknown as Record<string, unknown>);

    if (inputType === "transaction") {
      stage = "fetch_transaction";
      const tx = await fetchTransaction(trimmed, network);
      const methodName = tx?.methodId ? decodeMethodId(tx.methodId) : null;
      if (tx?.to) knownEntity = lookupEntity(tx.to);

      // Approval inspection
      const approval = tx?.input ? decodeApprovalCalldata(tx.input) : null;
      if (approval && tx) {
        const spenderEntity = lookupEntity(approval.spender);
        const tokenEntity = lookupEntity(tx.to);
        const amountFormatted = formatApprovalAmount(approval);

        let approvalRisk: "low" | "medium" | "high" | "critical" = "medium";
        if (approval.isRevoke) approvalRisk = "low";
        else if (approval.isUnlimited && !spenderEntity) approvalRisk = "critical";
        else if (approval.isUnlimited && spenderEntity?.trustLevel === "trusted") approvalRisk = "medium";
        else if (approval.isUnlimited) approvalRisk = "high";

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
          priorApprovals: [],
        };

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
          ...(knownEntity ? { protocol: knownEntity.name } : {}),
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

      // Fetch price in parallel while AI streams
      const pricePromise = approval && tx?.to ? fetchTokenPrice(tx.to, network) : Promise.resolve(null);

      stage = "ai_transaction";
      const [aiResult, priceResult] = await Promise.all([
        analyzeTransactionStreaming(tx, methodName, network, trimmed, onEvent, knownEntity, approvalInfo),
        pricePromise,
      ]);

      if (priceResult && approvalInfo) {
        const usd = computeApprovalUsdValue(
          approvalInfo.amountFormatted,
          approvalInfo.isUnlimited ?? false,
          priceResult.priceUsd,
        );
        approvalInfo = {
          ...approvalInfo,
          tokenPriceUsd: priceResult.priceUsd,
          approvalAmountUsd: usd?.approvalAmountUsd,
          approvalUsdLabel: usd?.displayLabel,
        };
      }

      const staticPatterns = detectPatterns({
        tx: tx ?? undefined,
        methodId: tx?.methodId ?? undefined,
        calldata: tx?.input ?? undefined,
        isUnlimitedApproval: approvalInfo?.isUnlimited ?? false,
        spender: approvalInfo?.spender ?? undefined,
        spenderKnown: !!approvalInfo?.spenderEntity,
        knownEntity,
      });
      patterns = mergePatterns(staticPatterns, aiResult.aiPatterns ?? []);

      const scoreFactors = computeScoreFactors({
        inputType: inputType as "transaction" | "contract" | "unknown",
        isVerified,
        knownEntity,
        approvalInfo: approvalInfo
          ? {
              isApproval: approvalInfo.isApproval,
              isRevoke: approvalInfo.isRevoke,
              isUnlimited: approvalInfo.isUnlimited,
              riskLevel: approvalInfo.riskLevel,
              spenderEntity: approvalInfo.spenderEntity,
            }
          : null,
        reputation: null,
        patterns,
        riskScore: aiResult.riskScore,
      });

      stage = "save_transaction";
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

      const result = {
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
        breakdown: aiResult.breakdown ?? undefined,
        patterns: patterns.length > 0 ? patterns : undefined,
        scoreFactors: scoreFactors.length > 0 ? scoreFactors : undefined,
        details: saved.details as Record<string, unknown>,
        createdAt: saved.createdAt.toISOString(),
      };

      analysisCache.set(key, result);
      send({ type: "done", id: result.id });
      res.end();
      return;
    }

    if (inputType === "contract") {
      stage = "fetch_contract";
      knownEntity = lookupEntity(trimmed);
      const contract = await fetchContract(trimmed, network);

      stage = "ai_contract";
      const [aiResult, contractReputation] = await Promise.all([
        analyzeContractStreaming(contract, network, onEvent, knownEntity),
        calculateContractReputation(trimmed, network, contract.isVerified, contract.isToken ?? false, knownEntity),
      ]);
      reputation = contractReputation;

      const staticContractPatterns = detectPatterns({ contract, knownEntity });
      patterns = mergePatterns(staticContractPatterns, aiResult.aiPatterns ?? []);
      isVerified = contract.isVerified;

      details = {
        contractName: contract.contractName,
        tokenSymbol: contract.tokenSymbol,
        isVerified: contract.isVerified,
        ...(knownEntity ? { protocol: knownEntity.name } : {}),
        rawData: { isToken: contract.isToken, tokenName: contract.tokenName, totalSupply: contract.totalSupply },
      };

      const scoreFactors = computeScoreFactors({
        inputType: inputType as "transaction" | "contract" | "unknown",
        isVerified,
        knownEntity,
        approvalInfo: null,
        reputation: reputation
          ? { tier: reputation.tier, trustScore: reputation.trustScore, isExploited: reputation.isExploited }
          : null,
        patterns,
        riskScore: aiResult.riskScore,
      });

      stage = "save_contract";
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

      const result = {
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
        breakdown: aiResult.breakdown ?? undefined,
        reputation: reputation ?? undefined,
        patterns: patterns.length > 0 ? patterns : undefined,
        scoreFactors: scoreFactors.length > 0 ? scoreFactors : undefined,
        details: saved.details as Record<string, unknown>,
        createdAt: saved.createdAt.toISOString(),
      };

      analysisCache.set(key, result);
      send({ type: "done", id: result.id });
      res.end();
      return;
    }

    // Unknown input type
    stage = "ai_unknown";
    const aiResult = await analyzeUnknown(trimmed, network);
    stage = "save_unknown";
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
        details: {},
      })
      .returning();
    send({ type: "done", id: String(saved.id) });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Streaming analysis failed");
    send({ type: "error", message: `Failed to analyze input — please try again. (${stage})` });
    res.end();
  }
});

router.post("/contract-diff", async (req, res) => {
  const { address, network = "mainnet" } = req.body as { address?: string; network?: string };
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ error: "validation_error", message: "Invalid contract address" });
    return;
  }
  try {
    const result = await computeContractDiff(address, network);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Contract diff failed");
    res.status(500).json({ error: "diff_failed", message: "Failed to compute contract diff" });
  }
});

router.get("/hall-of-shame", async (_req, res) => {
  await ensureAnalysesSchema();

  const records = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.hallOfShame, true))
    .orderBy(desc(analysesTable.riskScore));

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
      hallOfShame: true,
      hallOfShameLabel: r.hallOfShameLabel ?? undefined,
    })),
  );
});

router.get("/history", async (req, res) => {
  await ensureAnalysesSchema();

  const requestedId = typeof req.query.id === "string" ? parseInt(req.query.id) : NaN;
  if (!isNaN(requestedId)) {
    const [record] = await db
      .select()
      .from(analysesTable)
      .where(eq(analysesTable.id, requestedId))
      .limit(1);

    if (!record) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    res.json(formatAnalysisRecord(record));
    return;
  }

  let parsedLimit = parseInt(String(req.query.limit ?? "20"), 10);
  if (isNaN(parsedLimit)) parsedLimit = 20;
  const limit = Math.max(1, Math.min(parsedLimit, 100));
  const records = await db
    .select()
    .from(analysesTable)
    .where(ne(analysesTable.hallOfShame, true))
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
  await ensureAnalysesSchema();

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

  res.json(formatAnalysisRecord(record));
});

export default router;

function formatAnalysisRecord(record: typeof analysesTable.$inferSelect) {
  return {
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
  };
}
