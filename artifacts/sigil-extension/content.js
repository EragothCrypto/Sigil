(function () {
  "use strict";

  const core = window.SigilExtensionCore;
  let overlayRoot = null;
  let shadowRoot = null;
  let currentRiskConfirmed = false;
  const requestQueue = [];
  let activeRequest = null;
  const observationGate = core.createObservationGate();
  const sessionId = (() => {
    const host = (() => {
      try {
        return new URL(window.location.href).hostname;
      } catch {
        return "unknown";
      }
    })();
    return `${host}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  })();

  function storageGet(area, defaults) {
    return new Promise((resolve) => chrome.storage[area].get(defaults, resolve));
  }

  function storageSet(area, value) {
    return new Promise((resolve) => chrome.storage[area].set(value, resolve));
  }

  async function loadSettings() {
    const defaults = {
      apiUrl: core.DEFAULT_API_URL,
      enabled: true,
      protectionMode: "standard",
      notificationPolicy: "critical",
      syncEnabled: false,
      trustedSites: [],
      trustedContracts: [],
      historyLimit: 20,
    };
    const localSettings = await storageGet("local", defaults);
    const syncSettings = await storageGet("sync", { ...defaults, syncEnabled: false });
    if (syncSettings.syncEnabled === true || localSettings.syncEnabled === true) {
      return core.normalizeSettings({ ...localSettings, ...syncSettings, syncEnabled: true });
    }
    return core.normalizeSettings(localSettings);
  }

  async function saveSettings(settings) {
    const normalized = core.normalizeSettings(settings);
    await storageSet("local", normalized);
    if (normalized.syncEnabled) {
      await storageSet("sync", core.createSyncSettingsPayload(normalized));
    }
    return normalized;
  }

  async function saveHistory(entry, settings) {
    const stored = await storageGet("local", { history: [] });
    const history = core.trimHistory([entry, ...(stored.history || [])], settings.historyLimit);
    await storageSet("local", { history });
  }

  async function saveSessionEvent(payload, decision) {
    if (!payload) return;
    const stored = await storageGet("local", { sessions: [] });
    const event = core.createSessionEvent({ ...payload, sessionId, decision });
    const sessions = core.recordSessionEvent(stored.sessions || [], event, 12);
    await storageSet("local", { sessions });
  }

  function escHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeVerdictClass(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "dangerous" || normalized === "critical" || normalized === "high") return "dangerous";
    if (normalized === "caution" || normalized === "warning" || normalized === "medium") return "caution";
    if (normalized === "loading") return "loading";
    return "safe";
  }

  function safeAnalysisUrl(value) {
    try {
      const parsed = new URL(String(value || ""));
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function buildOverlay() {
    if (overlayRoot) return;

    overlayRoot = document.createElement("div");
    overlayRoot.id = "sigil-extension-root";
    overlayRoot.style.cssText = "position:fixed;inset:auto 0 0 0;z-index:2147483647;pointer-events:none;";
    document.documentElement.appendChild(overlayRoot);

    shadowRoot = overlayRoot.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :host { all: initial; }
        #panel {
          position: fixed;
          left: 50%;
          bottom: -720px;
          transform: translateX(-50%);
          width: min(560px, calc(100vw - 28px));
          color: white;
          background: #080a10;
          border: 1px solid rgba(139,92,246,.35);
          border-radius: 18px 18px 0 0;
          box-shadow: 0 -14px 70px rgba(0,0,0,.82), 0 0 40px rgba(139,92,246,.14);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
          pointer-events: auto;
          transition: bottom .28s cubic-bezier(.16,1,.3,1);
        }
        #panel.visible { bottom: 0; }
        .bar { height: 2px; background: linear-gradient(90deg, transparent, #8b5cf6, #00f5d4, transparent); }
        .head { display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid rgba(255,255,255,.07); }
        .logo { width:28px; height:28px; border-radius:8px; display:grid; place-items:center; color:#080a10; font-weight:900; background:linear-gradient(135deg,#00f5d4,#8b5cf6); }
        .brand { font: 700 12px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing:.16em; color:#c4b5fd; }
        .meta { margin-left:auto; font: 600 10px ui-monospace, SFMono-Regular, Menlo, monospace; color:rgba(255,255,255,.38); text-transform:uppercase; }
        .body { padding:16px; }
        .verdict { display:flex; gap:13px; align-items:flex-start; }
        .icon { width:46px; height:46px; border-radius:14px; display:grid; place-items:center; flex:0 0 auto; font-size:22px; border:1px solid; }
        .safe .icon { background:rgba(52,211,153,.1); border-color:rgba(52,211,153,.28); }
        .caution .icon { background:rgba(251,191,36,.1); border-color:rgba(251,191,36,.28); }
        .dangerous .icon { background:rgba(239,68,68,.12); border-color:rgba(239,68,68,.34); }
        .loading .icon { background:rgba(139,92,246,.12); border-color:rgba(139,92,246,.34); }
        h2 { font-size:17px; line-height:1.25; margin-bottom:5px; color:white; }
        .sub { font: 700 11px ui-monospace, SFMono-Regular, Menlo, monospace; color:rgba(255,255,255,.46); text-transform:uppercase; letter-spacing:.06em; }
        .summary { margin-top:14px; padding:11px 12px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:rgba(255,255,255,.72); font-size:13px; line-height:1.5; }
        .score { display:flex; align-items:center; gap:10px; margin-top:14px; }
        .track { flex:1; height:6px; border-radius:99px; background:rgba(255,255,255,.09); overflow:hidden; }
        .fill { height:100%; border-radius:99px; background:linear-gradient(90deg,#34d399,#fbbf24,#ef4444); }
        .score strong { width:34px; text-align:right; font:700 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
        .warnings { margin-top:12px; padding:11px 12px; border-radius:12px; background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.18); }
        .warnings p { color:#fca5a5; font:700 10px ui-monospace, SFMono-Regular, Menlo, monospace; text-transform:uppercase; letter-spacing:.09em; margin-bottom:7px; }
        .warnings li { margin-left:16px; color:rgba(255,255,255,.72); font-size:12px; line-height:1.45; margin-top:4px; }
        .actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:14px; }
        button, a.btn { border-radius:12px; padding:11px 12px; font:700 12px Inter, sans-serif; cursor:pointer; text-align:center; text-decoration:none; border:1px solid; }
        .primary { color:#c4b5fd; background:rgba(139,92,246,.13); border-color:rgba(139,92,246,.34); }
        .danger { color:#fca5a5; background:rgba(239,68,68,.12); border-color:rgba(239,68,68,.32); }
        .ghost { color:rgba(255,255,255,.62); background:rgba(255,255,255,.045); border-color:rgba(255,255,255,.1); }
        .spinner { width:18px; height:18px; border:2px solid rgba(139,92,246,.25); border-top-color:#a78bfa; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <div id="panel"><div class="bar"></div><div id="content"></div></div>
    `;
  }

  function showPanel() {
    shadowRoot.getElementById("panel").classList.add("visible");
  }

  function hidePanel() {
    const panel = shadowRoot?.getElementById("panel");
    if (panel) panel.classList.remove("visible");
    setTimeout(() => {
      overlayRoot?.remove();
      overlayRoot = null;
      shadowRoot = null;
    }, 320);
  }

  function finish(action, observationId = activeRequest?.observationId) {
    const sessionPayload = activeRequest?.sessionPayload;
    if (sessionPayload) {
      saveSessionEvent(sessionPayload, action).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("sigil:decision", {
      detail: { requestId: observationId, action },
    }));
    hidePanel();
    activeRequest = null;
    processNextRequest();
  }

  function render({ method, url, result, input, loading = false, error = false, fullUrl = "" }, settings) {
    buildOverlay();
    const verdict = loading ? "loading" : error ? "caution" : result.verdict || "caution";
    const verdictClass = safeVerdictClass(verdict);
    const fullAnalysisUrl = safeAnalysisUrl(fullUrl);
    const emoji = loading ? '<span class="spinner"></span>' : verdictClass === "safe" ? "OK" : verdictClass === "dangerous" ? "!!" : "!";
    const title = loading ? "Sigil is checking this request" : result.verdictReason || result.summary || "Review this wallet request";
    const numericRisk = Number(result.riskScore);
    const risk = Number.isFinite(numericRisk) ? numericRisk : 0;
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const needsSecond = !loading && !error && core.requiresSecondConfirm(result, settings) && !currentRiskConfirmed;
    const site = (() => { try { return new URL(url).hostname; } catch { return "current site"; } })();

    shadowRoot.getElementById("content").innerHTML = `
      <div class="head">
        <div class="logo">S</div>
        <div>
          <div class="brand">SIGIL</div>
          <div class="sub">${escHtml(core.METHOD_LABELS[method] || "Wallet Request")}</div>
        </div>
        <div class="meta">${escHtml(site)}</div>
      </div>
      <div class="body ${verdictClass}">
        <div class="verdict">
          <div class="icon">${emoji}</div>
          <div>
            <h2>${escHtml(title)}</h2>
            <div class="sub">${loading ? "Analyzing" : `Risk ${risk}/100 - ${escHtml(result.riskLevel || "medium")}`}</div>
          </div>
        </div>
        <div class="summary">${escHtml(result.summary || "Sigil is reviewing the request before it reaches your wallet.")}</div>
        ${loading ? "" : `<div class="score"><div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, risk))}%"></div></div><strong>${risk}</strong></div>`}
        ${warnings.length ? `<div class="warnings"><p>Warnings</p><ul>${warnings.slice(0, 4).map((item) => `<li>${escHtml(item)}</li>`).join("")}</ul></div>` : ""}
        <div class="actions">
          ${fullAnalysisUrl ? `<a class="btn primary" href="${escHtml(fullAnalysisUrl)}" target="_blank" rel="noopener">Full analysis</a>` : `<button class="ghost" id="detailsBtn">Input: ${escHtml(input?.kind || "request")}</button>`}
          <button class="${needsSecond || verdictClass === "dangerous" ? "danger" : "primary"}" id="proceedBtn">${needsSecond ? "I understand risk" : "Proceed"}</button>
          <button class="ghost" id="cancelBtn">Cancel request</button>
          <button class="ghost" id="trustSiteBtn">Trust this site</button>
        </div>
      </div>
    `;

    shadowRoot.getElementById("proceedBtn").addEventListener("click", () => {
      if (needsSecond) {
        currentRiskConfirmed = true;
        render({ method, url, result, input, loading, error, fullUrl }, settings);
        return;
      }
      finish("proceed");
    });
    shadowRoot.getElementById("cancelBtn").addEventListener("click", () => finish("cancel"));
    shadowRoot.getElementById("trustSiteBtn").addEventListener("click", async () => {
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch {
        finish("cancel");
        return;
      }
      const trustedSites = Array.from(new Set([...(settings.trustedSites || []), host]));
      await saveSettings({ ...settings, trustedSites });
      finish("proceed");
    });

    showPanel();
  }

  async function callSigilApi(settings, input) {
    if (!input) throw new Error("No analyzable input");
    const endpoint = input.kind === "hash" || input.kind === "address" ? "/api/sigil/analyze" : "/api/sigil/simulate";
    const body = input.kind === "hash" || input.kind === "address"
      ? { input: input.value, network: "mainnet" }
      : { rawData: input.value, network: "mainnet" };

    const response = await fetch(`${settings.apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Sigil API returned ${response.status}`);
    return response.json();
  }

  async function handleIntercept(eventDetail) {
    currentRiskConfirmed = false;

    const { observationId, method, target } = eventDetail;
    const url = window.location.href;
    const settings = await loadSettings();
    if (activeRequest !== eventDetail) return;
    const input = core.getAnalysisInput(target);
    const localResult = core.localPreScreen({ method, target, url, settings });

    if (localResult.action === "proceed" && !localResult.requiresApi) {
      await saveHistory(core.createHistoryEntry({ method, url, input, result: localResult }), settings);
      await saveSessionEvent({ method, url, target, input, result: localResult }, "proceed");
      finish("proceed", observationId);
      return;
    }

    render({ method, url, result: localResult, input, loading: localResult.requiresApi }, settings);
    activeRequest.sessionPayload = { method, url, target, input, result: localResult };

    if (!localResult.requiresApi) {
      await saveHistory(core.createHistoryEntry({ method, url, input, result: localResult }), settings);
      return;
    }

    try {
      const apiResult = await callSigilApi(settings, input);
      if (activeRequest !== eventDetail) return;
      const analysisPath = apiResult.id ? `/analysis/${encodeURIComponent(apiResult.id)}` : `/?q=${encodeURIComponent(input?.value || "")}`;
      const fullUrl = `${settings.apiUrl}${analysisPath}`;
      const result = { ...localResult, ...apiResult };
      render({ method, url, result, input, fullUrl }, settings);
      activeRequest.sessionPayload = { method, url, target, input, result };
      await saveHistory(core.createHistoryEntry({ method, url, input, result }), settings);
    } catch (error) {
      if (activeRequest !== eventDetail) return;
      const fallback = {
        ...localResult,
        verdict: localResult.verdict === "safe" ? "caution" : localResult.verdict,
        verdictReason: "Caution - Sigil API was unreachable",
        summary: "Could not reach the Sigil API. Review this request carefully before continuing.",
        riskScore: Math.max(localResult.riskScore || 0, 45),
        warnings: [...(localResult.warnings || []), "Network or API error prevented a full analysis."],
      };
      render({ method, url, result: fallback, input, error: true }, settings);
      activeRequest.sessionPayload = { method, url, target, input, result: fallback };
      await saveHistory(core.createHistoryEntry({ method, url, input, result: fallback }), settings);
    }
  }

  function processNextRequest() {
    if (activeRequest || requestQueue.length === 0) return;
    activeRequest = requestQueue.shift();
    handleIntercept(activeRequest).catch(async () => {
      window.dispatchEvent(new CustomEvent("sigil:decision", {
        detail: { requestId: activeRequest?.observationId, action: "cancel" },
      }));
      activeRequest = null;
      hidePanel();
      processNextRequest();
    });
  }

  window.addEventListener("sigil:observation", (event) => {
    const queueLength = requestQueue.length + (activeRequest ? 1 : 0);
    const decision = observationGate.accept(event.detail, { queueLength });
    if (!decision.accepted) return;
    requestQueue.push(decision.observation);
    processNextRequest();
  });
})();
