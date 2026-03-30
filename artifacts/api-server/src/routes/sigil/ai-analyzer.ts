import { openai } from "@workspace/integrations-openai-ai-server";
import type { TransactionData, ContractData } from "./ethereum.js";
import { hexWeiToEth } from "./ethereum.js";
import type { KnownEntity } from "./known-entities.js";

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

export async function analyzeTransaction(
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
): Promise<AIAnalysisResult> {
  const txContext = tx
    ? `Transaction Hash: ${tx.hash}
From: ${tx.from}
To: ${tx.to ?? "contract creation"}
Value transferred: ${hexWeiToEth(tx.value)} (raw hex: ${tx.value})
Gas Used: ${tx.gasUsed ?? "unknown"}
Gas Price: ${tx.gasPrice}
Method ID: ${tx.methodId ?? "0x (plain ETH transfer)"}
Method Name: ${methodName ?? (tx.methodId ? "unknown method" : "plain ETH transfer — no calldata")}
Calldata (first 300 chars): ${tx.input && tx.input !== "0x" ? tx.input.substring(0, 300) : "none (plain ETH transfer)"}
Block: ${tx.blockNumber}
Status: ${tx.status === "0x1" ? "Success ✓" : tx.status === "0x0" ? "Failed ✗" : "Pending/Unknown"}
Network: ${network}`
    : `Transaction not found on network "${network}".
Hash: ${rawInput}
This usually means: wrong network selected, transaction is very recent/pending, or the hash is incorrect.`;

  const entityContext = knownEntity
    ? `\nKNOWN PROTOCOL IDENTIFIED: The target address belongs to "${knownEntity.name}" (${knownEntity.category}) — ${knownEntity.description}. Trust level: ${knownEntity.trustLevel}. This is a well-known protocol so it should influence the verdict positively.\n`
    : "";

  const approvalContext = approvalInfo
    ? `\nAPPROVAL DETECTED: This is a token ${approvalInfo.approvalType} transaction.
- Spender (who gets access): ${approvalInfo.spender}${approvalInfo.spenderEntity ? ` = ${approvalInfo.spenderEntity.name} (${approvalInfo.spenderEntity.trustLevel})` : " (unknown contract)"}
- Amount approved: ${approvalInfo.amountFormatted}${approvalInfo.isUnlimited ? " ⚠️ UNLIMITED — this spender can drain ALL tokens of this type from the wallet" : ""}
${approvalInfo.isRevoke ? "- This is a REVOKE — it removes a previously granted permission (positive action)" : ""}
Make sure the summary clearly explains who is getting approval and for how much.\n`
    : "";

  const prompt = `You are Sigil, a Web3 security analyst specializing in detecting scams and exploit patterns. Analyze this Ethereum transaction and explain it to a non-technical user in plain English.

${txContext}
${entityContext}${approvalContext}
IMPORTANT: If the transaction was not found, set summary to explain the hash wasn't found and suggest the user check they have the right network selected. Still return valid JSON.

Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this transaction does",
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "One short sentence (max 12 words) explaining the verdict. Start with the verdict word.",
  "riskScore": <0-100 integer, where 0=very safe, 100=extremely dangerous>,
  "warnings": ["Array of specific warning strings, empty if none"],
  "positives": ["Array of positive/safe attributes, empty if none"],
  "patternMatches": [
    {
      "id": "unique-kebab-id",
      "type": "drainer" | "honeypot" | "fake_approval" | "rug_pull" | "phishing" | "flash_loan" | "suspicious",
      "name": "Short name e.g. 'Wallet Drainer', 'Permit Phishing', 'Honeypot Token'",
      "confidence": "confirmed" | "high" | "medium" | "low",
      "description": "One or two sentences explaining this pattern and why it is dangerous.",
      "indicators": ["Specific technical or behavioral signal observed", "Another signal"],
      "historicalContext": "Optional: one sentence citing real-world exploit history or stats if applicable",
      "riskDelta": <integer 0-30, how much this pattern increases risk>
    }
  ],
  "breakdown": {
    "actionType": "swap" | "approve" | "transfer" | "mint" | "burn" | "bridge" | "stake" | "deposit" | "withdraw" | "revoke" | "deploy" | "other",
    "actionLabel": "Short human label e.g. 'Token Swap', 'Unlimited Approval', 'ETH Transfer', 'NFT Mint'",
    "assetsOut": [{ "asset": "USDC", "amount": "100", "usdValue": "~$100" }],
    "assetsIn": [{ "asset": "ETH", "amount": "0.05", "usdValue": "~$125" }],
    "permissions": [{ "asset": "USDC", "spender": "Uniswap V3", "amount": "unlimited" }],
    "riskFactors": [
      { "severity": "high" | "medium" | "low" | "critical" | "positive", "label": "Short label", "detail": "One sentence detail" }
    ]
  }
}

Rules for patternMatches:
- Only include patterns you actually detect from the calldata/context — do NOT fabricate matches
- Leave patternMatches as an empty array [] if nothing suspicious is found
- Patterns to look for: wallet drainers (setApprovalForAll, sweepToken, transferFrom after approval), permit phishing, honeypot tokens (hidden blacklist/sell restrictions), rug pulls (unrestricted mint, transferOwnership), flash loan attacks, multicall drain bundles, fake NFT minting scams
- historicalContext should cite real incidents (Inferno Drainer, Monkey Drainer, Pink Drainer, various rugs) when relevant
- Each indicator should be a concrete technical observation, not a vague statement

Rules for breakdown:
- assetsOut: tokens/ETH leaving the wallet (empty array if none)
- assetsIn: tokens/ETH entering the wallet (empty array if none)
- permissions: only include if access is being granted (approvals)
- riskFactors: include BOTH risks AND positives (severity "positive"). Always include at least one entry.
- For pure ETH transfers: assetsOut = [{ asset: "ETH", amount: "X ETH" }], assetsIn = []
- If tx not found: actionType = "other", actionLabel = "Unknown Transaction", empty arrays

Verdict guidelines:
- "safe" (score 0-25): Standard transfers to known/verified contracts
- "caution" (score 26-60): Approvals, swaps on known DEXes, unverified but benign contracts
- "dangerous" (score 61-100): Unlimited approvals to unknown contracts, drain attacks, minting

Risk scoring:
- 0-25: Verified contracts, known protocols
- 26-50: Approvals/swaps on known DEXes, unverified but seemingly benign
- 51-75: Unlimited approvals, large value transfers, unverified contracts
- 76-100: Malicious patterns, drain attacks, unrestricted minting, ownership transfers`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  
  try {
    const parsed = JSON.parse(content.trim());
    const score = Math.max(0, Math.min(100, parseInt(parsed.riskScore) || 0));
    const verdictRaw = parsed.verdict;
    const verdict: "safe" | "caution" | "dangerous" =
      verdictRaw === "safe" || verdictRaw === "caution" || verdictRaw === "dangerous"
        ? verdictRaw
        : getVerdictFromScore(score);
    const bd = parsed.breakdown;
    const breakdown: TransactionBreakdown | undefined = bd ? {
      actionType: bd.actionType ?? "other",
      actionLabel: bd.actionLabel ?? "Transaction",
      assetsOut: Array.isArray(bd.assetsOut) ? bd.assetsOut : [],
      assetsIn: Array.isArray(bd.assetsIn) ? bd.assetsIn : [],
      permissions: Array.isArray(bd.permissions) ? bd.permissions : [],
      riskFactors: Array.isArray(bd.riskFactors) ? bd.riskFactors : [],
    } : undefined;

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

    return {
      summary: parsed.summary || "Unable to analyze this transaction.",
      verdict,
      verdictReason: parsed.verdictReason || `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} — based on risk analysis`,
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
      breakdown,
      aiPatterns,
    };
  } catch {
    return {
      summary: content.substring(0, 500),
      verdict: "caution",
      verdictReason: "Caution — could not fully parse analysis results",
      riskScore: 50,
      riskLevel: "medium",
      warnings: ["Could not fully parse AI response"],
      positives: [],
    };
  }
}

export async function analyzeContract(
  contract: ContractData,
  network: string,
  knownEntity?: KnownEntity | null,
): Promise<AIAnalysisResult> {
  const contractContext = `Contract Address: ${contract.address}
Contract Name: ${contract.contractName ?? "Unknown (unverified)"}
Is Verified: ${contract.isVerified ? "Yes" : "No — source code not available"}
Token Name: ${contract.tokenName ?? "N/A"}
Token Symbol: ${contract.tokenSymbol ?? "N/A"}
Total Supply: ${contract.totalSupply ?? "N/A"}
Is Token: ${contract.isToken ? "Yes" : "Unknown"}
Compiler Version: ${contract.compilerVersion ?? "Unknown"}
ABI Available: ${contract.abi && contract.abi !== "Contract source code not verified" ? "Yes" : "No"}
Network: ${network}`;

  const entityContext = knownEntity
    ? `\nKNOWN PROTOCOL IDENTIFIED: This address is "${knownEntity.name}" (${knownEntity.category}) — ${knownEntity.description}. Trust level: ${knownEntity.trustLevel}. Factor this into your verdict.\n`
    : "";

  const prompt = `You are Sigil, a Web3 security analyst specializing in detecting scams and exploit patterns. Analyze this smart contract and explain it to a non-technical user in plain English.

${contractContext}
${entityContext}
Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this contract is/does",
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "One short sentence (max 12 words) explaining the verdict. Start with the verdict word.",
  "riskScore": <0-100 integer>,
  "warnings": ["Array of specific warning strings"],
  "positives": ["Array of positive/safe attributes"],
  "patternMatches": [
    {
      "id": "unique-kebab-id",
      "type": "drainer" | "honeypot" | "fake_approval" | "rug_pull" | "phishing" | "flash_loan" | "suspicious",
      "name": "Short pattern name",
      "confidence": "confirmed" | "high" | "medium" | "low",
      "description": "One or two sentences explaining this pattern and why it is dangerous.",
      "indicators": ["Specific technical signal", "Another signal"],
      "historicalContext": "Optional: cite real exploit history or stats",
      "riskDelta": <integer 0-30>
    }
  ],
  "breakdown": {
    "actionType": "deploy" | "other",
    "actionLabel": "Short label e.g. 'ERC-20 Token Contract', 'DEX Router', 'NFT Contract', 'Lending Pool'",
    "assetsOut": [],
    "assetsIn": [],
    "permissions": [],
    "riskFactors": [
      { "severity": "critical" | "high" | "medium" | "low" | "positive", "label": "Short label", "detail": "One sentence detail" }
    ]
  }
}

Rules for patternMatches:
- Only include patterns you actually detect — do NOT fabricate matches
- Empty array [] if nothing suspicious found
- For contracts look for: honeypot indicators (hidden blacklist, sell restrictions, _maxTxAmount, enableTrading flags), rug pull risks (unrestricted mint, transferable ownership, selfdestruct), phishing names (fake airdrop/reward/official contracts), proxy upgrade risks
- historicalContext can cite real incidents when relevant
- Leave patternMatches as [] for well-known verified contracts

For contract analysis: assetsOut/assetsIn/permissions are almost always empty arrays.
riskFactors should include BOTH risks AND positives (severity "positive"). Always include at least one entry.

Verdict guidelines:
- "safe": Verified contract, well-known protocol, standard token
- "caution": Unverified but standard patterns
- "dangerous": Unverified with suspicious patterns, unrestricted minting, honeypot indicators

Risk scoring:
- 0-25: Verified contract, well-known protocol, standard token
- 26-50: Unverified but standard patterns
- 51-75: Unverified, unusual patterns, minting capabilities
- 76-100: Malicious patterns, unrestricted minting, honeypot indicators`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  
  try {
    const parsed = JSON.parse(content.trim());
    const score = Math.max(0, Math.min(100, parseInt(parsed.riskScore) || 0));
    const verdictRaw = parsed.verdict;
    const verdict: "safe" | "caution" | "dangerous" =
      verdictRaw === "safe" || verdictRaw === "caution" || verdictRaw === "dangerous"
        ? verdictRaw
        : getVerdictFromScore(score);
    const bd2 = parsed.breakdown;
    const breakdown: TransactionBreakdown | undefined = bd2 ? {
      actionType: bd2.actionType ?? "other",
      actionLabel: bd2.actionLabel ?? "Contract",
      assetsOut: Array.isArray(bd2.assetsOut) ? bd2.assetsOut : [],
      assetsIn: Array.isArray(bd2.assetsIn) ? bd2.assetsIn : [],
      permissions: Array.isArray(bd2.permissions) ? bd2.permissions : [],
      riskFactors: Array.isArray(bd2.riskFactors) ? bd2.riskFactors : [],
    } : undefined;

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

    return {
      summary: parsed.summary || "Unable to analyze this contract.",
      verdict,
      verdictReason: parsed.verdictReason || `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} — based on risk analysis`,
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
      breakdown,
      aiPatterns,
    };
  } catch {
    return {
      summary: content.substring(0, 500),
      verdict: "caution",
      verdictReason: "Caution — could not fully parse analysis results",
      riskScore: 50,
      riskLevel: "medium",
      warnings: ["Could not fully parse AI response"],
      positives: [],
    };
  }
}

export async function analyzeUnknown(input: string, network: string): Promise<AIAnalysisResult> {
  return {
    summary: `The input "${input.substring(0, 20)}..." does not appear to be a valid Ethereum transaction hash or contract address.`,
    verdict: "caution",
    verdictReason: "Caution — input format is not a valid transaction hash or address",
    riskScore: 0,
    riskLevel: "low",
    warnings: ["Invalid input format. Please provide a 0x transaction hash (66 chars) or contract address (42 chars)."],
    positives: [],
  };
}
