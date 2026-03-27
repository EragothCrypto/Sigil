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
    if (!provider || provider.__sigilPatched) return;
    provider.__sigilPatched = true;

    const originalRequest = provider.request.bind(provider);
    provider.request = async function (args) {
      const { method, params } = args;

      if (SIGN_METHODS.has(method)) {
        const target = extractAnalysisTarget(method, params);
        if (target) {
          window.dispatchEvent(
            new CustomEvent("sigil:intercept", {
              detail: { method, target, timestamp: Date.now() },
            })
          );

          await new Promise((resolve) => {
            const handler = (e) => {
              if (e.detail?.action === "proceed" || e.detail?.action === "timeout") {
                window.removeEventListener("sigil:proceed", handler);
                resolve();
              }
            };
            window.addEventListener("sigil:proceed", handler);
            setTimeout(() => {
              window.removeEventListener("sigil:proceed", handler);
              resolve();
            }, 90000);
          });
        }
      }

      return originalRequest(args);
    };
  }

  function watchForProvider() {
    if (window.ethereum) {
      patchProvider(window.ethereum);
    }

    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function (obj, prop, descriptor) {
      if (obj === window && prop === "ethereum") {
        const wrappedDescriptor = { ...descriptor };
        if (descriptor.set) {
          wrappedDescriptor.set = function (val) {
            descriptor.set.call(this, val);
            patchProvider(window.ethereum);
          };
        }
        return originalDefineProperty.call(this, obj, prop, wrappedDescriptor);
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    };
  }

  watchForProvider();
})();
