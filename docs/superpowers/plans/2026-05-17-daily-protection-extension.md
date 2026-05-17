# Daily Protection Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Sigil browser extension reliable, lightweight, and useful in everyday wallet-signing flows.

**Architecture:** Add a small shared vanilla JS core for extension decisions, test that core with Node, then wire it into the MV3 content script, injected provider patch, popup settings, and extension ZIP packaging. Keep the web app as the full-analysis destination.

**Tech Stack:** Chrome MV3 extension, vanilla JavaScript, Shadow DOM overlay, Chrome storage APIs, Node assert tests, existing Express Sigil API.

---

### Task 1: Shared Extension Core

**Files:**
- Create: `artifacts/sigil-extension/core.js`
- Create: `artifacts/sigil-extension/core.test.cjs`

- [ ] Write tests for settings defaults, target extraction, protection modes, critical confirmation, and history trimming.
- [ ] Run `node artifacts/sigil-extension/core.test.cjs` and confirm the tests fail because `core.js` does not exist yet.
- [ ] Implement `core.js` as a browser/Node compatible UMD-style helper.
- [ ] Re-run the core tests and confirm they pass.

### Task 2: Provider Interception

**Files:**
- Modify: `artifacts/sigil-extension/inject.js`
- Modify: `artifacts/sigil-extension/manifest.json`

- [ ] Patch more EIP-1193 provider shapes and preserve original request behavior.
- [ ] Include `core.js` before `content.js` in content scripts.
- [ ] Keep the injected page script small and focused on request interception.

### Task 3: Sign-Time Overlay and API Routing

**Files:**
- Modify: `artifacts/sigil-extension/content.js`

- [ ] Load settings, trusted sites/contracts, and local history.
- [ ] Run local pre-screen before API calls.
- [ ] Route hashes/addresses to `/api/sigil/analyze` and calldata/messages/typed data to `/api/sigil/simulate`.
- [ ] Show compact overlay states: loading, local safe/caution/danger, API result, error.
- [ ] Require a second explicit confirmation for critical/dangerous actions.
- [ ] Save recent prompts to `chrome.storage.local`.

### Task 4: Popup Settings and History

**Files:**
- Modify: `artifacts/sigil-extension/popup.html`
- Modify: `artifacts/sigil-extension/popup.js`
- Modify: `artifacts/sigil-extension/background.js`

- [ ] Add protection mode selection: Quiet, Standard, Strict.
- [ ] Add trusted site/contract inputs.
- [ ] Show recent prompt history.
- [ ] Preserve existing API URL and enabled controls.

### Task 5: Package and Verify

**Files:**
- Update: `artifacts/sigil/public/sigil-extension.zip`

- [ ] Rebuild the extension ZIP from `artifacts/sigil-extension`.
- [ ] Run `node artifacts/sigil-extension/core.test.cjs`.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build`.
- [ ] Update the MCP dashboard phase status if the phase is ready for review.
