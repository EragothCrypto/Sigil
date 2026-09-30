import { openai } from "@workspace/integrations-openai-ai-server";
import { getSigilAiModel } from "../../env.js";
import type { TransactionData, ContractData } from "./ethereum.js";
import type { KnownEntity } from "./known-entities.js";
import { transactionFindings, contractFindings, validateFindingSelection, renderFindings, type FindingInventory, type ValidatedReport } from "./validated-findings.js";

export interface BreakdownAsset { asset: string; amount: string; usdValue?: string }
export interface BreakdownPermission { asset: string; spender: string; amount: string }
export interface BreakdownRiskFactor { severity: "critical" | "high" | "medium" | "low" | "positive"; label: string; detail: string }
export interface TransactionBreakdown {
  actionType: "swap" | "approve" | "transfer" | "mint" | "burn" | "bridge" | "stake" | "deposit" | "withdraw" | "revoke" | "deploy" | "other";
  actionLabel: string; assetsOut: BreakdownAsset[]; assetsIn: BreakdownAsset[];
  permissions: BreakdownPermission[]; riskFactors: BreakdownRiskFactor[];
}
export interface AIPatternMatch {
  id: string; type: "drainer" | "honeypot" | "fake_approval" | "rug_pull" | "phishing" | "flash_loan" | "suspicious";
  name: string; confidence: "confirmed" | "high" | "medium" | "low";
  description: string; indicators: string[]; historicalContext?: string; riskDelta: number;
}
export interface AIAnalysisResult {
  summary: string; verdict: "safe" | "caution" | "dangerous"; verdictReason: string;
  riskScore: number; riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[]; positives: string[]; breakdown?: TransactionBreakdown; aiPatterns?: AIPatternMatch[];
  validatedReport?: ValidatedReport;
}
interface ApprovalAnalysisContext {
  isApproval?: boolean; isRevoke: boolean; isUnlimited: boolean; amountFormatted: string; spender: string;
  spenderEntity?: KnownEntity | null; approvalType: string; tokenContract?: string; tokenEntity?: KnownEntity | null;
  riskLevel?: "low" | "medium" | "high" | "critical"; priorApprovals?: unknown[];
}
export type StreamEvent =
  | { type: "step"; step: number; label: string }
  | { type: "metadata"; estimatedScore: number; signalCount: number; riskSignals: string[] }
  | { type: "token"; text: string }
  | { type: "result"; result: AIAnalysisResult }
  | { type: "cached"; result: AIAnalysisResult }
  | { type: "error"; message: string };
interface AnalysisTokenUsage { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number | null } | null }
function safeTokenCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}
function completionTokenBudget(step: "signals" | "verdict"): number {
  return getSigilAiModel() === "deepseek/deepseek-v4-flash" ? (step === "signals" ? 4096 : 12288) : (step === "signals" ? 700 : 2048);
}
export class AIAnalysisOutputError extends Error {
  readonly code: "analysis_unreliable" | "invalid_ai_output" | "truncated_ai_output";
  readonly phase?: "signals" | "verdict";
  readonly tokenLimit?: number;
  readonly completionTokens?: number;
  readonly reasoningTokens?: number;
  constructor(code: "analysis_unreliable" | "invalid_ai_output" | "truncated_ai_output", phase?: "signals" | "verdict", usage?: AnalysisTokenUsage | null) {
    super(code === "truncated_ai_output"
      ? `AI analysis output exceeded its token limit; no risk verdict was produced${phase ? ` (${phase})` : ""}`
      : "Analysis unreliable: AI selections could not be validated; no risk verdict or score was produced.");
    this.name = "AIAnalysisOutputError"; this.code = code; this.phase = phase;
    this.tokenLimit = phase ? completionTokenBudget(phase) : undefined;
    this.completionTokens = safeTokenCount(usage?.completion_tokens);
    this.reasoningTokens = safeTokenCount(usage?.completion_tokens_details?.reasoning_tokens);
  }
}

const SELECTION_INSTRUCTIONS = 'You are selecting from a server-owned evidence inventory. Return ONLY one JSON object with exactly one property: {"findingIds":["f:allowed_code"]}. Use only the supplied finding IDs, no duplicates, at most 32. Empty selection is valid. Do not write prose, scores, verdicts, explanations, new codes or new evidence. All material server findings remain mandatory independently of your selection.';

function checkSelection(content: string, finishReason: string | null | undefined, data: FindingInventory, phase: "signals" | "verdict", usage?: AnalysisTokenUsage | null): void {
  if (finishReason === "length") throw new AIAnalysisOutputError("truncated_ai_output", phase, usage);
  if (finishReason !== "stop") throw new AIAnalysisOutputError("analysis_unreliable", phase, usage);
  try { validateFindingSelection(content, data); }
  catch { throw new AIAnalysisOutputError("analysis_unreliable", phase, usage); }
}

async function runValidatedAnalysis(data: FindingInventory, onEvent?: (event: StreamEvent) => void): Promise<AIAnalysisResult> {
  const messages = [
    { role: "system" as const, content: SELECTION_INSTRUCTIONS },
    { role: "user" as const, content: JSON.stringify({ evidence: data.evidence, findings: data.findings }) },
  ];
  onEvent?.({ type: "step", step: 1, label: "Checking acquired evidence..." });
  const first = await openai.chat.completions.create({ model: getSigilAiModel(), max_completion_tokens: completionTokenBudget("signals"), messages });
  const firstContent = first.choices[0]?.message?.content ?? "";
  checkSelection(firstContent, first.choices[0]?.finish_reason, data, "signals", first.usage);
  const finalMessages = [...messages, { role: "assistant" as const, content: firstContent }, { role: "user" as const, content: "Confirm the allowed finding IDs using the same exact JSON-only contract. Do not add any properties." }];
  onEvent?.({ type: "step", step: 2, label: "Validating security findings..." });
  let content = "";
  let finishReason: string | null | undefined = null;
  let usage: AnalysisTokenUsage | null | undefined;
  let oversized = false;
  if (onEvent) {
    try {
      const stream = await openai.chat.completions.create({ model: getSigilAiModel(), max_completion_tokens: completionTokenBudget("verdict"), messages: finalMessages, stream: true, stream_options: { include_usage: true } });
      for await (const chunk of stream) {
        finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
        if (chunk.usage) usage = chunk.usage;
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (content.length + delta.length > 8192) oversized = true;
        if (!oversized) content += delta;
      }
    } catch {
      // Never retry a known terminal completion or an oversized response.
      if (finishReason === null && !oversized) {
        const fallback = await openai.chat.completions.create({ model: getSigilAiModel(), max_completion_tokens: completionTokenBudget("verdict"), messages: finalMessages });
        content = fallback.choices[0]?.message?.content ?? "";
        finishReason = fallback.choices[0]?.finish_reason;
        usage = fallback.usage;
      }
    }
  } else {
    const final = await openai.chat.completions.create({ model: getSigilAiModel(), max_completion_tokens: completionTokenBudget("verdict"), messages: finalMessages });
    content = final.choices[0]?.message?.content ?? "";
    finishReason = final.choices[0]?.finish_reason;
    usage = final.usage;
  }
  if (oversized) throw new AIAnalysisOutputError("analysis_unreliable", "verdict", usage);
  checkSelection(content, finishReason, data, "verdict", usage);
  const result = renderFindings(data);
  onEvent?.({ type: "result", result });
  return result;
}

export async function analyzeTransaction(tx: TransactionData | null, method: string | null, network: string, _input: string, _entity?: KnownEntity | null, approval?: ApprovalAnalysisContext | null): Promise<AIAnalysisResult> {
  if (!tx) throw new AIAnalysisOutputError("analysis_unreliable");
  return runValidatedAnalysis(transactionFindings(tx, network, method, approval ?? null));
}
export async function analyzeContract(contract: ContractData, network: string, _entity?: KnownEntity | null): Promise<AIAnalysisResult> {
  return runValidatedAnalysis(contractFindings(contract, network));
}
export async function analyzeUnknown(_input: string, _network: string): Promise<AIAnalysisResult> {
  throw new AIAnalysisOutputError("analysis_unreliable");
}
export async function analyzeTransactionStreaming(tx: TransactionData | null, method: string | null, network: string, _input: string, onEvent: (event: StreamEvent) => void, _entity?: KnownEntity | null, approval?: ApprovalAnalysisContext | null): Promise<AIAnalysisResult> {
  if (!tx) throw new AIAnalysisOutputError("analysis_unreliable");
  return runValidatedAnalysis(transactionFindings(tx, network, method, approval ?? null), onEvent);
}
export async function analyzeContractStreaming(contract: ContractData, network: string, onEvent: (event: StreamEvent) => void, _entity?: KnownEntity | null): Promise<AIAnalysisResult> {
  return runValidatedAnalysis(contractFindings(contract, network), onEvent);
}
