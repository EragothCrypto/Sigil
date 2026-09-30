import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SimulateTransactionBody } from "@workspace/api-zod";
import { getSigilAiModel } from "../../env.js";

const router: IRouter = Router();

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

router.post("/simulate", async (req, res) => {
  const parseResult = SimulateTransactionBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request body" });
    return;
  }

  const { rawData, network = "mainnet", fromAddress } = parseResult.data;

  const prompt = `You are Sigil, a Web3 security expert. A user is about to sign a transaction and wants to know exactly what will happen to their wallet.

Analyze this raw transaction data and simulate the outcome:

Network: ${network}
${fromAddress ? `From Wallet: ${fromAddress}` : "From Wallet: (unknown)"}
Raw Transaction Data:
\`\`\`
${rawData.substring(0, 3000)}
\`\`\`

This could be:
- Raw hex calldata (e.g. 0x095ea7b3...)
- A JSON transaction object (e.g. {to: "0x...", data: "0x...", value: "0x..."})
- A MetaMask/WalletConnect prompt description
- ABI-encoded function call
- Plain text description of what a wallet is asking

Decode and simulate it. Respond with ONLY a raw JSON object (no markdown, no code blocks):
{
  "inputType": "Brief description of what format/type this is, e.g. 'ERC-20 approve() calldata', 'ETH transfer', 'Uniswap swap', 'Wallet prompt text'",
  "summary": "One sentence: what does this transaction do in plain English?",
  "verdict": "safe" | "caution" | "dangerous",
  "verdictReason": "Max 15 words starting with the verdict. E.g. 'Dangerous — grants unlimited USDC access to an unverified contract'",
  "riskScore": <0-100>,
  "assetChanges": [
    {
      "direction": "lose" | "receive" | "approve",
      "asset": "Token name e.g. USDC, ETH, WBTC, or 'Unknown Token'",
      "amount": "Human-readable amount e.g. '250', 'unlimited', '0.5', '~$400 worth'",
      "usdValue": "Estimated USD value or null if unknown"
    }
  ],
  "permissionsGranted": [
    "List permissions being granted, e.g. 'Unlimited USDC spending by 0x1234...abcd'",
    "Or empty array if none"
  ],
  "warnings": [
    "Specific warnings e.g. 'Unlimited approval — this contract can drain all your USDC at any time'",
    "Or empty array if none"
  ]
}

Rules for assetChanges:
- "lose": user sends/spends this asset
- "receive": user gets this asset
- "approve": user grants permission (no immediate transfer, but future risk)
- If this is an approval for unlimited amount, set amount to "unlimited"
- If you cannot determine the exact amount, say "unknown amount"
- Include ALL asset changes, even zero-value ones if relevant
- If no assets change hands (e.g. pure approval), still list the approval as direction "approve"

Verdict guidelines:
- "safe": verified contracts, standard small transfers, known protocols
- "caution": approvals to known DEXes, moderate amounts, unverified but benign
- "dangerous": unlimited approvals to unknown contracts, suspicious patterns, large ETH transfers to unverified contracts, honeypot patterns`;

  try {
    const response = await openai.chat.completions.create({
      model: getSigilAiModel(),
      max_completion_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;

    try {
      // Strip any accidental markdown code fences
      const cleaned = content.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      req.log.warn("Failed to parse AI simulation response as JSON");
      res.status(500).json({ error: "parse_failed", message: "Failed to parse simulation result" });
      return;
    }

    const score = Math.max(0, Math.min(100, parseInt(String(parsed.riskScore)) || 30));
    const verdictRaw = parsed.verdict as string;
    const verdict: "safe" | "caution" | "dangerous" =
      verdictRaw === "safe" || verdictRaw === "caution" || verdictRaw === "dangerous"
        ? verdictRaw
        : getVerdictFromScore(score);

    const assetChanges = Array.isArray(parsed.assetChanges)
      ? parsed.assetChanges.map((c: Record<string, unknown>) => ({
          direction: ["lose", "receive", "approve"].includes(String(c.direction))
            ? c.direction
            : "lose",
          asset: String(c.asset ?? "Unknown"),
          amount: String(c.amount ?? "unknown"),
          usdValue: c.usdValue ? String(c.usdValue) : undefined,
        }))
      : [];

    res.json({
      inputType: String(parsed.inputType ?? "Unknown input format"),
      summary: String(parsed.summary ?? "Unable to simulate this transaction."),
      verdict,
      verdictReason: String(parsed.verdictReason ?? `${verdict} — based on simulation`),
      riskScore: score,
      riskLevel: getRiskLevel(score),
      assetChanges,
      permissionsGranted: Array.isArray(parsed.permissionsGranted)
        ? parsed.permissionsGranted.map(String)
        : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
    });
  } catch (err) {
    req.log.error({ err }, "Simulation failed");
    res.status(500).json({ error: "simulation_failed", message: "Failed to simulate transaction" });
  }
});

export default router;
