/**
 * Sigil — Background Service Worker (MV3)
 * Handles storage and badge updates.
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    apiUrl: "https://95ae2332-deec-447d-95fe-36fd9971fd5a-00-3ledbqbdza8vc.worf.replit.dev",
    enabled: true,
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
