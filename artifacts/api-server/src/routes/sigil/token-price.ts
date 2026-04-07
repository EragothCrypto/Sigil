/**
 * Sigil — Token Price Service
 * Fetches real-time USD prices from CoinGecko's free public API.
 * No API key required. Rate limited to ~30 req/min on the free tier.
 */
import { logger } from "../../lib/logger.js";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const FETCH_TIMEOUT_MS = 5_000;

// Map Sigil network names to CoinGecko asset platform IDs
const NETWORK_TO_PLATFORM: Record<string, string> = {
  mainnet:  "ethereum",
  ethereum: "ethereum",
  polygon:  "polygon-pos",
  bsc:      "binance-smart-chain",
  arbitrum: "arbitrum-one",
  optimism: "optimistic-ethereum",
  base:     "base",
  avalanche:"avalanche",
};

export interface TokenPriceResult {
  priceUsd: number;
  symbol?: string;
}

/**
 * Fetch the USD price of a token by its contract address and network.
 * Returns null if the token is not found or the request fails.
 */
export async function fetchTokenPrice(
  contractAddress: string,
  network: string,
): Promise<TokenPriceResult | null> {
  const platform = NETWORK_TO_PLATFORM[network.toLowerCase()];
  if (!platform) return null;

  const addr = contractAddress.toLowerCase();
  const url = `${COINGECKO_BASE}/simple/token_price/${platform}?contract_addresses=${addr}&vs_currencies=usd`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const entry = data[addr];
    if (!entry?.usd) return null;

    return { priceUsd: entry.usd };
  } catch (err) {
    logger.warn({ err, contractAddress, network }, "Token price fetch failed");
    return null;
  }
}

/**
 * Given a formatted amount string like "1500.00" or "Unlimited",
 * and a token price, compute the USD value string.
 * Returns null if the amount cannot be parsed.
 */
export function computeApprovalUsdValue(
  amountFormatted: string,
  isUnlimited: boolean,
  priceUsd: number,
): { approvalAmountUsd: string; displayLabel: string } | null {
  if (isUnlimited) {
    // Can't compute a total for unlimited — but show price context
    return {
      approvalAmountUsd: "unlimited",
      displayLabel: `$${priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })} / token`,
    };
  }

  // Try to parse the numeric part (handles "1500.00", "1500.00 USDC", "1,500.00", etc.)
  const cleaned = amountFormatted.replace(/,/g, "").split(" ")[0];
  const amount = parseFloat(cleaned);
  if (isNaN(amount) || amount <= 0) return null;

  const totalUsd = amount * priceUsd;
  const formatted = totalUsd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: totalUsd >= 1 ? 0 : 2,
  });

  return {
    approvalAmountUsd: formatted,
    displayLabel: formatted,
  };
}
