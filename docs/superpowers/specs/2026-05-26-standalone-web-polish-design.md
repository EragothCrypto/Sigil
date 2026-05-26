# Standalone Web App Polish Design

## Goal

Make the live Sigil web app feel like one coherent security console for Chrome Web Store users.

## Scope

- Tighten homepage CTA paths toward scanning, extension install, wallet monitoring, approvals, and watchlist.
- Improve `/extension`, `/approvals`, `/monitor`, and `/watchlist` with clearer next actions.
- Unify empty-state language around local-first safety and daily crypto workflows.
- Make "install extension" and "monitor wallet" obvious from the main app.
- Reduce copy friction without changing backend behavior.

## Design

Keep the existing dark console visual system and avoid a redesign. Add compact action surfaces where users naturally decide what to do next:

- Homepage: add a "Start with Sigil" action grid after the primary scanner.
- Approvals: add a wallet-monitor handoff and a save-to-monitor direction.
- Wallet Monitor: add clear links to extension install and approval cleanup.
- Watchlist: position it as the lightweight local companion to Wallet Monitor.
- Extension: keep Chrome Web Store as primary install path and ZIP as fallback.

## Out Of Scope

- Authentication.
- Billing.
- New API endpoints.
- Major layout redesign.
- Installed Chrome Web Store extension automation.

## Verification

- Typecheck.
- Production build.
- Existing extension routing/store-readiness tests.
