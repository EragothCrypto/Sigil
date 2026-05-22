# Address Watchlist Design

## Goal

Build Phase 3's next daily workflow: a lightweight Address Watchlist that lets users track important wallets, vaults, multisigs, and contracts without connecting a wallet or creating an account.

## Product Context

Approval Health Check shows risk for one pasted wallet. Address Watchlist turns that into a repeatable daily workflow: users keep a small local list of important addresses and refresh them when they want a quick security pulse.

## Scope

### In Scope

- New web app page at `/watchlist`.
- Local-only watchlist storage in the browser.
- Manual address, label, network, and address-type entry.
- Duplicate prevention per network/address pair.
- Manual refresh using the existing approval-health API.
- Summary status for clean, review, high-risk, unavailable, and unchecked entries.
- Export/import JSON for portability.
- Dashboard and roadmap documentation updates.

### Out Of Scope For V1

- Wallet connection.
- Server-side accounts or persistent database storage.
- Automatic background monitoring.
- Push notifications.
- Email/SMS alerts.
- Extension wallet detection.

## Design

Use a local-first watchlist model under `artifacts/sigil/src/lib/watchlist.ts`. The model owns address validation, normalization, duplicate handling, import/export safety, and status mapping. The page owns UI state, localStorage, and refresh calls.

The page at `/watchlist` should match the existing Sigil app style: dense, useful, and security-oriented. It should show the add form first, then compact summary counters, then the watchlist rows. Each row should expose scan status, last checked time, quick refresh, Approvals link, and remove.

## Data Flow

1. User opens `/watchlist`.
2. Page loads entries from localStorage.
3. User adds an address with label, type, and network.
4. Entry is normalized and stored locally.
5. User refreshes one entry or all entries.
6. Page calls `/api/sigil/approvals/health`.
7. Entry stores the latest approval summary and coverage status.
8. UI maps that summary into a plain watchlist status.

## Status Rules

- `unchecked`: never refreshed.
- `unavailable`: explorer/API coverage unavailable.
- `high-risk`: critical or high approvals exist.
- `review`: active approvals exist, but no high/critical approval.
- `clean`: scan returned no active approvals.

## Testing

Add a pure assertion test for the watchlist model:

- Normalizes addresses.
- Prevents duplicate network/address entries.
- Safely imports only valid entries.
- Maps approval summaries to watchlist statuses.

Existing verification remains:

- `node artifacts/sigil-extension/core.test.cjs`
- `node artifacts/sigil-extension/store-readiness.test.cjs`
- `node artifacts/sigil-extension/vercel-routing.test.cjs`
- `pnpm run typecheck`
- `pnpm run build`
