(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SigilExtensionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_API_URL = "https://sigil.s3ntrylabs.com";
  const PROTECTION_MODES = new Set(["quiet", "standard", "strict"]);
  const SIGN_METHODS = new Set([
    "eth_sendTransaction",
    "eth_signTransaction",
    "eth_sign",
    "personal_sign",
    "eth_signTypedData",
    "eth_signTypedData_v1",
    "eth_signTypedData_v3",
    "eth_signTypedData_v4",
  ]);

  const METHOD_LABELS = {
    eth_sendTransaction: "Sending Transaction",
    eth_signTransaction: "Signing Transaction",
    eth_sign: "Raw Sign Request",
    personal_sign: "Message Signature",
    eth_signTypedData: "Typed Data Signature",
    eth_signTypedData_v1: "Typed Data Signature",
    eth_signTypedData_v3: "Typed Data Signature",
    eth_signTypedData_v4: "Typed Data Signature",
  };

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

  function normalizeArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  function normalizeSettings(value) {
    const settings = value && typeof value === "object" ? value : {};
    const mode = String(settings.protectionMode || "standard").toLowerCase();

    return {
      apiUrl: String(settings.apiUrl || DEFAULT_API_URL).replace(/\/+$/, ""),
      enabled: settings.enabled !== false,
      protectionMode: PROTECTION_MODES.has(mode) ? mode : "standard",
      trustedSites: normalizeArray(settings.trustedSites),
      trustedContracts: normalizeArray(settings.trustedContracts).map((item) => item.toLowerCase()),
      historyLimit: Number.isFinite(Number(settings.historyLimit)) ? Number(settings.historyLimit) : 20,
    };
  }

  function extractAnalysisTarget(method, params) {
    if (!params || params.length === 0 || !SIGN_METHODS.has(method)) return null;

    if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
      return { type: "transaction", data: params[0] || {} };
    }

    if (method === "eth_sign") {
      return { type: "raw_sign", data: params[1], from: params[0] };
    }

    if (method === "personal_sign") {
      return { type: "personal_sign", data: params[0], from: params[1] };
    }

    if (method.indexOf("eth_signTypedData") === 0) {
      return { type: "typed_data", data: params[1], from: params[0] };
    }

    return null;
  }

  function stringifyInput(value) {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value || "");
    }
  }

  function getAnalysisInput(target) {
    if (!target) return null;

    if (target.type === "transaction") {
      const tx = target.data || {};
      if (tx.hash) return { kind: "hash", value: String(tx.hash) };
      if (tx.data && tx.data !== "0x") return { kind: "simulation", value: stringifyInput(tx) };
      if (tx.input && tx.input !== "0x") return { kind: "simulation", value: stringifyInput(tx) };
      if (tx.to) return { kind: "address", value: String(tx.to) };
      return { kind: "simulation", value: stringifyInput(tx) };
    }

    return { kind: "simulation", value: stringifyInput(target.data) };
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  function normalizeHost(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split(":")[0]
      .toLowerCase();
  }

  function hostMatches(host, domain) {
    const normalizedHost = normalizeHost(host);
    const normalizedDomain = normalizeHost(domain);
    return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
  }

  function getHostFromUrl(value) {
    try {
      return normalizeHost(new URL(value).hostname);
    } catch {
      return normalizeHost(value);
    }
  }

  function compactHost(value) {
    return normalizeHost(value).replace(/[^a-z0-9]/g, "");
  }

  function brandForTrustedHost(host) {
    for (const entry of TRUSTED_BRANDS) {
      if (entry.domains.some((domain) => hostMatches(host, domain))) return entry;
    }
    return null;
  }

  function brandForCloneLikeHost(host) {
    const compact = compactHost(host);
    for (const entry of TRUSTED_BRANDS) {
      const brand = entry.brand.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isOfficial = entry.domains.some((domain) => hostMatches(host, domain));
      if (!isOfficial && brand.length >= 4 && compact.includes(brand)) return entry;
    }
    return null;
  }

  function evaluateSiteReputation(url) {
    const host = getHostFromUrl(url);
    const warnings = [];

    if (!host) {
      return {
        verdict: "caution",
        riskScore: 35,
        riskLevel: "medium",
        brand: "",
        host: "",
        summary: "Sigil could not read this site's domain.",
        warnings: ["Review the site URL manually before signing."],
        requiresApi: false,
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
        warnings: ["Cancel this request unless you can independently verify the site."],
        requiresApi: false,
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
        requiresApi: false,
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
        requiresApi: false,
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
      requiresApi: false,
    };
  }

  function isTrustedSite(url, trustedSites) {
    const host = getHostname(url);
    if (!host) return false;
    return trustedSites.some((site) => {
      const normalized = String(site).replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      return host === normalized || host.endsWith(`.${normalized}`);
    });
  }

  function getTransactionAddress(target) {
    if (!target || target.type !== "transaction") return "";
    return String((target.data || {}).to || "").toLowerCase();
  }

  function isTrustedContract(target, trustedContracts) {
    const address = getTransactionAddress(target);
    return Boolean(address && trustedContracts.includes(address));
  }

  function isPlainTransfer(target) {
    if (!target || target.type !== "transaction") return false;
    const tx = target.data || {};
    const data = String(tx.data || tx.input || "0x").toLowerCase();
    return Boolean(tx.to && (data === "0x" || data === "0x0" || data === ""));
  }

  function isUnlimitedApproval(target) {
    if (!target || target.type !== "transaction") return false;
    const data = String((target.data || {}).data || (target.data || {}).input || "").toLowerCase();
    if (!data.startsWith("0x095ea7b3") && !data.startsWith("0x39509351")) return false;
    const hex = data.replace(/^0x/, "");
    const amountSlot = hex.length >= 8 + 128 ? hex.slice(8 + 64, 8 + 128) : hex.slice(-64);
    if (amountSlot.length < 64) return false;
    return /^f{64}$/i.test(amountSlot) || BigInt(`0x${amountSlot}`) > BigInt("1000000000000000000000000000000");
  }

  function looksLikeUrl(value) {
    const text = String(value || "").trim();
    if (/^https?:\/\//i.test(text)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(text) && !/^0x/i.test(text);
  }

  function looksLikeTypedData(value) {
    try {
      const parsed = JSON.parse(value);
      return Boolean(parsed && typeof parsed === "object" && (parsed.domain || parsed.message || parsed.types));
    } catch {
      return false;
    }
  }

  function classifyPastedInput(value) {
    const raw = String(value || "").trim();
    const compact = raw.replace(/\s+/g, "");
    const lower = compact.toLowerCase();

    if (!raw) {
      return {
        kind: "empty",
        scanMode: "none",
        label: "Nothing pasted",
        summary: "Paste an address, transaction hash, calldata, URL, or typed data to inspect it.",
        warnings: [],
        riskHint: "low",
      };
    }

    if (/^0x[a-f0-9]{40}$/i.test(compact)) {
      return {
        kind: "address",
        scanMode: "analyze",
        label: "EVM address",
        value: compact,
        summary: "This looks like a wallet or contract address.",
        warnings: ["Verify the network and source before sending funds or approving permissions."],
        riskHint: "medium",
      };
    }

    if (/^0x[a-f0-9]{64}$/i.test(compact)) {
      return {
        kind: "hash",
        scanMode: "analyze",
        label: "Transaction hash",
        value: compact,
        summary: "This looks like a transaction hash.",
        warnings: [],
        riskHint: "low",
      };
    }

    if (/^0x[a-f0-9]{8,}$/i.test(compact)) {
      const isApproval = lower.startsWith("0x095ea7b3") || lower.startsWith("0x39509351");
      return {
        kind: isApproval ? "approval_calldata" : "calldata",
        scanMode: "simulate",
        label: isApproval ? "Token approval calldata" : "Calldata",
        value: compact,
        summary: isApproval
          ? "This calldata appears to grant or increase token spending permission."
          : "This looks like raw contract calldata.",
        warnings: isApproval
          ? ["Approval calldata can grant token spending rights without an immediate transfer."]
          : ["Raw calldata can hide contract calls that are hard to read in wallets."],
        riskHint: isApproval ? "high" : "medium",
      };
    }

    if (looksLikeUrl(raw)) {
      const reputation = evaluateSiteReputation(raw);
      return {
        kind: "url",
        scanMode: "local",
        label: "Site or URL",
        value: raw,
        summary: reputation.summary,
        warnings: reputation.warnings,
        riskHint: reputation.riskLevel,
        siteReputation: reputation,
      };
    }

    if (looksLikeTypedData(raw)) {
      return {
        kind: "typed_data",
        scanMode: "simulate",
        label: "Typed data",
        value: raw,
        summary: "This looks like structured signing data.",
        warnings: ["Typed data can authorize permits, orders, or account actions without sending a transaction."],
        riskHint: "medium",
      };
    }

    return {
      kind: "unknown",
      scanMode: "simulate",
      label: "Unknown payload",
      value: raw,
      summary: "Sigil can still inspect this as raw signing or transaction context.",
      warnings: ["Only analyze text you intentionally paste into Sigil."],
      riskHint: "medium",
    };
  }

  function isApprovalRequest(target) {
    if (!target || target.type !== "transaction") return false;
    const data = String((target.data || {}).data || (target.data || {}).input || "").toLowerCase();
    return data.startsWith("0x095ea7b3") || data.startsWith("0x39509351");
  }

  function classifySessionCategory(method, target) {
    if (isApprovalRequest(target)) return "approval";
    if (method === "eth_sendTransaction" || method === "eth_signTransaction") return "transaction";
    if (method === "eth_sign" || method === "personal_sign" || String(method || "").indexOf("eth_signTypedData") === 0) {
      return "signature";
    }
    return "other";
  }

  function localPreScreen({ method, target, url, settings }) {
    const normalized = normalizeSettings(settings);

    if (!normalized.enabled) {
      return {
        action: "proceed",
        reason: "disabled",
        verdict: "safe",
        riskScore: 0,
        riskLevel: "low",
        summary: "Sigil protection is disabled.",
        warnings: [],
        requiresApi: false,
      };
    }

    const siteReputation = evaluateSiteReputation(url);

    if (siteReputation.verdict === "dangerous") {
      return {
        action: "show",
        reason: "site_reputation",
        verdict: "dangerous",
        riskScore: siteReputation.riskScore,
        riskLevel: siteReputation.riskLevel,
        summary: siteReputation.summary,
        warnings: siteReputation.warnings,
        siteReputation,
        requiresApi: false,
      };
    }

    if (isTrustedSite(url, normalized.trustedSites)) {
      return {
        action: "proceed",
        reason: "trusted_site",
        verdict: "safe",
        riskScore: 0,
        riskLevel: "low",
        summary: "This site is in your trusted list.",
        warnings: [],
        requiresApi: false,
      };
    }

    if (isTrustedContract(target, normalized.trustedContracts)) {
      return {
        action: normalized.protectionMode === "strict" ? "show" : "proceed",
        reason: "trusted_contract",
        verdict: "safe",
        riskScore: 5,
        riskLevel: "low",
        summary: "This contract is in your trusted list.",
        warnings: [],
        requiresApi: normalized.protectionMode === "strict",
      };
    }

    if (isUnlimitedApproval(target)) {
      return {
        action: "show",
        reason: "unlimited_approval",
        verdict: "dangerous",
        riskScore: 88,
        riskLevel: "critical",
        summary: "This transaction appears to grant unlimited token spending permission.",
        warnings: [
          ...siteReputation.warnings,
          "Unlimited approvals let the spender move this token later without another wallet prompt.",
          "Only continue if you fully trust the site and spender contract.",
        ],
        siteReputation,
        requiresApi: true,
      };
    }

    if (isPlainTransfer(target)) {
      const result = {
        action: normalized.protectionMode === "quiet" ? "proceed" : "show",
        reason: "plain_transfer",
        verdict: "safe",
        riskScore: 12,
        riskLevel: "low",
        summary: "This looks like a plain native-token transfer with no calldata.",
        warnings: [],
        requiresApi: normalized.protectionMode === "strict",
      };
      return result;
    }

    if (target && target.type === "typed_data") {
      return {
        action: "show",
        reason: siteReputation.riskScore >= 58 ? "site_reputation" : "typed_data",
        verdict: "caution",
        riskScore: Math.max(siteReputation.riskScore, normalized.protectionMode === "strict" ? 55 : 42),
        riskLevel: normalized.protectionMode === "strict" ? "high" : "medium",
        summary: "This is a typed-data signature request. Review the domain and message carefully.",
        warnings: [
          ...siteReputation.warnings,
          "Typed-data signatures can authorize orders, permits, or account actions without sending a transaction.",
        ],
        siteReputation,
        requiresApi: true,
      };
    }

    return {
      action: "show",
      reason: "needs_analysis",
      verdict: "caution",
      riskScore: Math.max(siteReputation.riskScore, normalized.protectionMode === "strict" ? 45 : 30),
      riskLevel: normalized.protectionMode === "strict" ? "medium" : "medium",
      summary: "Sigil should analyze this request before you sign.",
      warnings: siteReputation.warnings,
      siteReputation,
      requiresApi: true,
    };
  }

  function requiresSecondConfirm(result, settings) {
    const normalized = normalizeSettings(settings);
    if (!result) return false;
    if (result.verdict === "dangerous") return true;
    if (Number(result.riskScore || 0) >= 75) return true;
    return normalized.protectionMode === "strict" && Number(result.riskScore || 0) >= 50;
  }

  function trimHistory(entries, limit) {
    return (Array.isArray(entries) ? entries : []).slice(0, limit || 20);
  }

  function createHistoryEntry({ method, url, input, result }) {
    const timestamp = Date.now();
    return {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      createdAt: new Date(timestamp).toISOString(),
      site: getHostname(url),
      method,
      methodLabel: METHOD_LABELS[method] || "Wallet Request",
      inputKind: input ? input.kind : "unknown",
      inputValue: input ? String(input.value).slice(0, 160) : "",
      verdict: result?.verdict || "caution",
      riskScore: Number(result?.riskScore || 0),
      summary: result?.summary || result?.verdictReason || "Analyzed wallet request",
    };
  }

  function normalizeDecision(value) {
    return value === "cancel" ? "cancel" : "proceed";
  }

  function verdictRank(verdict) {
    if (verdict === "dangerous") return 3;
    if (verdict === "caution") return 2;
    if (verdict === "safe") return 1;
    return 0;
  }

  function createSessionEvent({ sessionId, method, url, target, input, result, decision }) {
    const timestamp = Date.now();
    const warnings = Array.isArray(result?.warnings) ? result.warnings.slice(0, 6).map(String) : [];
    return {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: String(sessionId || `${getHostname(url)}-${timestamp}`),
      site: getHostname(url),
      method,
      methodLabel: METHOD_LABELS[method] || "Wallet Request",
      category: classifySessionCategory(method, target),
      inputKind: input ? input.kind : "unknown",
      decision: normalizeDecision(decision),
      verdict: result?.verdict || "caution",
      riskScore: Number(result?.riskScore || 0),
      riskLevel: result?.riskLevel || "medium",
      summary: result?.summary || result?.verdictReason || "Wallet request reviewed",
      warnings,
      timestamp,
      createdAt: new Date(timestamp).toISOString(),
    };
  }

  function summarizeSessionEvents(events) {
    const safeEvents = Array.isArray(events) ? events : [];
    const warnings = [];
    let highestVerdict = "safe";
    let maxRiskScore = 0;

    for (const event of safeEvents) {
      if (verdictRank(event.verdict) > verdictRank(highestVerdict)) highestVerdict = event.verdict;
      maxRiskScore = Math.max(maxRiskScore, Number(event.riskScore || 0));
      for (const warning of event.warnings || []) {
        if (warnings.length < 5 && !warnings.includes(warning)) warnings.push(warning);
      }
    }

    return {
      eventCount: safeEvents.length,
      approvals: safeEvents.filter((event) => event.category === "approval").length,
      signatures: safeEvents.filter((event) => event.category === "signature").length,
      transactions: safeEvents.filter((event) => event.category === "transaction").length,
      proceeded: safeEvents.filter((event) => event.decision === "proceed").length,
      cancelled: safeEvents.filter((event) => event.decision === "cancel").length,
      maxRiskScore,
      highestVerdict,
      warnings,
    };
  }

  function recordSessionEvent(sessions, event, limit) {
    const existing = Array.isArray(sessions) ? sessions : [];
    const current = existing.find((session) => session.id === event.sessionId);
    const other = existing.filter((session) => session.id !== event.sessionId);
    const events = [...(current?.events || []), event].slice(-40);
    const timestamp = event.timestamp || Date.now();
    const session = {
      id: event.sessionId,
      site: event.site,
      startedAt: current?.startedAt || event.createdAt || new Date(timestamp).toISOString(),
      updatedAt: new Date(timestamp).toISOString(),
      events,
      summary: summarizeSessionEvents(events),
    };

    return [session, ...other]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit || 12);
  }

  return {
    DEFAULT_API_URL,
    METHOD_LABELS,
    SIGN_METHODS,
    normalizeSettings,
    extractAnalysisTarget,
    getAnalysisInput,
    evaluateSiteReputation,
    localPreScreen,
    requiresSecondConfirm,
    trimHistory,
    createHistoryEntry,
    classifySessionCategory,
    createSessionEvent,
    summarizeSessionEvents,
    recordSessionEvent,
    classifyPastedInput,
  };
});
