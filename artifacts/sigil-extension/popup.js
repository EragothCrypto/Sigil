const core = window.SigilExtensionCore;

const MODE_COPY = {
  quiet: "Fewer alerts: focus on suspicious approvals, typed data, and contract calls.",
  standard: "Normal alerts: balanced local checks and Sigil API analysis.",
  strict: "More alerts: review every compatible signing request Sigil observes.",
};

const NOTIFICATION_COPY = {
  critical: "Only surface critical or dangerous findings.",
  important: "Surface critical findings and high-risk wallet activity.",
  off: "Do not surface notification-style alerts.",
};

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
  apiUrlInput: document.getElementById("apiUrlInput"),
  notificationPolicyInput: document.getElementById("notificationPolicyInput"),
  notificationPolicyDescription: document.getElementById("notificationPolicyDescription"),
  syncEnabledToggle: document.getElementById("syncEnabledToggle"),
  syncDescription: document.getElementById("syncDescription"),
  saveBtn: document.getElementById("saveBtn"),
  openAppBtn: document.getElementById("openAppBtn"),
  toast: document.getElementById("toast"),
  modeGrid: document.getElementById("modeGrid"),
  modeDescription: document.getElementById("modeDescription"),
  trustedSiteInput: document.getElementById("trustedSiteInput"),
  trustedSites: document.getElementById("trustedSites"),
  addSiteBtn: document.getElementById("addSiteBtn"),
  siteCheckInput: document.getElementById("siteCheckInput"),
  siteResult: document.getElementById("siteResult"),
  checkSiteBtn: document.getElementById("checkSiteBtn"),
  pasteInput: document.getElementById("pasteInput"),
  pasteResult: document.getElementById("pasteResult"),
  pasteAnalyzeBtn: document.getElementById("pasteAnalyzeBtn"),
  trustedContractInput: document.getElementById("trustedContractInput"),
  trustedContracts: document.getElementById("trustedContracts"),
  addContractBtn: document.getElementById("addContractBtn"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  sessionList: document.getElementById("sessionList"),
};

let settings = core.normalizeSettings({});
let history = [];
let sessions = [];

function syncGet(defaults) {
  return new Promise((resolve) => chrome.storage.sync.get(defaults, resolve));
}

function localGet(defaults) {
  return new Promise((resolve) => chrome.storage.local.get(defaults, resolve));
}

function syncSet(value) {
  return new Promise((resolve) => chrome.storage.sync.set(value, resolve));
}

function syncRemove(keys) {
  return new Promise((resolve) => chrome.storage.sync.remove(keys, resolve));
}

function localSet(value) {
  return new Promise((resolve) => chrome.storage.local.set(value, resolve));
}

function showToast(message = "Saved") {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 1800);
}

function normalizeHost(value) {
  const raw = String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return raw.toLowerCase();
}

function normalizeContract(value) {
  const raw = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(raw) ? raw : "";
}

function formatDate(timestamp) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function safeVerdictClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "dangerous" || normalized === "critical" || normalized === "high") return "dangerous";
  if (normalized === "caution" || normalized === "warning" || normalized === "medium") return "caution";
  return normalized === "safe" || normalized === "low" ? "safe" : "caution";
}

function safeVerdictLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "dangerous" || normalized === "critical") return "dangerous";
  if (normalized === "high") return "high";
  if (normalized === "caution" || normalized === "warning" || normalized === "medium") return "caution";
  if (normalized === "safe" || normalized === "low") return "safe";
  return "review";
}

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function createPill(value) {
  const pill = document.createElement("div");
  pill.className = `pill ${safeVerdictClass(value)}`;
  pill.textContent = safeVerdictLabel(value);
  return pill;
}

function createEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function extractApiSummary(payload) {
  const result = payload?.result || payload || {};
  if (result.assessmentStatus) {
    const report = core.readExecutionReport(result);
    return { verdict: "review", score: null,
      summary: report ? `${report.assessmentStatus}: ${report.summary} ${report.limitations.join(" ")}`
        : "Execution evidence unavailable. No remote outcome was established." };
  }
  const verdict = result.verdict || result.riskLevel || result.status || "review";
  const score = Number.isFinite(Number(result.riskScore)) ? Number(result.riskScore) : null;
  const summary = result.summary || result.verdictReason || result.explanation || result.reason || "Sigil returned an analysis.";
  return {
    verdict,
    score,
    summary,
  };
}

function renderChips(container, values, remove) {
  container.innerHTML = "";
  if (!values.length) {
    container.appendChild(createEmpty("None yet"));
    return;
  }

  values.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    const text = document.createElement("span");
    text.textContent = value;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "x";
    button.addEventListener("click", () => remove(value));
    chip.append(text, button);
    container.appendChild(chip);
  });
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  const items = history.slice(0, 8);
  if (!items.length) {
    elements.historyList.appendChild(createEmpty("No recent checks yet"));
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-item";
    const top = document.createElement("div");
    top.className = "history-top";
    const site = document.createElement("div");
    site.className = "history-site";
    site.textContent = item.site || "Unknown site";
    const execution = item.inputKind === "simulation" || item.assessmentStatus;
    top.append(site, createPill(execution ? "review" : item.verdict || "caution"));

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = `${item.method || "wallet request"} - ${execution
      ? (item.evidenceSource === "remote_bounded_check" ? "Bounded read-only check" : "Local advisory only")
      : `Risk ${safeNumber(item.riskScore)}/100`} - ${formatDate(item.timestamp)}`;
    card.append(top, meta);
    elements.historyList.appendChild(card);
  });
}

function renderSessions() {
  elements.sessionList.innerHTML = "";
  const items = sessions.slice(0, 5);
  if (!items.length) {
    elements.sessionList.appendChild(createEmpty("No dApp sessions yet"));
    return;
  }

  items.forEach((session) => {
    const summary = core.summarizeSessionEvents(session.events);
    const card = document.createElement("div");
    card.className = "session-item";

    const top = document.createElement("div");
    top.className = "session-top";
    const site = document.createElement("div");
    site.className = "session-site";
    site.textContent = session.site || "Unknown site";
    top.append(site, createPill(summary.highestVerdict || "review"));

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const legacyActions = safeNumber(summary.legacyProceeded) + safeNumber(summary.legacyCancelled);
    meta.textContent =
      `${safeNumber(summary.eventCount)} requests - ${safeNumber(summary.reviewed)} reviewed - ` +
      `${safeNumber(summary.dismissed)} dismissed - ${safeNumber(summary.analysisFailed)} failed` +
      (legacyActions ? ` - Legacy extension actions: ${legacyActions}` : "");

    const grid = document.createElement("div");
    grid.className = "session-grid";
    [
      ["Reviewed", summary.reviewed],
      ["Dismissed", summary.dismissed],
      ["Failed", summary.analysisFailed],
      ["Risk", summary.maxRiskScore],
    ].forEach(([label, value]) => {
      const stat = document.createElement("div");
      stat.className = "session-stat";
      const strong = document.createElement("strong");
      strong.textContent = label === "Risk" && value == null ? "Unavailable" : String(safeNumber(value));
      const span = document.createElement("span");
      span.textContent = label;
      stat.append(strong, span);
      grid.appendChild(stat);
    });

    card.append(top, meta, grid);
    elements.sessionList.appendChild(card);
  });
}

function renderSiteResult(value) {
  const input = String(value || "").trim();
  if (!input) {
    elements.siteResult.replaceChildren(createEmpty("Enter a domain to check"));
    return;
  }

  const result = core.evaluateSiteReputation(input);
  const card = document.createElement("div");
  card.className = "site-result";
  const top = document.createElement("div");
  top.className = "site-result-top";
  const host = document.createElement("div");
  host.className = "site-host";
  host.textContent = result.host || input;
  top.append(host, createPill(result.verdict || "caution"));
  const summary = document.createElement("div");
  summary.className = "site-summary";
  summary.textContent = result.summary;
  card.append(top, summary);
  elements.siteResult.replaceChildren(card);
}

function renderPasteResult(value, output) {
  const classification = core.classifyPastedInput(value);
  if (classification.kind === "empty") {
    elements.pasteResult.replaceChildren(createEmpty(classification.summary));
    return classification;
  }

  const card = document.createElement("div");
  card.className = "paste-result";
  const top = document.createElement("div");
  top.className = "paste-top";
  const kind = document.createElement("div");
  kind.className = "paste-kind";
  kind.textContent = classification.label;
  top.append(kind, createPill(output?.verdict || classification.riskHint || "review"));

  const summary = document.createElement("div");
  summary.className = "paste-summary";
  summary.textContent = classification.summary;

  const outputNode = document.createElement("div");
  outputNode.className = "paste-output";
  if (output?.type === "local" && classification.siteReputation) {
    outputNode.textContent =
      `Local site verdict: ${safeVerdictLabel(classification.siteReputation.verdict)} - Risk ${safeNumber(classification.siteReputation.riskScore)}/100`;
  } else if (output?.type === "api") {
    const apiSummary = extractApiSummary(output.payload);
    const scoreText = apiSummary.score === null ? "" : ` - Risk ${apiSummary.score}/100`;
    outputNode.textContent = classification.scanMode === "simulate"
      ? apiSummary.summary : `Sigil verdict: ${safeVerdictLabel(apiSummary.verdict)}${scoreText}. ${apiSummary.summary}`;
  } else if (output?.type === "error") {
    outputNode.textContent = output.message || "Sigil API scan failed. Please try again.";
  } else {
    outputNode.textContent = (classification.warnings || [])[0] || "Press Analyze for a Sigil API scan.";
  }

  card.append(top, summary, outputNode);
  elements.pasteResult.replaceChildren(card);

  return classification;
}

function render() {
  elements.enabledToggle.checked = settings.enabled;
  elements.apiUrlInput.value = settings.apiUrl;
  elements.notificationPolicyInput.value = settings.notificationPolicy;
  elements.notificationPolicyDescription.textContent = NOTIFICATION_COPY[settings.notificationPolicy] || NOTIFICATION_COPY.critical;
  elements.syncEnabledToggle.checked = settings.syncEnabled;
  elements.syncDescription.textContent = settings.syncEnabled
    ? "Preferences and trusted lists sync through Chrome. Analysis history stays on this device."
    : "Preferences stay on this device. Analysis history is always local.";
  elements.openAppBtn.href = settings.apiUrl;
  elements.modeDescription.textContent = MODE_COPY[settings.protectionMode] || MODE_COPY.standard;

  elements.modeGrid.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === settings.protectionMode);
  });

  renderChips(elements.trustedSites, settings.trustedSites, async (value) => {
    settings.trustedSites = settings.trustedSites.filter((item) => item !== value);
    await saveSettings();
  });

  renderChips(elements.trustedContracts, settings.trustedContracts, async (value) => {
    settings.trustedContracts = settings.trustedContracts.filter((item) => item !== value);
    await saveSettings();
  });

  renderHistory();
  renderSessions();
  renderSiteResult(elements.siteCheckInput.value);
  renderPasteResult(elements.pasteInput.value);
}

async function saveSettings(message) {
  settings = core.normalizeSettings(settings);
  await localSet({
    apiUrl: settings.apiUrl,
    enabled: settings.enabled,
    protectionMode: settings.protectionMode,
    notificationPolicy: settings.notificationPolicy,
    syncEnabled: settings.syncEnabled,
    trustedSites: settings.trustedSites,
    trustedContracts: settings.trustedContracts,
    historyLimit: settings.historyLimit,
  });
  if (settings.syncEnabled) {
    await syncSet(core.createSyncSettingsPayload(settings));
  } else {
    await syncSet({ syncEnabled: false });
    await syncRemove(["apiUrl", "enabled", "protectionMode", "notificationPolicy", "trustedSites", "trustedContracts", "historyLimit"]);
  }
  render();
  if (message) showToast(message);
}

async function load() {
  const defaultSettings = {
    apiUrl: core.DEFAULT_API_URL,
    enabled: true,
    protectionMode: "standard",
    notificationPolicy: "critical",
    syncEnabled: false,
    trustedSites: [],
    trustedContracts: [],
    historyLimit: 20,
  };
  const localSettings = await localGet(defaultSettings);
  const syncedSettings = await syncGet({ ...defaultSettings, syncEnabled: false });
  const storedHistory = await localGet({ history: [] });
  const storedSessions = await localGet({ sessions: [] });
  settings = core.normalizeSettings(
    syncedSettings.syncEnabled === true || localSettings.syncEnabled === true
      ? { ...localSettings, ...syncedSettings, syncEnabled: true }
      : localSettings,
  );
  history = core.trimHistory(storedHistory.history || [], settings.historyLimit);
  sessions = Array.isArray(storedSessions.sessions) ? storedSessions.sessions.slice(0, 12) : [];
  render();
}

elements.saveBtn.addEventListener("click", async () => {
  settings.apiUrl = elements.apiUrlInput.value.trim() || core.DEFAULT_API_URL;
  settings.notificationPolicy = elements.notificationPolicyInput.value;
  await saveSettings("Settings saved");
});

elements.notificationPolicyInput.addEventListener("change", async () => {
  settings.notificationPolicy = elements.notificationPolicyInput.value;
  await saveSettings("Notification policy updated");
});

elements.enabledToggle.addEventListener("change", async () => {
  settings.enabled = elements.enabledToggle.checked;
  await saveSettings(settings.enabled ? "Request alerts enabled" : "Request alerts paused");
});

elements.syncEnabledToggle.addEventListener("change", async () => {
  settings.syncEnabled = elements.syncEnabledToggle.checked;
  await saveSettings(settings.syncEnabled ? "Settings sync enabled" : "Settings sync disabled");
});

elements.modeGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  settings.protectionMode = button.dataset.mode;
  await saveSettings("Alert sensitivity updated");
});

elements.addSiteBtn.addEventListener("click", async () => {
  const value = normalizeHost(elements.trustedSiteInput.value);
  if (!value) return showToast("Enter a site");
  settings.trustedSites = Array.from(new Set([...settings.trustedSites, value]));
  elements.trustedSiteInput.value = "";
  await saveSettings("Site trusted");
});

elements.checkSiteBtn.addEventListener("click", () => {
  renderSiteResult(elements.siteCheckInput.value);
});

elements.pasteInput.addEventListener("input", () => {
  renderPasteResult(elements.pasteInput.value);
});

elements.pasteAnalyzeBtn.addEventListener("click", async () => {
  const classification = renderPasteResult(elements.pasteInput.value);
  if (classification.scanMode === "none") {
    showToast("Paste something first");
    return;
  }

  if (classification.scanMode === "local") {
    renderPasteResult(elements.pasteInput.value, { type: "local", verdict: classification.siteReputation?.verdict });
    showToast("Checked locally");
    return;
  }

  const endpoint = classification.scanMode === "analyze" ? "/api/sigil/analyze" : "/api/sigil/simulate-v2";
  const body = classification.scanMode === "analyze"
    ? { input: classification.value, network: "mainnet" }
    : { rawData: classification.value, network: "mainnet" };

  elements.pasteAnalyzeBtn.disabled = true;
  elements.pasteAnalyzeBtn.textContent = "Scanning...";
  try {
    const response = await fetch(`${settings.apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error(`Sigil API returned ${response.status}`);
    if (classification.scanMode === "simulate" && !core.readExecutionReport(payload)) throw new Error("Execution evidence unavailable");
    const summary = extractApiSummary(payload);
    renderPasteResult(elements.pasteInput.value, {
      type: "api",
      payload,
      verdict: summary.verdict,
    });
  } catch (error) {
    renderPasteResult(elements.pasteInput.value, {
      type: "error",
      verdict: "caution",
      message: classification.scanMode === "simulate"
        ? "Remote execution evidence unavailable. Local input classification is advisory only; no effects or signing clearance established."
        : "Sigil API scan failed. Please try again.",
    });
  } finally {
    elements.pasteAnalyzeBtn.disabled = false;
    elements.pasteAnalyzeBtn.textContent = "Analyze";
  }
});

elements.addContractBtn.addEventListener("click", async () => {
  const value = normalizeContract(elements.trustedContractInput.value);
  if (!value) return showToast("Use a 0x address");
  settings.trustedContracts = Array.from(new Set([...settings.trustedContracts, value]));
  elements.trustedContractInput.value = "";
  await saveSettings("Contract trusted");
});

elements.clearHistoryBtn.addEventListener("click", async () => {
  history = [];
  sessions = [];
  await localSet({ history, sessions });
  renderHistory();
  renderSessions();
  showToast("History cleared");
});

load();
