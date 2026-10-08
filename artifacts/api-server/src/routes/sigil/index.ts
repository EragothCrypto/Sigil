import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { analysesTable } from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { AnalyzeInputBody } from "@workspace/api-zod";
import {
  detectInputType,
  fetchTransaction,
  fetchContract,
  decodeMethodId,
  decodeApprovalCalldata,
  formatApprovalAmount,
  isSupportedNetwork,
  verifiedEvidence,
  transactionEvidenceDetails,
} from "./ethereum.js";
import {
  AIAnalysisOutputError,
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
import { ensureAnalysesSchema, runAnalysisRetentionCleanup } from "./analysis-schema.js";
import { collectAnalysisEvidence } from "./analysis-adapters.js";
import { validatedCacheEntry } from "./analysis-cache-validation.js";
import { AnalysisTimeoutError, createAnalysisDeadline } from './analysis-deadline.js';

async function acquireAdapters(tx: Awaited<ReturnType<typeof fetchTransaction>> & {}, network: string, req: Request, res: Response) {
  const controller = new AbortController();
  const aborted = () => controller.abort();
  const closed = () => { if (!res.writableEnded) controller.abort(); };
  req.on?.("aborted", aborted);
  res.on?.("close", closed);
  try {
    if (req.aborted || res.destroyed) controller.abort();
    const evidence = await collectAnalysisEvidence(tx, network, {signal: controller.signal});
    controller.signal.throwIfAborted();
    tx.analysisEvidence = evidence;
  } finally {
    req.off?.("aborted", aborted);
    res.off?.("close", closed);
  }
}

const router: IRouter = Router();
const TRANSACTION_DATA_UNAVAILABLE = "Analysis unavailable: transaction data could not be retrieved. Check the network and hash, then retry. No risk verdict was produced.";
const networkEntity = (address: string, network: string) => network === "mainnet" ? lookupEntity(address) : null;

router.get("/maintenance/retention", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.get("authorization") !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    await ensureAnalysesSchema();
    const deleted = await runAnalysisRetentionCleanup();
    res.json({ status: "ok", deleted });
  } catch {
    req.log.error("Scheduled analysis retention cleanup failed");
    res.status(500).json({ error: "retention_cleanup_failed" });
  }
});

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
  if (inputType === "unknown") {
    res.status(400).json({ error: "validation_error", message: "Enter a complete transaction hash or contract address. No risk verdict was produced." });
    return;
  }
  if (!isSupportedNetwork(network)) {
    res.status(400).json({ error: "unsupported_network", message: "Select a supported network" });
    return;
  }
  const key = cacheKey(trimmed, network);

  // ── Cache hit — return instantly without any API / AI calls ───────────────
  if (!fresh) {
    const hit = analysisCache.get(key);
    if (hit && validatedCacheEntry(hit, trimmed, network)) {
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
      if (!tx) {
        res.status(503).json({ error: "transaction_data_unavailable", message: TRANSACTION_DATA_UNAVAILABLE });
        return;
      }
      const methodName = tx?.methodId ? decodeMethodId(tx.methodId) : null;
      // Check both `to` and common proxy addresses for known entity
      if (tx?.to) knownEntity = networkEntity(tx.to, network);

      // ── Approval Inspector ────────────────────────────────────────────────
      const approval = tx?.input ? decodeApprovalCalldata(tx.input) : null;
      if (approval && tx) {
        const spenderEntity = networkEntity(approval.spender, network);
        const tokenEntity   = networkEntity(tx.to, network);
        const amountFormatted = formatApprovalAmount(approval);

        // Risk level: revoke = low, exact amount = medium, unlimited to unknown = critical
        let approvalRisk: "low" | "medium" | "high" | "critical" = "medium";
        if (approval.isRevoke) approvalRisk = "low";
        else if (approval.isUnlimited && !spenderEntity) approvalRisk = "critical";
        else if (approval.isUnlimited && spenderEntity?.trustLevel === "trusted") approvalRisk = "medium";
        else if (approval.isUnlimited) approvalRisk = "high";
        else approvalRisk = "medium";

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

        // Store approval context without correlating other users' analyses.
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

      Object.assign(details, transactionEvidenceDetails(tx));
      await acquireAdapters(tx, network, req, res);
      Object.assign(details.rawData as Record<string, unknown>, { receiptEvidence: tx?.receiptEvidence, historicalExample: tx?.historicalExample });
      isVerified = tx?.destinationVerification === "verified" ? true : tx?.destinationVerification === "unverified" ? false : undefined;

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
        const usd = approvalInfo.isUnlimited ? computeApprovalUsdValue(
          approvalInfo.amountFormatted,
          approvalInfo.isUnlimited ?? false,
          priceResult.priceUsd,
        ) : null;
        approvalInfo = {
          ...approvalInfo,
          tokenPriceUsd: priceResult.priceUsd,
          approvalAmountUsd: usd?.approvalAmountUsd,
          approvalUsdLabel: usd?.displayLabel,
        };
      }

      // Static pattern detection for transactions
      const staticPatterns = aiResult.validatedReport ? [] : detectPatterns({
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
      knownEntity = networkEntity(trimmed, network);
      const contract = await fetchContract(trimmed, network);

      const contractAiResult = await analyzeContract(contract, network, knownEntity);
      aiResult = contractAiResult;

      // Static pattern detection for contracts
      const staticContractPatterns = aiResult.validatedReport ? [] : detectPatterns({
        contract,
        knownEntity,
      });
      patterns = mergePatterns(staticContractPatterns, contractAiResult.aiPatterns ?? []);

      isVerified = verifiedEvidence(contract);
      details = {
        contractName: contract.contractName,
        tokenSymbol: contract.tokenSymbol,
        isVerified: verifiedEvidence(contract),
        sourceVerification: contract.verificationStatus,
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

    if (aiResult.validatedReport) details.validatedReport = aiResult.validatedReport;
    const scoreFactors = aiResult.validatedReport ? [] : computeScoreFactors({
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

    const [saved] = await db
      .insert(analysesTable)
      .values({
        publicId: randomUUID(),
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
      id: saved.publicId!,
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
      knownEntity: aiResult.validatedReport ? undefined : knownEntity ?? undefined,
      approvalInfo: aiResult.validatedReport ? undefined : approvalInfo ?? undefined,
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
    res.status(err instanceof AIAnalysisOutputError ? 502 : 500).json({
      error: err instanceof AIAnalysisOutputError ? err.code : "analysis_failed",
      message: err instanceof AIAnalysisOutputError ? err.message : "Failed to analyze input",
    });
  }
});

// ── Streaming analysis endpoint ─────────────────────────────────────────────
router.post("/analyze-stream", async (req, res) => {
  const started = Date.now();
  let stage = 'validate_input';
  const cancelled = new AbortController();
  const deadline = createAnalysisDeadline(() => {
    req.log.warn?.({stage, elapsedMs: Date.now() - started}, 'Analysis deadline exceeded');
    if (res.destroyed || res.writableEnded) return;
    const error = {type: 'error', code: 'analysis_timeout', message: new AnalysisTimeoutError().message};
    if (res.headersSent) res.end(`data: ${JSON.stringify(error)}\n\n`);
    else res.status(503).json(error);
  }, 120000, cancelled.signal);
  const aborted = () => cancelled.abort();
  const cleanup = () => {
    if (!res.writableEnded) cancelled.abort();
    deadline.dispose();
    req.off?.('aborted', aborted); res.off?.('finish', cleanup); res.off?.('close', cleanup);
  };
  req.on?.('aborted', aborted); res.on?.('finish', cleanup); res.on?.('close', cleanup);
  if (req.aborted || res.destroyed) aborted();
  const setStage = (next: string) => {
    deadline.check(); stage = next;
    req.log.info?.({stage, elapsedMs: Date.now() - started}, 'Analysis stage started');
  };
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
  if (inputType === "unknown") {
    res.status(400).json({ error: "validation_error", message: "Enter a complete transaction hash or contract address. No risk verdict was produced." });
    return;
  }
  const key = cacheKey(trimmed, network);

  try {
    if (!isSupportedNetwork(network)) {
      res.status(400).json({ error: "unsupported_network", message: "Select a supported network" });
      return;
    }
    setStage('schema');
    await deadline.wait(ensureAnalysesSchema());
  } catch (err) {
    if (res.destroyed || res.writableEnded) return;
    req.log.error({ err, stage }, "Analysis schema check failed");
    res.status(500).json({
      error: "database_not_ready",
      message: "Analysis storage is not ready. Check the Vercel DATABASE_URL value and redeploy.",
    });
    return;
  }

  deadline.check();
  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: Record<string, unknown>) => {
    if (res.destroyed || res.writableEnded || deadline.signal.aborted) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    // Flush the buffer to ensure the client receives the event immediately
    if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
      (res as unknown as { flush: () => void }).flush();
    }
  };

  // ── Cache hit — emit a cached event with the existing result ────────────
  if (!fresh) {
    const hit = analysisCache.get(key) as ({ id?: string } & Record<string, unknown>) | undefined;
    if (hit && validatedCacheEntry(hit, trimmed, network)) {
      send({ type: "cached", id: hit.id, ...hit });
      res.end();
      return;
    }
  }

  setStage('start');
  try {
    let details: Record<string, unknown> = {};
    let knownEntity = null;
    let approvalInfo = null;
    let reputation: ContractReputation | null = null;
    let patterns: PatternMatch[] = [];
    let isVerified: boolean | undefined = undefined;

    // Emit events from the AI analyser in real-time
    const onEvent = (event: StreamEvent) => send(event.type === "result"
      ? { ...event, result: { ...event.result, details: { ...details, ...(event.result.validatedReport ? { validatedReport: event.result.validatedReport } : {}) } } }
      : event as unknown as Record<string, unknown>);

    if (inputType === "transaction") {
      setStage('fetch_transaction');
      const tx = await deadline.wait(fetchTransaction(trimmed, network));
      if (!tx) {
        send({ type: "error", code: "transaction_data_unavailable", message: TRANSACTION_DATA_UNAVAILABLE });
        res.end();
        return;
      }
      const methodName = tx?.methodId ? decodeMethodId(tx.methodId) : null;
      if (tx?.to) knownEntity = networkEntity(tx.to, network);

      // Approval inspection
      const approval = tx?.input ? decodeApprovalCalldata(tx.input) : null;
      if (approval && tx) {
        const spenderEntity = networkEntity(approval.spender, network);
        const tokenEntity = networkEntity(tx.to, network);
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

      Object.assign(details, transactionEvidenceDetails(tx));
      setStage('evidence_adapters');
      await deadline.wait(acquireAdapters(tx, network, req, res));
      Object.assign(details.rawData as Record<string, unknown>, { receiptEvidence: tx?.receiptEvidence, historicalExample: tx?.historicalExample });
      isVerified = tx?.destinationVerification === "verified" ? true : tx?.destinationVerification === "unverified" ? false : undefined;

      // Fetch price in parallel while AI streams
      const pricePromise = approval && tx?.to ? fetchTokenPrice(tx.to, network) : Promise.resolve(null);

      setStage('ai_transaction');
      const [aiResult, priceResult] = await deadline.wait(Promise.all([
        analyzeTransactionStreaming(tx, methodName, network, trimmed, onEvent, knownEntity, approvalInfo, deadline.signal),
        pricePromise,
      ]));

      if (priceResult && approvalInfo) {
        const usd = approvalInfo.isUnlimited ? computeApprovalUsdValue(
          approvalInfo.amountFormatted,
          approvalInfo.isUnlimited ?? false,
          priceResult.priceUsd,
        ) : null;
        approvalInfo = {
          ...approvalInfo,
          tokenPriceUsd: priceResult.priceUsd,
          approvalAmountUsd: usd?.approvalAmountUsd,
          approvalUsdLabel: usd?.displayLabel,
        };
      }

      if (aiResult.validatedReport) details.validatedReport = aiResult.validatedReport;
      const staticPatterns = aiResult.validatedReport ? [] : detectPatterns({
        tx: tx ?? undefined,
        methodId: tx?.methodId ?? undefined,
        calldata: tx?.input ?? undefined,
        isUnlimitedApproval: approvalInfo?.isUnlimited ?? false,
        spender: approvalInfo?.spender ?? undefined,
        spenderKnown: !!approvalInfo?.spenderEntity,
        knownEntity,
      });
      patterns = mergePatterns(staticPatterns, aiResult.aiPatterns ?? []);

      const scoreFactors = aiResult.validatedReport ? [] : computeScoreFactors({
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

      setStage('save_transaction');
      const [saved] = await deadline.wait(db
        .insert(analysesTable)
        .values({
          publicId: randomUUID(),
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
        .returning());

      const result = {
        id: saved.publicId!,
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
        knownEntity: aiResult.validatedReport ? undefined : knownEntity ?? undefined,
        approvalInfo: aiResult.validatedReport ? undefined : approvalInfo ?? undefined,
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
      setStage('fetch_contract');
      knownEntity = networkEntity(trimmed, network);
      const contract = await deadline.wait(fetchContract(trimmed, network, true, deadline.signal));

      setStage('ai_contract');
      details = {
        contractName: contract.contractName,
        tokenSymbol: contract.tokenSymbol,
        isVerified: verifiedEvidence(contract),
        sourceVerification: contract.verificationStatus,
        ...(knownEntity ? { protocol: knownEntity.name } : {}),
        rawData: { isToken: contract.isToken, tokenName: contract.tokenName, totalSupply: contract.totalSupply },
      };
      const aiResult = await deadline.wait(analyzeContractStreaming(contract, network, onEvent, knownEntity, deadline.signal));
      if (aiResult.validatedReport) details.validatedReport = aiResult.validatedReport;

      const staticContractPatterns = aiResult.validatedReport ? [] : detectPatterns({ contract, knownEntity });
      patterns = mergePatterns(staticContractPatterns, aiResult.aiPatterns ?? []);
      isVerified = verifiedEvidence(contract);

      const scoreFactors = aiResult.validatedReport ? [] : computeScoreFactors({
        inputType: inputType as "transaction" | "contract" | "unknown",
        isVerified,
        knownEntity,
        approvalInfo: null,
        reputation: null,
        patterns,
        riskScore: aiResult.riskScore,
      });

      setStage('save_contract');
      const [saved] = await deadline.wait(db
        .insert(analysesTable)
        .values({
          publicId: randomUUID(),
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
        .returning());

      const result = {
        id: saved.publicId!,
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
        knownEntity: aiResult.validatedReport ? undefined : knownEntity ?? undefined,
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
    setStage('ai_unknown');
    const aiResult = await deadline.wait(analyzeUnknown(trimmed, network));
    setStage('save_unknown');
    const [saved] = await deadline.wait(db
      .insert(analysesTable)
      .values({
        publicId: randomUUID(),
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
      .returning());
    send({ type: "done", id: saved.publicId! });
    res.end();
  } catch (err) {
    if (res.destroyed || res.writableEnded) return;
    req.log.error({ err, stage, elapsedMs: Date.now() - started }, "Streaming analysis failed");
    send({ type: "error", code: err instanceof AnalysisTimeoutError ? err.code : err instanceof AIAnalysisOutputError ? err.code : "analysis_failed", message: err instanceof AIAnalysisOutputError || err instanceof AnalysisTimeoutError
      ? err.message
      : `Failed to analyze input — please try again. (${stage})` });
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

  const requestedId = typeof req.query.id === "string" ? req.query.id : "";
  if (requestedId) {
    const record = await findPublicAnalysis(requestedId);

    if (!record) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }

    res.json(formatAnalysisRecord(record));
    return;
  }

  // User-submitted scans are private by default and never form a public feed.
  res.json([]);
});

router.get("/history/:id", async (req, res) => {
  await ensureAnalysesSchema();

  const record = await findPublicAnalysis(req.params.id);

  if (!record) {
    res.status(404).json({ error: "not_found", message: "Analysis not found" });
    return;
  }

  res.json(formatAnalysisRecord(record));
});

export default router;

function formatAnalysisRecord(record: typeof analysesTable.$inferSelect) {
  return {
    id: record.hallOfShame ? String(record.id) : record.publicId!,
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

async function findPublicAnalysis(id: string) {
  if (/^[0-9]+$/.test(id)) {
    const numericId = Number(id);
    if (!(Number.isSafeInteger(numericId) && numericId > 0 && numericId <= 2147483647)) {
      return undefined;
    }
    const [record] = await db
      .select()
      .from(analysesTable)
      .where(and(eq(analysesTable.id, numericId), eq(analysesTable.hallOfShame, true)))
      .limit(1);
    return record;
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return undefined;
  }

  const [record] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.publicId, id))
    .limit(1);
  return record;
}
