# Site Reputation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local-first site reputation checks to the Chrome extension and standalone web app.

**Architecture:** Extend the extension core with deterministic domain reputation rules and feed the result into local pre-screen decisions. Add a matching web app model and `/sites` checker page.

**Tech Stack:** Plain JavaScript extension core, React, TypeScript, Wouter, Vite.

---

## Files

- Modify: `artifacts/sigil-extension/core.js`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Modify: `artifacts/sigil-extension/popup.html`
- Modify: `artifacts/sigil-extension/popup.js`
- Create: `artifacts/sigil/src/lib/site-reputation.ts`
- Create: `artifacts/sigil/src/lib/site-reputation.test.ts`
- Create: `artifacts/sigil/src/pages/sites.tsx`
- Modify: `artifacts/sigil/src/App.tsx`
- Modify: `artifacts/sigil/src/components/layout/Layout.tsx`
- Modify: `sigil-whitepaper.md`

## Task 1: Extension Core

- [ ] Write failing tests for dangerous, trusted, and clone-like domains.
- [ ] Implement `evaluateSiteReputation`.
- [ ] Integrate site reputation into `localPreScreen`.
- [ ] Re-run `node artifacts/sigil-extension/core.test.cjs`.

## Task 2: Extension Popup

- [ ] Add a compact manual site checker.
- [ ] Render verdict, host, and summary without new permissions.
- [ ] Re-run store-readiness tests.

## Task 3: Web App Checker

- [ ] Add TypeScript site reputation model and focused assertion test.
- [ ] Add `/sites` page and navigation entry.
- [ ] Keep the page standalone and no-wallet.

## Task 4: Verification

- [ ] Run focused model tests.
- [ ] Run extension tests.
- [ ] Run store-readiness tests.
- [ ] Run workspace typecheck and build.
- [ ] Browser-check `/sites`.
- [ ] Update dashboard, commit, and push.
