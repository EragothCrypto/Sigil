(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SigilExtensionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_API_URL = "https://95ae2332-deec-447d-95fe-36fd9971fd5a-00-3ledbqbdza8vc.worf.replit.dev";
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
      if (tx.to) return { kind: "address", value: String(tx.to) };
      if (tx.data && tx.data !== "0x") return { kind: "simulation", value: stringifyInput(tx) };
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
          "Unlimited approvals let the spender move this token later without another wallet prompt.",
          "Only continue if you fully trust the site and spender contract.",
        ],
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
        reason: "typed_data",
        verdict: "caution",
        riskScore: normalized.protectionMode === "strict" ? 55 : 42,
        riskLevel: normalized.protectionMode === "strict" ? "high" : "medium",
        summary: "This is a typed-data signature request. Review the domain and message carefully.",
        warnings: ["Typed-data signatures can authorize orders, permits, or account actions without sending a transaction."],
        requiresApi: true,
      };
    }

    return {
      action: "show",
      reason: "needs_analysis",
      verdict: "caution",
      riskScore: normalized.protectionMode === "strict" ? 45 : 30,
      riskLevel: normalized.protectionMode === "strict" ? "medium" : "medium",
      summary: "Sigil should analyze this request before you sign.",
      warnings: [],
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
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
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

  return {
    DEFAULT_API_URL,
    METHOD_LABELS,
    SIGN_METHODS,
    normalizeSettings,
    extractAnalysisTarget,
    getAnalysisInput,
    localPreScreen,
    requiresSecondConfirm,
    trimHistory,
    createHistoryEntry,
  };
});
