import { openai } from "@workspace/integrations-openai-ai-server";
import { getSigilAiModel } from "../../env.js";
import type { TransactionData, ContractData } from "./ethereum.js";
import { hexWeiToEth } from "./ethereum.js";
import type { KnownEntity } from "./known-entities.js";

// ─── Output types ─────────────────────────────────────────────────────────────

export interface BreakdownAsset {
  asset: string;
  amount: string;
  usdValue?: string;
}

export interface BreakdownPermission {
  asset: string;
  spender: string;
  amount: string;
}

export interface BreakdownRiskFactor {
  severity: "critical" | "high" | "medium" | "low" | "positive";
  label: string;
  detail: string;
}

export interface TransactionBreakdown {
  actionType: "swap" | "approve" | "transfer" | "mint" | "burn" | "bridge" | "stake" | "deposit" | "withdraw" | "revoke" | "deploy" | "other";
  actionLabel: string;
  assetsOut: BreakdownAsset[];
  assetsIn: BreakdownAsset[];
  permissions: BreakdownPermission[];
  riskFactors: BreakdownRiskFactor[];
}

export interface AIPatternMatch {
  id: string;
  type: "drainer" | "honeypot" | "fake_approval" | "rug_pull" | "phishing" | "flash_loan" | "suspicious";
  name: string;
  confidence: "confirmed" | "high" | "medium" | "low";
  description: string;
  indicators: string[];
  historicalContext?: string;
  riskDelta: number;
}

export interface AIAnalysisResult {
  summary: string;
  verdict: "safe" | "caution" | "dangerous";
  verdictReason: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
  positives: string[];
  breakdown?: TransactionBreakdown;
  aiPatterns?: AIPatternMatch[];
}

interface ApprovalAnalysisContext {
  isApproval?: boolean;
  isRevoke: boolean;
  isUnlimited: boolean;
  amountFormatted: string;
  spender: string;
  spenderEntity?: KnownEntity | null;
  approvalType: string;
  tokenContract?: string;
  tokenEntity?: KnownEntity | null;
  riskLevel?: "low" | "medium" | "high" | "critical";
  priorApprovals?: unknown[];
}

// ─── Streaming event types ─────────────────────────────────────────────────────

export type StreamEvent =
  | { type: "step"; step: number; label: string }
  | { type: "metadata"; estimatedScore: number; signalCount: number; riskSignals: string[] }
  | { type: "token"; text: string }
  | { type: "result"; result: AIAnalysisResult }
  | { type: "cached"; result: AIAnalysisResult }
  | { type: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

export class AIAnalysisOutputError extends Error {
  readonly code: "invalid_ai_output" | "truncated_ai_output";

  constructor(code: "invalid_ai_output" | "truncated_ai_output") {
    super(code === "truncated_ai_output"
      ? "AI analysis output exceeded its token limit; no risk verdict was produced"
      : "AI analysis output is invalid or incomplete; no risk verdict was produced");
    this.name = "AIAnalysisOutputError";
    this.code = code;
  }
}

function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function getVerdictFromScore(score: number): "safe" | "caution" | "dangerous" {
  if (score <= 25) return "safe";
  if (score <= 60) return "caution";
  return "dangerous";
}

/**
 * Parse and sanitise the final JSON verdict response from step 2.
 * Rejects incomplete output rather than inventing a risk score.
 * Accepts an optional externally-extracted summary to override.
 */
function parseVerdictJson(content: string, externalSummary?: string): AIAnalysisResult {
  try {
    // Strip any accidental markdown fences the model adds
    const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
      || !Number.isInteger(parsed.riskScore) || parsed.riskScore < 0 || parsed.riskScore > 100
      || parsed.verdict !== getVerdictFromScore(parsed.riskScore)
      || typeof parsed.verdictReason !== "string" || !parsed.verdictReason.trim()
      || !Array.isArray(parsed.warnings) || !parsed.warnings.every((value: unknown) => typeof value === "string")
      || !Array.isArray(parsed.positives) || !parsed.positives.every((value: unknown) => typeof value === "string")) {
      throw new Error("Invalid verdict fields");
    }
    const score = parsed.riskScore;
    const verdictRaw = parsed.verdict;
    const verdict: "safe" | "caution" | "dangerous" =
      verdictRaw === "safe" || verdictRaw === "caution" || verdictRaw === "dangerous"
        ? verdictRaw
        : getVerdictFromScore(score);

    const bd = parsed.breakdown;
    const breakdown: TransactionBreakdown | undefined = bd
      ? {
          actionType: bd.actionType ?? "other",
          actionLabel: bd.actionLabel ?? "Transaction",
          assetsOut: Array.isArray(bd.assetsOut) ? bd.assetsOut : [],
          assetsIn: Array.isArray(bd.assetsIn) ? bd.assetsIn : [],
          permissions: Array.isArray(bd.permissions) ? bd.permissions : [],
          riskFactors: Array.isArray(bd.riskFactors) ? bd.riskFactors : [],
        }
      : undefined;

    const aiPatterns: AIPatternMatch[] = Array.isArray(parsed.patternMatches)
      ? parsed.patternMatches.map((p: AIPatternMatch) => ({
          id: String(p.id ?? `ai-${Math.random().toString(36).slice(2)}`),
          type: p.type ?? "suspicious",
          name: String(p.name ?? "Unknown Pattern"),
          confidence: p.confidence ?? "medium",
          description: String(p.description ?? ""),
          indicators: Array.isArray(p.indicators) ? p.indicators : [],
          historicalContext: p.historicalContext ? String(p.historicalContext) : undefined,
          riskDelta: Math.max(0, Math.min(30, parseInt(String(p.riskDelta)) || 5)),
        }))
      : [];

    const summary = externalSummary?.trim() || parsed.summary || "Unable to analyze this transaction.";
    if (typeof summary !== "string") throw new Error("Invalid summary");

    return {
      summary,
      verdict,
      verdictReason:
        parsed.verdictReason ||
        `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} — based on risk analysis`,
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
      breakdown,
      aiPatterns,
    };
  } catch {
    throw new AIAnalysisOutputError("invalid_ai_output");
  }
}

// ─── Shared system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sigil, a senior Web3 security analyst with deep expertise in smart contract exploits, MEV, drainer kits, DeFi rug pulls, and regulatory compliance. You explain blockchain security to non-technical users in plain English. You are precise, never speculate, and always anchor conclusions to concrete observations.

MANDATORY OVERRIDE RULE — OFAC SANCTIONED / DANGEROUS ENTITIES:
If the analysis context contains a block starting with "⚠ CRITICAL ALERT", you MUST:
1. Set verdict = "dangerous"
2. Set riskScore ≥ 90
3. Set riskLevel = "critical"
4. Include the sanctions/danger details prominently in your summary and warnings
This override is non-negotiable and takes priority over ALL other signals, even if the contract is verified or has positive traits.`;

function chatModel(): string {
  return getSigilAiModel();
}

function completionTokenBudget(step: "signals" | "verdict"): number {
  // DeepSeek's completion limit covers reasoning and visible JSON together.
  if (chatModel() === "deepseek/deepseek-v4-flash") {
    return step === "signals" ? 4096 : 12288;
  }
  return step === "signals" ? 700 : 2048;
}

// ─── Step 1: Evidence gathering ───────────────────────────────────────────────

const STEP1_INSTRUCTIONS = `
Your task in this step is ONLY to enumerate the concrete security signals you can observe from the data above.
Do NOT produce a verdict or score yet. Do NOT speculate beyond what the data shows.

Respond ONLY with a JSON object (no markdown, no prose):
{
  "signals": [
    {
      "type": "risk" | "positive",
      "severity": "critical" | "high" | "medium" | "low",
      "observation": "Specific, verifiable technical observation from the data",
      "implication": "What this means for the user in plain English"
    }
  ],
  "estimatedBaseScore": <integer 0-100, rough estimate only, will be refined in the next step>
}

Rules:
- Include ONLY signals actually present in the data above — never invent or assume
- Be specific and technical in "observation" (e.g. "Contract source code is not verified on Etherscan" not "suspicious contract")
- "implication" should be plain English a non-technical user can understand
- Either signal type may be empty. Never invent positives to balance warnings.
- Unknown verification is missing evidence, not proof of unverified source. Destination verification does not verify a spender or proxy implementation.
- Zero native value, normal gas, and successful execution are not safety indicators. Tokens, NFTs and internal transfers can move without native value.
- Selectors come from a local registry, not a public database search. Do not claim searches, traces, simulation, source audits or compiler vulnerability checks that were not performed.
- Compiler age alone does not establish a vulnerability. Token metadata failure does not establish an inconsistent token contract.
- Receipt events are observations, not balances or proven losses. Do not invent decimals, prices, net losses or internal calls. Historical example labels are retrospective, not live exploit detection.
- Approval calldata expresses attempted intent. Pending or failed transactions do not prove permissions were granted/revoked; approve(address,uint256) may refer to an NFT token ID.
- Severity guide: critical = immediate fund loss risk, high = strong risk indicator, medium = notable concern, low = minor concern or uncertainty
- SANCTIONS / OFAC RULE: If the context contains a "⚠ CRITICAL ALERT" block indicating an OFAC-sanctioned or dangerous entity, you MUST include this as a "critical" risk signal. Set estimatedBaseScore to 95. No positive signals can outweigh a sanctions designation.`;

// ─── Step 2: Verdict derivation (streaming-compatible format) ─────────────────

function buildStep2StreamingPrompt(signals: string): string {
  return `You have now gathered the evidence. Here is what you observed:

${signals}

Use only supplied evidence. Preserve uncertainty and coverage limitations. Zero native value and ordinary gas are not positives. Empty positives are valid. Historical labels are retrospective context, not technical confirmation of an exploit. Do not invent transfers, token decimals, losses, source audits or public selector searches.

CRITICAL FORMATTING INSTRUCTIONS — follow this EXACTLY:

Step A: Write ONE plain-English sentence (2–3 clauses max) that explains what this contract/transaction does and why it matters for the user's security. Write it as natural prose — not JSON, not a list.

Step B: On its own line, write exactly this separator (nothing else on that line):
---JSON---

Step C: Output the JSON verdict object.

Example of correct output:
This contract requests unlimited USDC approval for a 3-day-old unverified address, meaning the recipient could drain your entire USDC balance any time without further permission from you.
---JSON---
{"verdict":"dangerous","verdictReason":"Dangerous — unlimited approval to unverified contract","riskScore":82,...}

Your riskScore MUST be consistent with the signals:
- Only positive signals → 0–25
- Minor / low risks only → 10–35
- Medium risks present → 30–55
- High risks present → 50–75
- Critical risks present → 65–100
- Multiple critical risks → 80–100

JSON object structure (do NOT include "summary" — it is the prose above):
{
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "One short sentence (max 12 words). Must start with the verdict word e.g. 'Dangerous — grants unlimited token access to an unverified contract'",
  "riskScore": <integer 0-100 consistent with signals>,
  "warnings": ["Specific warning derived directly from your risk signals"],
  "positives": ["Specific positive derived directly from your positive signals"],
  "patternMatches": [
    {
      "id": "unique-kebab-id",
      "type": "drainer" | "honeypot" | "fake_approval" | "rug_pull" | "phishing" | "flash_loan" | "suspicious",
      "name": "Short name e.g. 'Wallet Drainer'",
      "confidence": "confirmed" | "high" | "medium" | "low",
      "description": "One or two sentences explaining this pattern and why it is dangerous",
      "indicators": ["Technical signal from evidence", "Another signal"],
      "historicalContext": "One sentence citing real-world exploits (omit if not relevant)",
      "riskDelta": <integer 0-30>
    }
  ],
  "breakdown": {
    "actionType": "swap" | "approve" | "transfer" | "mint" | "burn" | "bridge" | "stake" | "deposit" | "withdraw" | "revoke" | "deploy" | "other",
    "actionLabel": "Short human label e.g. 'Token Swap'",
    "assetsOut": [{ "asset": "USDC", "amount": "100", "usdValue": "~$100" }],
    "assetsIn": [{ "asset": "ETH", "amount": "0.05", "usdValue": "~$125" }],
    "permissions": [{ "asset": "USDC", "spender": "Uniswap V3", "amount": "unlimited" }],
    "riskFactors": [
      { "severity": "high" | "medium" | "low" | "critical" | "positive", "label": "Short label", "detail": "One sentence" }
    ]
  }
}

Rules:
- patternMatches: ONLY include patterns with real evidence — never fabricate. [] if nothing suspicious.
- warnings: must be non-empty if riskScore > 25
- positives: must be non-empty if any positive signals exist
- verdict must be consistent with riskScore: safe ≤ 25, caution 26–60, dangerous ≥ 61`;
}

// ─── Non-streaming two-step analysis (used by the original /analyze endpoint) ─

async function runTwoStepAnalysis(
  contextBlock: string,
  step1Extra = "",
): Promise<AIAnalysisResult> {
  const step1UserContent = `${contextBlock}${step1Extra}\n${STEP1_INSTRUCTIONS}`;

  // Step 1 — gather evidence signals
  const step1Response = await openai.chat.completions.create({
    model: chatModel(),
    max_completion_tokens: completionTokenBudget("signals"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: step1UserContent },
    ],
  });

  const step1Content = step1Response.choices[0]?.message?.content ?? "{}";
  if (step1Response.choices[0]?.finish_reason === "length") {
    throw new AIAnalysisOutputError("truncated_ai_output");
  }

  // Step 2 — derive verdict (streaming prompt format, but called non-streaming)
  const step2Response = await openai.chat.completions.create({
    model: chatModel(),
    max_completion_tokens: completionTokenBudget("verdict"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: step1UserContent },
      { role: "assistant", content: step1Content },
      { role: "user", content: buildStep2StreamingPrompt(step1Content) },
    ],
  });

  const step2Content = step2Response.choices[0]?.message?.content ?? "{}";
  if (step2Response.choices[0]?.finish_reason === "length") {
    throw new AIAnalysisOutputError("truncated_ai_output");
  }

  // Parse the new format (prose + ---JSON--- + json)
  const sepIdx = step2Content.indexOf("---JSON---");
  if (sepIdx !== -1) {
    const prose = step2Content.slice(0, sepIdx).trim();
    const jsonPart = step2Content.slice(sepIdx + 10).trim();
    return parseVerdictJson(jsonPart, prose);
  }
  return parseVerdictJson(step2Content);
}

// ─── Streaming two-step analysis ─────────────────────────────────────────────

export async function runStreamingAnalysis(
  contextBlock: string,
  step1Extra: string,
  onEvent: (event: StreamEvent) => void,
): Promise<AIAnalysisResult> {
  onEvent({ type: "step", step: 1, label: "Gathering on-chain signals…" });

  const step1UserContent = `${contextBlock}${step1Extra}\n${STEP1_INSTRUCTIONS}`;

  // Step 1 — non-streaming (structured JSON only, fast)
  const step1Response = await openai.chat.completions.create({
    model: chatModel(),
    max_completion_tokens: completionTokenBudget("signals"),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: step1UserContent },
    ],
  });

  const step1Content = step1Response.choices[0]?.message?.content ?? "{}";
  if (step1Response.choices[0]?.finish_reason === "length") {
    throw new AIAnalysisOutputError("truncated_ai_output");
  }

  // Parse Step 1 to emit metadata (estimated score + signal preview)
  let estimatedScore = 50;
  let signalCount = 0;
  const riskSignals: string[] = [];
  try {
    const s1 = JSON.parse(step1Content) as {
      signals?: Array<{ type: string; severity: string; observation: string }>;
      estimatedBaseScore?: number;
    };
    estimatedScore = Math.max(0, Math.min(100, s1.estimatedBaseScore ?? 50));
    if (Array.isArray(s1.signals)) {
      signalCount = s1.signals.length;
      riskSignals.push(
        ...s1.signals
          .filter((s) => s.type === "risk")
          .slice(0, 3)
          .map((s) => s.observation),
      );
    }
  } catch {
    // ignore parse errors
  }
  onEvent({ type: "metadata", estimatedScore, signalCount, riskSignals });

  onEvent({ type: "step", step: 2, label: "Generating security verdict…" });

  const step2Messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: step1UserContent },
    { role: "assistant" as const, content: step1Content },
    { role: "user" as const, content: buildStep2StreamingPrompt(step1Content) },
  ];

  let summaryBuffer = "";
  let jsonBuffer = "";
  let inJson = false;
  let emittedSummaryLength = 0;
  let finishReason: string | null = null;
  const SEP = "---JSON---";

  try {
    // Step 2 — STREAMING
    const stream = await openai.chat.completions.create({
      model: chatModel(),
      max_completion_tokens: completionTokenBudget("verdict"),
      stream: true,
      messages: step2Messages,
    });

    for await (const chunk of stream) {
      finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (!text) continue;

      if (!inJson) {
        const combined = summaryBuffer + text;
        const sepIdx = combined.indexOf(SEP);
        if (sepIdx !== -1) {
          // Emit the tail of the summary text up to the separator
          const newSummaryTail = combined.slice(emittedSummaryLength, sepIdx);
          if (newSummaryTail) onEvent({ type: "token", text: newSummaryTail });
          summaryBuffer = combined.slice(0, sepIdx).trim();
          jsonBuffer = combined.slice(sepIdx + SEP.length);
          inJson = true;
        } else {
          // Retain enough text to recognise a separator split across chunks.
          const safeEnd = Math.max(emittedSummaryLength, combined.length - (SEP.length - 1));
          if (!combined.trimStart().startsWith("{")) {
            const safeText = combined.slice(emittedSummaryLength, safeEnd);
            if (safeText) onEvent({ type: "token", text: safeText });
            emittedSummaryLength = safeEnd;
          }
          summaryBuffer += text;
        }
      } else {
        // Accumulate JSON silently
        jsonBuffer += text;
      }
    }
  } catch {
    const fallbackResponse = await openai.chat.completions.create({
      model: chatModel(),
      max_completion_tokens: completionTokenBudget("verdict"),
      messages: step2Messages,
    });

    const fallbackContent = fallbackResponse.choices[0]?.message?.content ?? "{}";
    finishReason = fallbackResponse.choices[0]?.finish_reason ?? null;
    const sepIdx = fallbackContent.indexOf(SEP);
    if (sepIdx !== -1) {
      const fallbackSummary = fallbackContent.slice(0, sepIdx).trim();
      if (!summaryBuffer.trim() && fallbackSummary) onEvent({ type: "token", text: fallbackSummary });
      summaryBuffer = summaryBuffer.trim() || fallbackSummary;
      jsonBuffer = fallbackContent.slice(sepIdx + SEP.length);
    } else {
      jsonBuffer = fallbackContent;
    }
  }

  if (finishReason === "length") {
    throw new AIAnalysisOutputError("truncated_ai_output");
  }
  // Some endpoints return a JSON object directly rather than the prose separator.
  if (!inJson && !jsonBuffer.trim()) {
    jsonBuffer = summaryBuffer;
    summaryBuffer = "";
  }
  // Parse final JSON (strip any trailing markdown fences)
  const cleanJson = jsonBuffer.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const result = parseVerdictJson(cleanJson, summaryBuffer);
  onEvent({ type: "result", result });
  return result;
}

// ─── Public API: per-input-type analysers ────────────────────────────────────

function buildTransactionContext(
  tx: TransactionData | null,
  methodName: string | null,
  network: string,
  rawInput: string,
  knownEntity?: KnownEntity | null,
  approvalInfo?: {
    isRevoke: boolean;
    isUnlimited: boolean;
    amountFormatted: string;
    spender: string;
    spenderEntity?: KnownEntity | null;
    approvalType: string;
  } | null,
): { contextBlock: string; step1Extra: string } {
  const txContext = tx
    ? `Transaction Hash: ${tx.hash}
From: ${tx.from}
To: ${tx.to ?? "contract creation"}
Top-level native value: ${hexWeiToEth(tx.value)} (raw hex: ${tx.value}); not a safety indicator
Gas Used: ${tx.gasUsed ?? "unknown"}
Gas Price: ${tx.gasPrice}
Method ID: ${tx.methodId ?? "0x (no selector)"}
Method Name (local selector registry only, no public lookup): ${methodName ?? (tx.methodId ? "unknown method" : "no calldata")}
Calldata (first 300 chars): ${tx.input && tx.input !== "0x" ? tx.input.substring(0, 300) : "none"}
Block: ${tx.blockNumber}
Status: ${tx.status === "0x1" ? "Success ✓" : tx.status === "0x0" ? "Failed ✗" : "Pending/Unknown"}
Network: ${network}
Destination source verification: ${tx.destinationVerification ?? "unknown"} (destination only; not spender/proxy verification)
Destination bytecode at transaction block: ${tx.destinationHasCode === true ? "present" : tx.destinationHasCode === false ? "absent; source verification not applicable" : "unknown"}
Receipt event evidence: ${JSON.stringify(tx.receiptEvidence ?? { status: "unavailable", complete: false, transfers: [] })}
Coverage: complete refers only to bounded Transfer-shaped event decoding, not complete asset movement. Events can be emitted by arbitrary contracts; raw amounts have no inferred decimals. NFT token IDs are not amounts. Other event types are not decoded. No balance deltas or net losses are established.
Internal call traces: not collected. Internal native transfers and full call paths are unknown.
Curated historical context: ${tx.historicalExample ? JSON.stringify(tx.historicalExample) : "none"}`
    : `Transaction not found on network "${network}".
Hash: ${rawInput}
This usually means the wrong network was selected, the transaction is very recent/pending, or the hash is incorrect.`;

  const entityContext = knownEntity
    ? knownEntity.trustLevel === "dangerous"
      ? `\n⚠ CRITICAL ALERT — OFAC SANCTIONED / DANGEROUS ENTITY ⚠\nThis address is identified as: "${knownEntity.name}" (Category: ${knownEntity.category})\n${knownEntity.description}\nVERDICT OVERRIDE: You MUST return verdict="dangerous", riskScore≥90. This is non-negotiable.\n`
      : `\n── KNOWN PROTOCOL ──\nThe target address is "${knownEntity.name}" (${knownEntity.category}): ${knownEntity.description}. Trust level: ${knownEntity.trustLevel}.\n`
    : "";

  const approvalContext = approvalInfo
    ? `\n── APPROVAL DETECTED ──\nApproval type: ${approvalInfo.approvalType}
Spender: ${approvalInfo.spender}${approvalInfo.spenderEntity ? ` = ${approvalInfo.spenderEntity.name} (${approvalInfo.spenderEntity.trustLevel})` : " (not in local entity registry; source verification unknown)"}
Amount: ${approvalInfo.amountFormatted}${approvalInfo.isUnlimited ? " — large raw calldata value; ERC20/NFT semantics and executed allowance are unknown" : ""}
Approval semantics: attempted calldata intent only, not confirmed allowance state. ERC20/NFT semantics and decimals are not established by the selector. Failed/pending calls do not grant or revoke permission.
${approvalInfo.isRevoke ? "Note: approve with zero may attempt a revoke; no post-transaction allowance state was checked." : ""}\n`
    : "";

  const notFoundHint = !tx
    ? "\nIMPORTANT: The transaction was not found. Set summary to explain this and ask the user to verify the network. Still return valid JSON with actionType 'other' and empty asset arrays.\n"
    : "";

  const contextBlock = `── TRANSACTION DATA ──\n${txContext}\n${entityContext}${approvalContext}${notFoundHint}`;
  return { contextBlock, step1Extra: "" };
}

function buildContractContext(
  contract: ContractData,
  network: string,
  knownEntity?: KnownEntity | null,
): { contextBlock: string; step1Extra: string } {
  const contractContext = `Contract Address: ${contract.address}
Contract Name: ${contract.contractName ?? "Unknown"}
Verified on Etherscan: ${contract.isVerified ? "Yes — source verification metadata available (not a security audit)" : contract.verificationStatus === "unverified" ? "Explicitly unverified according to explorer" : "Unknown — lookup unavailable or invalid; do not claim unverified source"}
Token Name: ${contract.tokenName ?? "N/A"}
Token Symbol: ${contract.tokenSymbol ?? "N/A"}
Total Supply: ${contract.totalSupply ?? "N/A"}
Is Token Contract: ${contract.isToken ? "Yes" : "Unknown / No"}
Compiler Version: ${contract.compilerVersion ?? "Unknown"}
ABI Available: ${contract.abi && contract.abi !== "Contract source code not verified" ? "Yes" : "No"}
Network: ${network}`;

  const entityContext = knownEntity
    ? knownEntity.trustLevel === "dangerous"
      ? `\n⚠ CRITICAL ALERT — OFAC SANCTIONED / DANGEROUS ENTITY ⚠\nThis address is identified as: "${knownEntity.name}" (Category: ${knownEntity.category})\n${knownEntity.description}\nVERDICT OVERRIDE: You MUST return verdict="dangerous", riskScore≥90. This is non-negotiable.\n`
      : `\n── KNOWN PROTOCOL ──\nThis address is "${knownEntity.name}" (${knownEntity.category}): ${knownEntity.description}. Trust level: ${knownEntity.trustLevel}.\n`
    : "";

  const step1Extra = `\n── FOCUS AREAS FOR CONTRACT ANALYSIS ──
Only metadata is supplied here, not source-code bodies, execution traces or a security audit. Do not claim hidden blacklist logic, sell restrictions, unrestricted minting, confirmed compiler bugs or audited standard patterns from metadata alone. A failed token lookup means unknown token status, not inconsistent ERC20 metadata. Verification alone does not establish safety.`;

  const contextBlock = `── CONTRACT DATA ──\n${contractContext}\n${entityContext}`;
  return { contextBlock, step1Extra };
}

// ─── Non-streaming public wrappers (used by original /analyze endpoint) ───────

export async function analyzeTransaction(
  tx: TransactionData | null,
  methodName: string | null,
  network: string,
  rawInput: string,
  knownEntity?: KnownEntity | null,
  approvalInfo?: ApprovalAnalysisContext | null,
): Promise<AIAnalysisResult> {
  const { contextBlock, step1Extra } = buildTransactionContext(tx, methodName, network, rawInput, knownEntity, approvalInfo);
  return runTwoStepAnalysis(contextBlock, step1Extra);
}

export async function analyzeContract(
  contract: ContractData,
  network: string,
  knownEntity?: KnownEntity | null,
): Promise<AIAnalysisResult> {
  const { contextBlock, step1Extra } = buildContractContext(contract, network, knownEntity);
  return runTwoStepAnalysis(contextBlock, step1Extra);
}

export async function analyzeUnknown(input: string, _network: string): Promise<AIAnalysisResult> {
  return {
    summary: `The input "${input.substring(0, 20)}..." does not appear to be a valid Ethereum transaction hash or contract address.`,
    verdict: "caution",
    verdictReason: "Caution — input format is not a valid transaction hash or address",
    riskScore: 0,
    riskLevel: "low",
    warnings: [
      "Invalid input format. Please provide a 0x transaction hash (66 chars) or a contract address (42 chars).",
    ],
    positives: [],
  };
}

// ─── Streaming public wrappers ────────────────────────────────────────────────

export async function analyzeTransactionStreaming(
  tx: TransactionData | null,
  methodName: string | null,
  network: string,
  rawInput: string,
  onEvent: (event: StreamEvent) => void,
  knownEntity?: KnownEntity | null,
  approvalInfo?: ApprovalAnalysisContext | null,
): Promise<AIAnalysisResult> {
  const { contextBlock, step1Extra } = buildTransactionContext(tx, methodName, network, rawInput, knownEntity, approvalInfo);
  return runStreamingAnalysis(contextBlock, step1Extra, onEvent);
}

export async function analyzeContractStreaming(
  contract: ContractData,
  network: string,
  onEvent: (event: StreamEvent) => void,
  knownEntity?: KnownEntity | null,
): Promise<AIAnalysisResult> {
  const { contextBlock, step1Extra } = buildContractContext(contract, network, knownEntity);
  return runStreamingAnalysis(contextBlock, step1Extra, onEvent);
}
