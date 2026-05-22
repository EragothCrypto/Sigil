# Address Watchlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Address Watchlist page that lets users track important addresses and manually refresh approval-health status.

**Architecture:** Add a pure watchlist model for validation, normalization, duplicate prevention, import/export, and status mapping. Add a React page that persists entries in localStorage and calls the existing approval-health API for manual refresh.

**Tech Stack:** TypeScript, React, Wouter, Vite, localStorage, existing Sigil Express API.

---

## Files

- Create: `artifacts/sigil/src/lib/watchlist.ts`
- Create: `artifacts/sigil/src/lib/watchlist.test.ts`
- Create: `artifacts/sigil/src/pages/watchlist.tsx`
- Modify: `artifacts/sigil/src/App.tsx`
- Modify: `artifacts/sigil/src/components/layout/Layout.tsx`
- Modify: `sigil-whitepaper.md`
- Modify: `docs/superpowers/specs/2026-05-22-address-watchlist-design.md`

## Task 1: Watchlist Model

- [ ] Write failing assertion test for normalization, duplicate prevention, safe import, and status mapping.
- [ ] Run the test through esbuild and Node; expect missing module failure first.
- [ ] Implement `watchlist.ts`.
- [ ] Re-run the focused test until green.

## Task 2: Watchlist Page

- [ ] Add `/watchlist` page with add form, summary counters, row list, import/export, refresh one, refresh all, and remove.
- [ ] Persist entries to `localStorage`.
- [ ] Use `/api/sigil/approvals/health` for status refresh.
- [ ] Keep the UI local-first and honest about unavailable coverage.

## Task 3: App Wiring And Docs

- [ ] Add route and navigation entry.
- [ ] Mark Address Watchlist as delivered in the roadmap.
- [ ] Update project dashboard Phase 3 description.

## Task 4: Verification

- [ ] Run focused watchlist test.
- [ ] Run extension tests.
- [ ] Run workspace typecheck.
- [ ] Run workspace build.
- [ ] Browser-check `/watchlist`.
- [ ] Commit and push.
