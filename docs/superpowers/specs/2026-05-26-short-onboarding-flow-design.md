# Short Onboarding Flow Design

## Goal

Add a compact first-run and `/onboarding` flow that teaches the minimum daily Sigil safety loop in under two minutes.

## Scope

- Explain what approvals are.
- Explain why signatures are risky.
- Explain what Sigil verdict bands mean.
- Explain how to use the Chrome extension.
- Explain how to monitor a wallet.
- Add a lightweight first-run prompt on the homepage.
- Store completion locally in the browser.

## Design

Create a static React page at `/onboarding` with five compact lesson rows and clear next-action links into `/approvals`, `/extension`, `/`, and `/monitor`. The page should feel like part of the security console, not a marketing page.

The homepage shows a small first-run prompt when `sigil:onboarding-complete` is not set. Users can start onboarding or dismiss it. Dismissal and completion only write to localStorage.

## Out Of Scope

- Accounts, email capture, wallet connection, or server-side tracking.
- Extension-side onboarding.
- Blocking use of the scanner until onboarding is complete.

## Verification

- Add a focused regression test that checks the route, nav entry, homepage handoff, required lesson topics, completion key, and key destination links.
- Run typecheck and production build.
- Smoke-check `/onboarding` in the local Vite server.
