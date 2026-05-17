/**
 * Sigil — Ethereum provider interceptor
 * Injected directly into the page context (MAIN world) to wrap window.ethereum
 */
(function () {
  "use strict";

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

  const patchedProviders = new WeakSet();

  function createRequestId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
    return `sigil-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function extractAnalysisTarget(method, params) {
    if (!params || params.length === 0) return null;

    if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
      const tx = params[0];
      return { type: "transaction", data: tx };
    }

    if (method === "eth_sign") {
      return { type: "raw_sign", data: params[1], from: params[0] };
    }

    if (method === "personal_sign") {
      return { type: "personal_sign", data: params[0], from: params[1] };
    }

    if (method.startsWith("eth_signTypedData")) {
      return { type: "typed_data", data: params[1], from: params[0] };
    }

    return null;
  }

  function patchProvider(provider) {
    if (!provider || patchedProviders.has(provider) || provider.__sigilPatched) return;
    patchedProviders.add(provider);
    provider.__sigilPatched = true;

    const originalRequest = provider.request.bind(provider);
    provider.request = async function (args) {
      const { method, params } = args;

      if (SIGN_METHODS.has(method)) {
        const target = extractAnalysisTarget(method, params);
        if (target) {
          const requestId = createRequestId();
          window.dispatchEvent(
            new CustomEvent("sigil:intercept", {
              detail: { requestId, method, target, timestamp: Date.now() },
            })
          );

          const action = await new Promise((resolve) => {
            const handler = (e) => {
              if (e.detail?.requestId !== requestId) return;
              if (e.detail?.action === "proceed" || e.detail?.action === "cancel") {
                window.removeEventListener("sigil:decision", handler);
                resolve(e.detail.action);
              }
            };
            window.addEventListener("sigil:decision", handler);
            setTimeout(() => {
              window.removeEventListener("sigil:decision", handler);
              resolve("timeout");
            }, 90000);
          });

          if (action === "cancel") {
            throw new Error("Sigil blocked wallet request");
          }
          if (action === "timeout") {
            throw new Error("Sigil security check timed out");
          }
        }
      }

      return originalRequest(args);
    };
  }

  function patchKnownProviders() {
    if (window.ethereum) {
      patchProvider(window.ethereum);
      if (Array.isArray(window.ethereum.providers)) {
        window.ethereum.providers.forEach(patchProvider);
      }
    }
    if (window.rabby) patchProvider(window.rabby);
    if (window.coinbaseWalletExtension) patchProvider(window.coinbaseWalletExtension);
    if (window.trustwallet) patchProvider(window.trustwallet);
    if (window.frameEthereum) patchProvider(window.frameEthereum);
  }

  function watchForProvider() {
    patchKnownProviders();

    window.addEventListener("ethereum#initialized", patchKnownProviders, { once: true });
    let attempts = 0;
    const poll = setInterval(() => {
      patchKnownProviders();
      attempts += 1;
      if (attempts >= 20 || window.ethereum) clearInterval(poll);
    }, 250);
  }

  watchForProvider();
})();
