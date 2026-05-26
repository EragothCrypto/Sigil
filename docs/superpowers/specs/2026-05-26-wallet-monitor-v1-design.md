# Wallet Monitor V1 Design

## Goal

Start Phase 4 with a lightweight Sigil Wallet Monitor inside the standalone web app.

The first version should reuse the proven Approval Health Check and Address Watchlist foundations instead of introducing accounts, payments, wallet connection, or a new backend persistence layer too early.

## Scope

### In Scope

- New `/monitor` web app page.
- Public wallet input using the same EVM networks as Approval Health Check.
- Local saved monitored wallets using the existing watchlist storage model.
- One-click refresh through `/api/sigil/approvals/health`.
- Wallet hygiene score based on active approvals, unlimited approvals, high-risk approvals, stale/unavailable coverage, and unchecked wallets.
- "Fix this first" checklist that prioritizes high-risk approvals, unlimited approvals, unchecked wallets, and coverage issues.
- Clear premium positioning for Sigil Wallet Monitor without blocking the local v1 behind auth.

### Out Of Scope For V1

- Paid account enforcement.
- Wallet connect.
- Push/email alerts.
- Dedicated allowance provider.
- Full scam-interaction history beyond approval-health-derived exposure.
- Backend user profiles.

## Design

Create a pure `wallet-monitor` model in `artifacts/sigil/src/lib` that converts locally saved watchlist entries into a monitor report. The report is deterministic and testable: counts, hygiene score, risk status, and ordered checklist items.

The `/monitor` page uses this model and the existing `/api/sigil/approvals/health` endpoint. Adding a wallet creates a local watchlist entry. Refreshing a wallet updates its approval summary and status. The page presents the premium direction while remaining useful as a standalone local tool.

## Testing

- A high-risk wallet produces a lower hygiene score and high-priority checklist items.
- Clean wallets improve the hygiene score.
- Unchecked and unavailable wallets produce appropriate checklist actions.
- Existing typecheck and production build pass.
