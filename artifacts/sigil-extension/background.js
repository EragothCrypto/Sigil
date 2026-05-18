/**
 * Sigil - Background Service Worker (MV3)
 * Handles install defaults and badge updates.
 */

const DEFAULT_API_URL = "https://sigil.s3ntrylabs.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({
    apiUrl: DEFAULT_API_URL,
    enabled: true,
    protectionMode: "standard",
    trustedSites: [],
    trustedContracts: [],
    historyLimit: 20,
  }, (settings) => {
    chrome.storage.sync.set(settings);
  });

  chrome.action.setBadgeBackgroundColor({ color: "#00f5d4" });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SET_BADGE") {
    const text = msg.text || "";
    const color = msg.color || "#00f5d4";
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    sendResponse({ ok: true });
  }
  return true;
});
