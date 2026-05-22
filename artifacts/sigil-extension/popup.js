const core = window.SigilExtensionCore;

const MODE_COPY = {
  quiet: "Only interrupts suspicious approvals, typed data, and contract calls.",
  standard: "Balanced daily protection with local checks and Sigil API analysis.",
  strict: "Reviews every signing request and adds extra confirmation for risk.",
};

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
  apiUrlInput: document.getElementById("apiUrlInput"),
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

function renderChips(container, values, remove) {
  container.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "None yet";
    container.appendChild(empty);
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
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No recent checks yet";
    elements.historyList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-item";
    const verdict = item.verdict || "caution";
    card.innerHTML = `
      <div class="history-top">
        <div class="history-site"></div>
        <div class="pill ${verdict}">${verdict}</div>
      </div>
      <div class="history-meta"></div>
    `;
    card.querySelector(".history-site").textContent = item.site || "Unknown site";
    card.querySelector(".history-meta").textContent = `${item.method || "wallet request"} - Risk ${item.riskScore || 0}/100 - ${formatDate(item.timestamp)}`;
    elements.historyList.appendChild(card);
  });
}

function renderSessions() {
  elements.sessionList.innerHTML = "";
  const items = sessions.slice(0, 5);
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No dApp sessions yet";
    elements.sessionList.appendChild(empty);
    return;
  }

  items.forEach((session) => {
    const summary = session.summary || {};
    const verdict = summary.highestVerdict || "safe";
    const card = document.createElement("div");
    card.className = "session-item";
    card.innerHTML = `
      <div class="session-top">
        <div class="session-site"></div>
        <div class="pill ${verdict}">${verdict}</div>
      </div>
      <div class="history-meta"></div>
      <div class="session-grid">
        <div class="session-stat"><strong>${summary.approvals || 0}</strong><span>Appr</span></div>
        <div class="session-stat"><strong>${summary.signatures || 0}</strong><span>Sign</span></div>
        <div class="session-stat"><strong>${summary.transactions || 0}</strong><span>Tx</span></div>
        <div class="session-stat"><strong>${summary.maxRiskScore || 0}</strong><span>Risk</span></div>
      </div>
    `;
    card.querySelector(".session-site").textContent = session.site || "Unknown site";
    card.querySelector(".history-meta").textContent =
      `${summary.eventCount || 0} requests - ${summary.proceeded || 0} proceeded - ${summary.cancelled || 0} cancelled`;
    elements.sessionList.appendChild(card);
  });
}

function renderSiteResult(value) {
  const input = String(value || "").trim();
  if (!input) {
    elements.siteResult.innerHTML = `<div class="empty">Enter a domain to check</div>`;
    return;
  }

  const result = core.evaluateSiteReputation(input);
  const verdict = result.verdict || "caution";
  elements.siteResult.innerHTML = `
    <div class="site-result">
      <div class="site-result-top">
        <div class="site-host"></div>
        <div class="pill ${verdict}">${verdict}</div>
      </div>
      <div class="site-summary"></div>
    </div>
  `;
  elements.siteResult.querySelector(".site-host").textContent = result.host || input;
  elements.siteResult.querySelector(".site-summary").textContent = result.summary;
}

function render() {
  elements.enabledToggle.checked = settings.enabled;
  elements.apiUrlInput.value = settings.apiUrl;
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
}

async function saveSettings(message) {
  settings = core.normalizeSettings(settings);
  await syncSet({
    apiUrl: settings.apiUrl,
    enabled: settings.enabled,
    protectionMode: settings.protectionMode,
    trustedSites: settings.trustedSites,
    trustedContracts: settings.trustedContracts,
    historyLimit: settings.historyLimit,
  });
  render();
  if (message) showToast(message);
}

async function load() {
  const storedSettings = await syncGet({
    apiUrl: core.DEFAULT_API_URL,
    enabled: true,
    protectionMode: "standard",
    trustedSites: [],
    trustedContracts: [],
    historyLimit: 20,
  });
  const storedHistory = await localGet({ history: [] });
  const storedSessions = await localGet({ sessions: [] });
  settings = core.normalizeSettings(storedSettings);
  history = core.trimHistory(storedHistory.history || [], settings.historyLimit);
  sessions = Array.isArray(storedSessions.sessions) ? storedSessions.sessions.slice(0, 12) : [];
  render();
}

elements.saveBtn.addEventListener("click", async () => {
  settings.apiUrl = elements.apiUrlInput.value.trim() || core.DEFAULT_API_URL;
  await saveSettings("Settings saved");
});

elements.enabledToggle.addEventListener("change", async () => {
  settings.enabled = elements.enabledToggle.checked;
  await saveSettings(settings.enabled ? "Guard enabled" : "Guard paused");
});

elements.modeGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  settings.protectionMode = button.dataset.mode;
  await saveSettings("Mode updated");
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
