# dApp Session Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local dApp session summaries to the Chrome extension.

**Architecture:** Extend extension core with pure session event and aggregation helpers. Wire content-script decisions into local session storage. Render recent session summaries in the popup.

**Tech Stack:** Chrome extension MV3, plain JavaScript, `chrome.storage.local`, existing extension core tests.

---

## Files

- Modify: `artifacts/sigil-extension/core.js`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Modify: `artifacts/sigil-extension/content.js`
- Modify: `artifacts/sigil-extension/popup.html`
- Modify: `artifacts/sigil-extension/popup.js`
- Modify: `sigil-whitepaper.md`

## Task 1: Session Core

- [ ] Write failing tests for classification and aggregation.
- [ ] Add `classifySessionCategory`, `createSessionEvent`, `recordSessionEvent`, and `summarizeSessionEvents`.
- [ ] Re-run core tests until green.

## Task 2: Content Capture

- [ ] Create one session ID per page lifecycle.
- [ ] Save session events after local proceed, overlay proceed, overlay cancel, and API fallback decisions.
- [ ] Keep existing recent history behavior.

## Task 3: Popup Summary

- [ ] Load sessions from local storage.
- [ ] Render compact recent dApp sessions.
- [ ] Clear sessions when history is cleared.

## Task 4: Verification

- [ ] Run extension core tests.
- [ ] Run store-readiness tests.
- [ ] Run Vercel routing tests.
- [ ] Run workspace typecheck and build.
- [ ] Repack extension ZIP and SHA256.
- [ ] Commit and push.
