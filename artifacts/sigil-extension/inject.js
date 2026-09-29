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

  const MAX_DEPTH = 8;
  const MAX_NODES = 512;
  const MAX_OBJECT_KEYS = 64;
  const MAX_ARRAY_LENGTH = 128;
  const MAX_STRING_LENGTH = 32768;
  const MAX_JSON_BYTES = 65536;
  const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
  const ARRAY_INDEX_PATTERN = /^(0|[1-9][0-9]*)$/;
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const reflectApply = Reflect.apply;
  const reflectConstruct = Reflect.construct;
  const reflectOwnKeys = Reflect.ownKeys;
  const arrayIsArray = Array.isArray;
  const objectCreate = Object.create;
  const objectDefineProperty = Object.defineProperty;
  const objectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const objectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  const objectGetPrototypeOf = Object.getPrototypeOf;
  const objectHasOwnProperty = Object.prototype.hasOwnProperty;
  const objectSetPrototypeOf = Object.setPrototypeOf;
  const objectPrototype = Object.prototype;
  const numberIsFinite = Number.isFinite;
  const jsonStringify = JSON.stringify;
  const regExpTest = RegExp.prototype.test;
  const setHas = Set.prototype.has;
  const WeakSetConstructor = WeakSet;
  const weakSetAdd = WeakSet.prototype.add;
  const weakSetDelete = WeakSet.prototype.delete;
  const weakSetHas = WeakSet.prototype.has;
  const dateNow = Date.now;
  const scheduleTask = globalThis.setTimeout;
  const CustomEventConstructor = globalThis.CustomEvent;
  const dispatchEvent = window.dispatchEvent;
  const cryptoObject = globalThis.crypto;
  const randomUUID = cryptoObject && cryptoObject.randomUUID;
  const textEncoder = new TextEncoder();
  const textEncode = TextEncoder.prototype.encode;
  const encodedBytes = reflectApply(textEncode, textEncoder, [""]);
  const typedArrayPrototype = objectGetPrototypeOf(objectGetPrototypeOf(encodedBytes));
  const typedArrayByteLength = objectGetOwnPropertyDescriptor(typedArrayPrototype, "byteLength").get;

  const patchedProviders = new WeakSet();

  function readDataProperty(object, key) {
    if ((typeof object !== "object" && typeof object !== "function") || object === null) return null;
    const descriptor = objectGetOwnPropertyDescriptor(object, key);
    if (!descriptor || !reflectApply(objectHasOwnProperty, descriptor, ["value"])) return null;
    return descriptor;
  }

  function readParam(params, index) {
    if (!arrayIsArray(params)) return null;
    return readDataProperty(params, String(index));
  }

  function isPlainObject(value) {
    if (typeof value !== "object" || value === null || arrayIsArray(value)) return false;
    const prototype = objectGetPrototypeOf(value);
    return prototype === objectPrototype || prototype === null;
  }

  function cloneSnapshot(value, state, depth) {
    state.nodes += 1;
    if (state.nodes > MAX_NODES || depth > MAX_DEPTH) throw new TypeError("Snapshot limit exceeded");

    if (value === null) return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!numberIsFinite(value)) throw new TypeError("Non-finite number");
      return value;
    }
    if (typeof value === "string") {
      if (value.length > MAX_STRING_LENGTH) throw new TypeError("String limit exceeded");
      return value;
    }
    if (typeof value !== "object") throw new TypeError("Unsupported snapshot value");
    if (reflectApply(weakSetHas, state.seen, [value])) throw new TypeError("Cyclic snapshot value");
    reflectApply(weakSetAdd, state.seen, [value]);

    if (arrayIsArray(value)) {
      const lengthDescriptor = objectGetOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !reflectApply(objectHasOwnProperty, lengthDescriptor, ["value"])) {
        throw new TypeError("Invalid array");
      }
      const length = lengthDescriptor.value;
      if (!numberIsFinite(length) || length < 0 || length > MAX_ARRAY_LENGTH) {
        throw new TypeError("Array limit exceeded");
      }

      const descriptors = objectGetOwnPropertyDescriptors(value);
      const keys = reflectOwnKeys(descriptors);
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        const key = keys[keyIndex];
        if (
          typeof key !== "string" ||
          (key !== "length" && !reflectApply(regExpTest, ARRAY_INDEX_PATTERN, [key]))
        ) {
          throw new TypeError("Unsupported array key");
        }
      }

      const copy = [];
      objectSetPrototypeOf(copy, null);
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[index];
        if (
          !descriptor ||
          !reflectApply(objectHasOwnProperty, descriptor, ["value"]) ||
          !descriptor.enumerable
        ) {
          throw new TypeError("Sparse or accessor array");
        }
        objectDefineProperty(copy, index, {
          configurable: true,
          enumerable: true,
          value: cloneSnapshot(descriptor.value, state, depth + 1),
          writable: true,
        });
      }
      reflectApply(weakSetDelete, state.seen, [value]);
      return copy;
    }

    if (!isPlainObject(value)) throw new TypeError("Non-plain snapshot object");
    const descriptors = objectGetOwnPropertyDescriptors(value);
    const keys = reflectOwnKeys(descriptors);
    if (keys.length > MAX_OBJECT_KEYS) throw new TypeError("Object key limit exceeded");

    const copy = objectCreate(null);
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      if (typeof key !== "string") throw new TypeError("Symbol snapshot key");
      if (key.length > MAX_STRING_LENGTH) throw new TypeError("Object key limit exceeded");
      const descriptor = descriptors[key];
      if (!reflectApply(objectHasOwnProperty, descriptor, ["value"]) || !descriptor.enumerable) {
        throw new TypeError("Accessor snapshot property");
      }
      objectDefineProperty(copy, key, {
        configurable: true,
        enumerable: true,
        value: cloneSnapshot(descriptor.value, state, depth + 1),
        writable: true,
      });
    }
    reflectApply(weakSetDelete, state.seen, [value]);
    return copy;
  }

  function extractAnalysisTarget(method, params) {
    const first = readParam(params, 0);

    if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
      if (!first || !isPlainObject(first.value)) return null;
      return { type: "transaction", data: first.value };
    }

    if (method === "eth_sign") {
      const second = readParam(params, 1);
      if (!first || !second) return null;
      return { type: "raw_sign", data: second.value, from: first.value };
    }

    if (method === "personal_sign") {
      const second = readParam(params, 1);
      if (!first || !second) return null;
      return { type: "personal_sign", data: first.value, from: second.value };
    }

    if (
      method === "eth_signTypedData" ||
      method === "eth_signTypedData_v1" ||
      method === "eth_signTypedData_v3" ||
      method === "eth_signTypedData_v4"
    ) {
      const second = readParam(params, 1);
      if (!first || !second) return null;
      const firstIsAddress =
        typeof first.value === "string" && reflectApply(regExpTest, ADDRESS_PATTERN, [first.value]);
      const secondIsAddress =
        typeof second.value === "string" && reflectApply(regExpTest, ADDRESS_PATTERN, [second.value]);
      if (firstIsAddress === secondIsAddress) return null;
      return {
        type: "typed_data",
        data: firstIsAddress ? second.value : first.value,
        from: firstIsAddress ? first.value : second.value,
      };
    }

    return null;
  }

  function createObservation(wrapperArgs) {
    const requestDescriptor = readDataProperty(wrapperArgs, "0");
    if (!requestDescriptor) return null;
    const methodDescriptor = readDataProperty(requestDescriptor.value, "method");
    const paramsDescriptor = readDataProperty(requestDescriptor.value, "params");
    if (!methodDescriptor || !paramsDescriptor || typeof methodDescriptor.value !== "string") return null;

    const method = methodDescriptor.value;
    if (!reflectApply(setHas, SIGN_METHODS, [method])) return null;
    const target = extractAnalysisTarget(method, paramsDescriptor.value);
    if (!target) return null;
    if (typeof randomUUID !== "function") return null;

    const observationId = reflectApply(randomUUID, cryptoObject, []);
    if (
      typeof observationId !== "string" ||
      !reflectApply(regExpTest, UUID_V4_PATTERN, [observationId])
    ) {
      return null;
    }

    const state = { nodes: 1, seen: reflectConstruct(WeakSetConstructor, []) };
    const detachedTarget = objectCreate(null);
    detachedTarget.type = target.type;
    detachedTarget.data = cloneSnapshot(target.data, state, 1);
    if (reflectApply(objectHasOwnProperty, target, ["from"])) {
      detachedTarget.from = cloneSnapshot(target.from, state, 1);
    }

    const detail = objectCreate(null);
    detail.version = 1;
    detail.observationId = observationId;
    detail.method = method;
    detail.observedAt = reflectApply(dateNow, Date, []);
    detail.target = detachedTarget;
    const json = reflectApply(jsonStringify, JSON, [detail]);
    const bytes = reflectApply(textEncode, textEncoder, [json]);
    if (reflectApply(typedArrayByteLength, bytes, []) > MAX_JSON_BYTES) return null;
    return detail;
  }

  function emitObservation(wrapperArgs) {
    try {
      const detail = createObservation(wrapperArgs);
      if (!detail) return;
      const event = reflectConstruct(CustomEventConstructor, ["sigil:observation", { detail }]);
      reflectApply(dispatchEvent, window, [event]);
    } catch (_error) {
      // Observation is best-effort and must never alter provider behavior.
    }
  }

  function patchProvider(provider) {
    if (!provider || patchedProviders.has(provider) || provider.__sigilPatched) return;
    patchedProviders.add(provider);
    provider.__sigilPatched = true;

    const originalRequest = provider.request;
    provider.request = function (...wrapperArgs) {
      const result = reflectApply(originalRequest, provider, wrapperArgs);
      let returned = false;
      try {
        reflectApply(scheduleTask, globalThis, [() => {
          if (!returned) return;
          emitObservation(wrapperArgs);
        }, 0]);
      } catch (_error) {
        // A hostile scheduler cannot affect the wallet request.
      }
      returned = true;
      return result;
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
