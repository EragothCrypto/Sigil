import { openai } from "@workspace/integrations-openai-ai-server";
import type { TransactionData, ContractData } from "./ethereum.js";

export interface AIAnalysisResult {
  summary: string;
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

export async function analyzeTransaction(
  tx: TransactionData | null,
  methodName: string | null,
  network: string,
  rawInput: string,
): Promise<AIAnalysisResult> {
  const txContext = tx
    ? `Transaction Hash: ${tx.hash}
From: ${tx.from}
To: ${tx.to}
Value: ${tx.value} (in wei, hex)
Gas Used: ${tx.gasUsed ?? "unknown"}
Method ID: ${tx.methodId ?? "none"}
Method Name: ${methodName ?? "unknown"}
Input Data (first 200 chars): ${tx.input?.substring(0, 200) ?? "none"}
Status: ${tx.status === "0x1" ? "Success" : tx.status === "0x0" ? "Failed" : "Unknown"}
Network: ${network}`
    : `Transaction hash provided but could not be fetched from blockchain.
Hash: ${rawInput}
Network: ${network}
Note: This may be a pending transaction, wrong network, or invalid hash.`;

  const prompt = `You are Sigil, a Web3 security analyst. Analyze this Ethereum transaction and explain it to a non-technical user in plain English.

${txContext}

Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this transaction does (e.g. 'This transaction approves Uniswap to spend up to 1000 USDC from your wallet')",
  "riskScore": <0-100 integer, where 0=very safe, 100=extremely dangerous>,
  "warnings": ["Array of specific warning strings, empty if none"],
  "positives": ["Array of positive/safe attributes, empty if none"]
}

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
    return {
      summary: parsed.summary || "Unable to analyze this transaction.",
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
    };
  } catch {
    return {
      summary: content.substring(0, 500),
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

  const prompt = `You are Sigil, a Web3 security analyst. Analyze this smart contract and explain it to a non-technical user in plain English.

${contractContext}

Respond with a JSON object (no markdown, just raw JSON):
{
  "summary": "One sentence plain English explanation of what this contract is/does",
  "riskScore": <0-100 integer>,
  "warnings": ["Array of specific warning strings"],
  "positives": ["Array of positive/safe attributes"]
}

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
    return {
      summary: parsed.summary || "Unable to analyze this contract.",
      riskScore: score,
      riskLevel: getRiskLevel(score),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
    };
  } catch {
    return {
      summary: content.substring(0, 500),
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
    riskScore: 0,
    riskLevel: "low",
    warnings: ["Invalid input format. Please provide a 0x transaction hash (66 chars) or contract address (42 chars)."],
    positives: [],
  };
}
