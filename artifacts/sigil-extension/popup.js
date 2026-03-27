const DEFAULT_API_URL = "https://95ae2332-deec-447d-95fe-36fd9971fd5a-00-3ledbqbdza8vc.worf.replit.dev";

const enabledToggle = document.getElementById("enabledToggle");
const apiUrlInput = document.getElementById("apiUrlInput");
const saveBtn = document.getElementById("saveBtn");
const openAppBtn = document.getElementById("openAppBtn");
const toast = document.getElementById("toast");

chrome.storage.sync.get({ apiUrl: DEFAULT_API_URL, enabled: true }, (result) => {
  apiUrlInput.value = result.apiUrl;
  enabledToggle.checked = result.enabled;
  openAppBtn.href = result.apiUrl;
});

saveBtn.addEventListener("click", () => {
  const apiUrl = apiUrlInput.value.trim() || DEFAULT_API_URL;
  const enabled = enabledToggle.checked;
  chrome.storage.sync.set({ apiUrl, enabled }, () => {
    openAppBtn.href = apiUrl;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  });
});

enabledToggle.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledToggle.checked });
});
