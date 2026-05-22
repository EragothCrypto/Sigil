export type SiteVerdict = "safe" | "caution" | "dangerous";
export type SiteRiskLevel = "low" | "medium" | "high" | "critical";

export interface SiteReputationResult {
  verdict: SiteVerdict;
  riskScore: number;
  riskLevel: SiteRiskLevel;
  brand: string;
  host: string;
  summary: string;
  warnings: string[];
}

const TRUSTED_BRANDS = [
  { brand: "Uniswap", domains: ["app.uniswap.org", "uniswap.org"] },
  { brand: "Aave", domains: ["app.aave.com", "aave.com"] },
  { brand: "OpenSea", domains: ["opensea.io"] },
  { brand: "Curve", domains: ["curve.fi"] },
  { brand: "1inch", domains: ["app.1inch.io", "1inch.io"] },
  { brand: "Safe", domains: ["app.safe.global", "safe.global"] },
  { brand: "Lido", domains: ["stake.lido.fi", "lido.fi"] },
  { brand: "Balancer", domains: ["app.balancer.fi", "balancer.fi"] },
  { brand: "Sushi", domains: ["www.sushi.com", "sushi.com"] },
  { brand: "Sigil", domains: ["sigil.s3ntrylabs.com", "s3ntrylabs.com"] },
];

const KNOWN_DANGEROUS_DOMAINS = [
  "metamask-security-alert.example",
  "walletconnect-verify.example",
  "opensea-login.example",
  "uniswap-airdrop-claim.example",
];

const SUSPICIOUS_TOKENS = [
  "airdrop",
  "claim",
  "verify",
  "validation",
  "security",
  "support",
  "bonus",
  "reward",
  "free",
  "urgent",
];

export function normalizeSiteHost(value: string): string {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split(":")[0]
    .toLowerCase();
}

function hostMatches(host: string, domain: string): boolean {
  const normalizedHost = normalizeSiteHost(host);
  const normalizedDomain = normalizeSiteHost(domain);
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function getHostFromUrl(value: string): string {
  try {
    return normalizeSiteHost(new URL(value).hostname);
  } catch {
    return normalizeSiteHost(value);
  }
}

function compactHost(value: string): string {
  return normalizeSiteHost(value).replace(/[^a-z0-9]/g, "");
}

function brandForTrustedHost(host: string) {
  return TRUSTED_BRANDS.find((entry) => entry.domains.some((domain) => hostMatches(host, domain))) ?? null;
}

function brandForCloneLikeHost(host: string) {
  const compact = compactHost(host);
  return TRUSTED_BRANDS.find((entry) => {
    const brand = entry.brand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const isOfficial = entry.domains.some((domain) => hostMatches(host, domain));
    return !isOfficial && brand.length >= 4 && compact.includes(brand);
  }) ?? null;
}

export function evaluateSiteReputation(value: string): SiteReputationResult {
  const host = getHostFromUrl(value);
  const warnings: string[] = [];

  if (!host) {
    return {
      verdict: "caution",
      riskScore: 35,
      riskLevel: "medium",
      brand: "",
      host: "",
      summary: "Sigil could not read this site's domain.",
      warnings: ["Review the site URL manually before signing."],
    };
  }

  if (KNOWN_DANGEROUS_DOMAINS.some((domain) => hostMatches(host, domain))) {
    return {
      verdict: "dangerous",
      riskScore: 94,
      riskLevel: "critical",
      brand: "",
      host,
      summary: "This domain matches Sigil's local phishing blocklist.",
      warnings: ["Cancel wallet actions on this site unless you can independently verify the domain."],
    };
  }

  if (host.startsWith("xn--")) {
    warnings.push("This domain uses punycode, which can hide lookalike characters.");
  }

  const trustedBrand = brandForTrustedHost(host);
  if (trustedBrand && warnings.length === 0) {
    return {
      verdict: "safe",
      riskScore: 8,
      riskLevel: "low",
      brand: trustedBrand.brand,
      host,
      summary: `${trustedBrand.brand} official domain recognized.`,
      warnings: [],
    };
  }

  const cloneBrand = brandForCloneLikeHost(host);
  if (cloneBrand) {
    warnings.push(`This domain references ${cloneBrand.brand} but is not on Sigil's official-domain list.`);
  }

  const tokenHits = SUSPICIOUS_TOKENS.filter((token) => host.includes(token));
  if (tokenHits.length) {
    warnings.push(`Domain contains risky campaign wording: ${tokenHits.slice(0, 3).join(", ")}.`);
  }

  if ((host.match(/-/g) || []).length >= 2) {
    warnings.push("Domain uses multiple hyphens, a common pattern in short-lived phishing pages.");
  }

  if (warnings.length) {
    return {
      verdict: "caution",
      riskScore: cloneBrand ? 72 : 58,
      riskLevel: cloneBrand ? "high" : "medium",
      brand: cloneBrand?.brand || trustedBrand?.brand || "",
      host,
      summary: "This site has reputation signals worth reviewing before signing.",
      warnings,
    };
  }

  return {
    verdict: "caution",
    riskScore: 28,
    riskLevel: "medium",
    brand: "",
    host,
    summary: "This site is not in Sigil's local trusted or dangerous domain lists.",
    warnings: ["Unknown sites are not automatically unsafe, but verify the URL before signing."],
  };
}
