# Wallet Monitor V1 Plan

## Goal

Build Phase 4's first Sigil Wallet Monitor slice in the standalone web app.

## Tasks

### 1. Add Tested Monitor Model

- Create `artifacts/sigil/src/lib/wallet-monitor.test.ts`.
- Add tests for hygiene score, summary counts, and fix-first checklist ordering.
- Create `artifacts/sigil/src/lib/wallet-monitor.ts`.

### 2. Build Web Page

- Create `artifacts/sigil/src/pages/wallet-monitor.tsx`.
- Reuse watchlist storage and approval-health refresh behavior.
- Add add-wallet, refresh-one, refresh-all, remove, and deep links to approval cleanup.

### 3. Route And Navigation

- Add `/monitor` route.
- Add Monitor to the app navigation.

### 4. Roadmap And Dashboard

- Update Phase 4 roadmap status to show Wallet Monitor v1 started.
- Update MCP dashboard Phase 4 as in progress.

### 5. Verification

- Run focused wallet monitor test.
- Run existing watchlist/site tests.
- Run workspace typecheck.
- Run production build.
