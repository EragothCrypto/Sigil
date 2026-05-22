# Copy/Paste Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit paste analyzer to the Chrome extension popup.

**Architecture:** Add a pure classifier in extension core, then wire popup UI to classify locally and optionally call existing Sigil API endpoints.

**Tech Stack:** Chrome extension MV3, plain JavaScript, existing Sigil API.

---

## Files

- Modify: `artifacts/sigil-extension/core.js`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Modify: `artifacts/sigil-extension/popup.html`
- Modify: `artifacts/sigil-extension/popup.js`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs`
- Modify: `sigil-whitepaper.md`

## Task 1: Core Classifier

- [ ] Write failing tests for address, hash, approval calldata, generic calldata, URL, typed data, and unknown input.
- [ ] Implement `classifyPastedInput()`.
- [ ] Re-run core tests until green.

## Task 2: Popup UX

- [ ] Add paste analyzer textarea and result panel.
- [ ] Add Analyze button that calls the correct API endpoint by classification.
- [ ] Show loading, success, error, and local-only URL states.
- [ ] Keep no passive clipboard access and no new permissions.

## Task 3: Verification

- [ ] Run extension tests.
- [ ] Run store-readiness tests.
- [ ] Run Vercel routing tests.
- [ ] Run workspace typecheck and build.
- [ ] Repack extension ZIP and SHA256.
- [ ] Commit and push.
