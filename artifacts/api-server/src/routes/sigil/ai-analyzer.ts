import { openai } from "@workspace/integrations-openai-ai-server";
import type { TransactionData, ContractData } from "./ethereum.js";
import { hexWeiToEth } from "./ethereum.js";
import type { KnownEntity } from "./known-entities.js";

export interface AIAnalysisResult {
  summary: string;
  verdict: "safe" | "caution" | "dangerous";
  verdictReason: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  warnings: string[];
  positives: string[];
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

  const prompt = `You are Sigil, a Web3 security analyst. Analyze this Ethereum transaction and explain it to a non-technical user in plain English.

${txContext}
${entityContext}${approvalContext}
IMPORTANT: If the transaction was not found, set summary to explain the hash wasn't found and suggest the user check they have the right network selected. Still return valid JSON.

Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this transaction does (e.g. 'This transaction approves Uniswap to spend up to 1000 USDC from your wallet')",
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "One short sentence (max 12 words) explaining the verdict. Start with the verdict word. E.g. 'Safe — standard transfer to a verified protocol' or 'Dangerous — grants unlimited spending to an unverified contract'",
  "riskScore": <0-100 integer, where 0=very safe, 100=extremely dangerous>,
  "warnings": ["Array of specific warning strings, empty if none"],
  "positives": ["Array of positive/safe attributes, empty if none"]
}

Verdict guidelines:
- "safe" (score 0-25): Standard transfers to known/verified contracts, normal token transfers
- "caution" (score 26-60): Approvals, swaps on known DEXes, unverified but seemingly benign contracts
- "dangerous" (score 61-100): Unlimited approvals to unknown contracts, drain attacks, unrestricted minting, suspicious patterns

Risk scoring guidelines:
- 0-25 (low): Standard transfers to known contracts, verified contracts
- 26-50 (medium): Approvals, swaps on known DEXes, interactions with unverified but seemingly benign contracts  
- 51-75 (high): Unlimited approvals, large value transfers, interactions with unverified contracts, suspicious method calls
- 76-100 (critical): Malicious patterns, drain attacks, unrestricted minting, honeypots, ownership transfers, proxy upgrades without timelock

Common warnings to check:
- Unlimited token approvals (max uint256)
- Unverified contract
- Transfer of large ETH value
- Suspicious minting functions
- setOwner or transferOwnership calls
- Self-destruct patterns
- Unusual gas usage`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
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
    return {
      summary: parsed.summary || "Unable to analyze this transaction.",
      verdict,
      verdictReason: parsed.verdictReason || `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} — based on risk analysis`,
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
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

  const prompt = `You are Sigil, a Web3 security analyst. Analyze this smart contract and explain it to a non-technical user in plain English.

${contractContext}
${entityContext}
Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this contract is/does",
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "One short sentence (max 12 words) explaining the verdict. Start with the verdict word. E.g. 'Safe — verified token contract from a known protocol' or 'Dangerous — unverified contract with unrestricted minting'",
  "riskScore": <0-100 integer>,
  "warnings": ["Array of specific warning strings"],
  "positives": ["Array of positive/safe attributes"]
}

Verdict guidelines:
- "safe": Verified contract, well-known protocol, standard token
- "caution": Unverified but standard patterns, or verified but with some risk
- "dangerous": Unverified with suspicious patterns, unrestricted minting, honeypot indicators

Risk scoring guidelines:
- 0-25 (low): Verified contract, well-known protocol, standard token
- 26-50 (medium): Unverified but standard patterns
- 51-75 (high): Unverified, unusual patterns, minting capabilities
- 76-100 (critical): Malicious patterns, unrestricted minting, honeypot indicators

Check for:
- Whether the contract is verified
- Standard vs non-standard token implementations  
- Ownership/admin controls
- Minting and burning capabilities
- Proxy patterns
- Known protocols (Uniswap, Aave, Compound, etc.)`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
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
    return {
      summary: parsed.summary || "Unable to analyze this contract.",
      verdict,
      verdictReason: parsed.verdictReason || `${verdict.charAt(0).toUpperCase() + verdict.slice(1)} — based on risk analysis`,
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
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
