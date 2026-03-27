/**
 * Sigil — Content Script
 * Runs in MAIN world (set in manifest). Bridges page events → background → overlay.
 */
(function () {
  "use strict";

  const DEFAULT_API_URL = "https://95ae2332-deec-447d-95fe-36fd9971fd5a-00-3ledbqbdza8vc.worf.replit.dev";

  let overlayRoot = null;
  let shadowRoot = null;
  let currentResolve = null;
  let analysisInProgress = false;

  // ── Inject the ethereum interceptor ──────────────────────────────────────
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // ── Overlay DOM (Shadow DOM for style isolation) ──────────────────────────
  function buildOverlay() {
    if (overlayRoot) return;

    overlayRoot = document.createElement("div");
    overlayRoot.id = "sigil-extension-root";
    overlayRoot.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647;
      pointer-events: none; font-family: 'Inter', sans-serif;
    `;
    document.documentElement.appendChild(overlayRoot);

    shadowRoot = overlayRoot.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :host { all: initial; }

        #panel {
          position: fixed;
          bottom: -600px;
          left: 50%;
          transform: translateX(-50%);
          width: min(560px, calc(100vw - 32px));
          background: #0a0b0f;
          border: 1px solid rgba(0, 245, 212, 0.25);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 60px rgba(0,0,0,0.8), 0 0 40px rgba(0,245,212,0.08), inset 0 1px 0 rgba(255,255,255,0.06);
          transition: bottom 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          pointer-events: all;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        #panel.visible { bottom: 0; }

        .glow-bar {
          height: 2px;
          width: 100%;
          background: linear-gradient(90deg, transparent, #00f5d4, transparent);
          opacity: 0.7;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,245,212,0.03);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #00f5d4 0%, #00b4d8 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 900;
          color: #0a0b0f;
          letter-spacing: -1px;
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }

        .logo-text {
          font-size: 14px;
          font-weight: 700;
          color: #00f5d4;
          letter-spacing: 0.1em;
          font-family: 'JetBrains Mono', monospace;
        }

        .header-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .close-btn {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          transition: all 0.15s;
        }
        .close-btn:hover { background: rgba(255,255,255,0.1); color: white; }

        .body { padding: 16px 20px 20px; }

        /* Verdict badge */
        .verdict-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .verdict-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          border: 1px solid;
        }
        .verdict-icon.safe     { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.25); }
        .verdict-icon.caution  { background: rgba(251,191,36,0.1);  border-color: rgba(251,191,36,0.25);  }
        .verdict-icon.dangerous{ background: rgba(239,68,68,0.1);   border-color: rgba(239,68,68,0.25);   }
        .verdict-icon.loading  { background: rgba(0,245,212,0.08);  border-color: rgba(0,245,212,0.2);   }

        .verdict-text { flex: 1; min-width: 0; }

        .verdict-label {
          font-size: 17px;
          font-weight: 700;
          line-height: 1.25;
          margin-bottom: 4px;
          color: white;
        }

        .verdict-sublabel {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          font-family: 'JetBrains Mono', monospace;
          font-weight: 400;
        }
        .verdict-sublabel.safe     { color: #34d399; }
        .verdict-sublabel.caution  { color: #fbbf24; }
        .verdict-sublabel.dangerous{ color: #ef4444; }

        /* Risk score bar */
        .score-row {
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .score-label {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .score-bar-track {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
          background: linear-gradient(90deg, #34d399, #fbbf24, #ef4444);
        }

        .score-num {
          font-size: 13px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: white;
          min-width: 28px;
          text-align: right;
        }

        /* Warnings list */
        .warnings {
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }

        .warnings-title {
          font-size: 11px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          color: rgba(239,68,68,0.8);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .warning-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12.5px;
          color: rgba(255,255,255,0.75);
          line-height: 1.5;
          margin-bottom: 6px;
        }
        .warning-item:last-child { margin-bottom: 0; }

        .warning-dot {
          width: 5px;
          height: 5px;
          background: #ef4444;
          border-radius: 50%;
          margin-top: 6px;
          flex-shrink: 0;
        }

        /* Action pill */
        .action-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,245,212,0.08);
          border: 1px solid rgba(0,245,212,0.2);
          border-radius: 99px;
          padding: 4px 10px;
          font-size: 11.5px;
          font-family: 'JetBrains Mono', monospace;
          color: #00f5d4;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        /* Loading state */
        .loading-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          margin-bottom: 14px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,245,212,0.2);
          border-top-color: #00f5d4;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .loading-text {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        /* Buttons */
        .btn-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 4px;
        }

        .btn {
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          transition: all 0.15s;
          text-align: center;
          font-family: 'Inter', sans-serif;
        }

        .btn-primary {
          background: rgba(0,245,212,0.12);
          border-color: rgba(0,245,212,0.3);
          color: #00f5d4;
        }
        .btn-primary:hover { background: rgba(0,245,212,0.2); }

        .btn-ghost {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.55);
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); color: white; }

        .btn-danger {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.25);
          color: #fca5a5;
        }
        .btn-danger:hover { background: rgba(239,68,68,0.18); }

        /* Summary text */
        .summary {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          line-height: 1.55;
          margin-bottom: 14px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
        }

        /* Network badge */
        .meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 10.5px;
          font-family: 'JetBrains Mono', monospace;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 2px 8px;
        }
      </style>
      <div id="panel">
        <div class="glow-bar"></div>
        <div class="header">
          <div class="logo">
            <div class="logo-icon">S</div>
            <span class="logo-text">SIGIL</span>
          </div>
          <div class="header-right">
            <button class="close-btn" id="closeBtn" title="Dismiss">✕</button>
          </div>
        </div>
        <div class="body" id="panelBody">
          <!-- filled dynamically -->
        </div>
      </div>
    `;

    shadowRoot.getElementById("closeBtn").addEventListener("click", () => {
      proceedAndDismiss("proceed");
    });
  }

  function showLoading(method) {
    buildOverlay();
    const panel = shadowRoot.getElementById("panel");
    const body = shadowRoot.getElementById("panelBody");

    const methodLabel = {
      eth_sendTransaction: "Sending Transaction",
      eth_signTransaction: "Signing Transaction",
      eth_sign: "Raw Sign Request",
      personal_sign: "Message Signature",
      eth_signTypedData_v4: "Typed Data Signature",
      eth_signTypedData_v3: "Typed Data Signature",
    }[method] || "Wallet Request";

    body.innerHTML = `
      <div class="meta-row">
        <span class="meta-badge">⛓ ETHEREUM</span>
        <span class="meta-badge">${methodLabel}</span>
      </div>
      <div class="verdict-row">
        <div class="verdict-icon loading">🔍</div>
        <div class="verdict-text">
          <div class="verdict-label">Analyzing transaction…</div>
          <div class="verdict-sublabel">Sigil is checking this for risks</div>
        </div>
      </div>
      <div class="loading-row">
        <div class="spinner"></div>
        <span class="loading-text">Decoding calldata and checking known protocols…</span>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="proceedNowBtn">Skip Analysis ↗</button>
        <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      </div>
    `;

    shadowRoot.getElementById("proceedNowBtn").addEventListener("click", () => {
      proceedAndDismiss("proceed");
    });
    shadowRoot.getElementById("cancelBtn").addEventListener("click", () => {
      proceedAndDismiss("proceed");
    });

    panel.classList.add("visible");
  }

  function showResult(result) {
    if (!shadowRoot) return;
    const body = shadowRoot.getElementById("panelBody");

    const verdictEmoji = { safe: "✅", caution: "⚠️", dangerous: "🚨" }[result.verdict] || "🔍";
    const breakdown = result.breakdown;
    const warnings = result.warnings || [];
    const apiUrl = result._apiUrl || "";

    let warningsHtml = "";
    if (warnings.length > 0) {
      const items = warnings.slice(0, 3).map(w => `
        <div class="warning-item">
          <div class="warning-dot"></div>
          <span>${escHtml(w)}</span>
        </div>
      `).join("");
      warningsHtml = `
        <div class="warnings">
          <div class="warnings-title">⚠ Warnings</div>
          ${items}
        </div>
      `;
    }

    const actionPill = breakdown?.actionLabel
      ? `<div class="action-pill">⚡ ${escHtml(breakdown.actionLabel)}</div>`
      : "";

    body.innerHTML = `
      <div class="verdict-row">
        <div class="verdict-icon ${result.verdict}">${verdictEmoji}</div>
        <div class="verdict-text">
          <div class="verdict-label">${escHtml(result.verdictReason || result.summary || "Analysis complete")}</div>
          <div class="verdict-sublabel ${result.verdict}">RISK SCORE: ${result.riskScore}/100 · ${(result.riskLevel || "").toUpperCase()}</div>
        </div>
      </div>

      ${actionPill}

      <div class="score-row">
        <span class="score-label">Risk</span>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: ${result.riskScore}%"></div>
        </div>
        <span class="score-num">${result.riskScore}</span>
      </div>

      ${result.summary ? `<div class="summary">${escHtml(result.summary)}</div>` : ""}

      ${warningsHtml}

      <div class="btn-row">
        <a class="btn btn-primary" href="${apiUrl}" target="_blank" rel="noopener" id="viewFullBtn">
          View Full Analysis ↗
        </a>
        <button class="btn ${result.verdict === 'dangerous' ? 'btn-danger' : 'btn-ghost'}" id="proceedBtn">
          ${result.verdict === 'dangerous' ? '⚠ Proceed Anyway' : 'Proceed →'}
        </button>
      </div>
    `;

    shadowRoot.getElementById("proceedBtn").addEventListener("click", () => {
      proceedAndDismiss("proceed");
    });
  }

  function showError() {
    if (!shadowRoot) return;
    const body = shadowRoot.getElementById("panelBody");
    body.innerHTML = `
      <div class="verdict-row">
        <div class="verdict-icon caution">⚡</div>
        <div class="verdict-text">
          <div class="verdict-label">Could not reach Sigil API</div>
          <div class="verdict-sublabel caution">Unable to analyze — proceed with caution</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="proceedBtn">Proceed Anyway →</button>
        <button class="btn btn-ghost" id="cancelBtn2">Dismiss</button>
      </div>
    `;
    shadowRoot.getElementById("proceedBtn").addEventListener("click", () => proceedAndDismiss("proceed"));
    shadowRoot.getElementById("cancelBtn2").addEventListener("click", () => proceedAndDismiss("proceed"));
  }

  function proceedAndDismiss(action) {
    analysisInProgress = false;
    const panel = shadowRoot?.getElementById("panel");
    if (panel) panel.classList.remove("visible");
    window.dispatchEvent(new CustomEvent("sigil:proceed", { detail: { action } }));
    setTimeout(() => {
      if (overlayRoot) {
        overlayRoot.remove();
        overlayRoot = null;
        shadowRoot = null;
      }
    }, 500);
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Main intercept handler ────────────────────────────────────────────────
  window.addEventListener("sigil:intercept", async (event) => {
    if (analysisInProgress) return;
    analysisInProgress = true;

    const { method, target } = event.detail;

    showLoading(method);

    try {
      const storageResult = await new Promise((res) =>
        chrome.storage.sync.get({ apiUrl: DEFAULT_API_URL, enabled: true }, res)
      );

      if (!storageResult.enabled) {
        proceedAndDismiss("proceed");
        return;
      }

      const apiBase = storageResult.apiUrl || DEFAULT_API_URL;

      let inputToAnalyze = null;

      if (target.type === "transaction") {
        const tx = target.data;
        if (tx.hash) {
          inputToAnalyze = tx.hash;
        } else if (tx.to) {
          inputToAnalyze = tx.to;
        } else if (tx.data && tx.data !== "0x") {
          inputToAnalyze = tx.data;
        }
      } else if (target.type === "raw_sign" || target.type === "personal_sign") {
        inputToAnalyze = target.data;
      }

      if (!inputToAnalyze) {
        proceedAndDismiss("proceed");
        return;
      }

      const resp = await fetch(`${apiBase}/api/sigil/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputToAnalyze, network: "mainnet" }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const result = await resp.json();
      result._apiUrl = `${apiBase}/?q=${encodeURIComponent(inputToAnalyze)}`;
      showResult(result);
    } catch (err) {
      console.error("[Sigil] Analysis failed:", err);
      showError();
    }
  });
})();
