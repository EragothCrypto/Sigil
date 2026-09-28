# Advisory Extension Security Design

Date: 2026-09-28  
Status: Approved in conversation; pending written-spec review  
Release gate: EU/DE audit P0 extension finding

## Objective

Replace Sigil's forgeable page-controlled wallet authorization channel with an honest, non-blocking advisory model.

Sigil should help users understand observed wallet-request risk before they confirm an action in their wallet. It must not claim that it can reliably authorize, cancel, block, or delay a hostile dApp's provider request without an authenticated wallet integration.

## Security Invariant

Page-authored data must never control whether the original wallet provider request executes.

A hostile page may emit, suppress, replay, or alter DOM events. None of those actions may change the provider call's arguments, result, call count, or execution path. Sigil's automatic request observation is best-effort telemetry, not proof that a particular wallet action occurred.

## Architecture

### Main-world observer

`inject.js` continues to wrap supported EVM provider request methods so compatible dApp activity can be observed.

For an analyzable request it:

1. creates an observation identifier,
2. emits one advisory observation event containing a bounded copy of the method and analysis target,
3. invokes the captured original provider request immediately and exactly once, and
4. returns the original provider's result or error unchanged.

It does not subscribe to a decision event, wait for analysis, apply a timeout, or expose any `proceed`/`cancel` state.

### Isolated-world advisor

`content.js` treats every main-world observation as untrusted. It validates and bounds the event before using local rules or the Sigil API.

Accepted observations require:

- a supported signing method,
- a correctly shaped fresh identifier and timestamp,
- an expected target type,
- bounded strings, arrays, objects, and serialized payload size,
- an identifier that has not already been processed, and
- available capacity in a small per-tab queue and rate window.

Malformed, stale, duplicate, oversized, or excessive observations are dropped without an API call or user-facing error. Limits must be high enough for ordinary multi-request dApp flows while bounding page-driven overlay spam and API consumption.

No validation can make a DOM event authentic. UI and documentation must therefore describe observations as compatible-provider activity, not verified wallet activity.

## Advisory User Experience

The overlay provides decision support only.

- Loading: “Sigil is checking an observed wallet request.”
- Result: “Review this alert before confirming in your wallet.”
- Failure: “Sigil could not complete this analysis. Verify the request directly in your wallet.”
- Actions: “Full analysis”, “Dismiss alert”, and “Trust this site”.

The overlay must not contain “Proceed”, “Cancel request”, a second-confirmation gate, or text claiming that Sigil controls the wallet request. Dismissing or trusting a site changes only Sigil's local advisory behavior.

The wallet remains the sole place where the user authorizes or rejects the action. Sigil may still use notification policy and alert sensitivity to decide whether to show an advisory overlay.

## Settings Compatibility

The stored `protectionMode` key and its existing values remain temporarily supported to avoid breaking installed extension settings and Chrome Sync.

The popup presents this setting as “Alert Sensitivity”:

- `quiet`: show fewer low-risk advisory alerts,
- `standard`: show normal risk-relevant alerts,
- `strict`: analyze and show more observations.

The enabled toggle becomes “Wallet Request Alerts”. Trusted sites and contracts suppress or reduce Sigil alerts only; they do not bypass or authorize wallet behavior.

Future schema migration may rename the persisted key after an explicit versioned migration. That rename is outside this security fix.

## Session and History Migration

Existing local session events with `proceed` or `cancel` remain readable.

New events use neutral states:

- `observed`: received and recorded without a displayed result,
- `reviewed`: an analysis result was displayed,
- `dismissed`: the user closed the advisory panel.

Session summaries count observed, reviewed, and dismissed requests. Legacy proceeded/cancelled counts may remain visible for old sessions but must be labelled as legacy extension interactions, not proven wallet outcomes.

Analysis history remains local by default and continues to exclude session history from optional Chrome Sync.

## Error and Lifecycle Handling

- Provider calls do not depend on storage, network, rendering, or analysis success.
- Synchronous and asynchronous provider errors pass through unchanged.
- Overlay/API failures cannot reject or resolve the provider request.
- Closing or navigating the page cancels only advisory work.
- Queue cleanup, duplicate-ID expiry, and rate-window cleanup are bounded.
- Disabling alerts prevents advisory processing without changing provider behavior.
- Trusted-site handling records no implied authorization decision.

## Product and Policy Copy

Repository and Chrome Web Store copy must consistently distinguish analysis from enforcement.

Allowed:

- “Understand wallet and transaction risk before you sign.”
- “Reviews compatible wallet requests.”
- “Shows risk alerts before you confirm in your wallet.”
- “Best-effort request observation.”

Disallowed:

- “Blocks malicious requests.”
- “Stops dangerous signatures.”
- “Intercepts before your wallet opens.”
- “Prevents a hostile dApp from submitting a request.”

Privacy disclosures must continue to describe the request data sent for analysis. Store permission justifications should explain that all-site content scripts observe compatible wallet-provider calls and show local advisory UI.

## Test-First Verification

Implementation follows red-green-refactor.

### Security regression

A focused executable test loads the main-world observer with a provider stub and proves:

1. the original provider is called exactly once,
2. a forged `sigil:decision` before or after the observation has no effect,
3. the original return value and rejection are preserved,
4. one advisory observation is emitted for a supported method, and
5. unsupported methods pass through without an advisory event.

The test must fail against the current implementation for the expected reason before production code changes.

### Input-abuse controls

Focused tests cover stale timestamps, duplicate IDs, unsupported methods, malformed targets, oversized payloads, queue saturation, and rate-window exhaustion. Rejected observations must not invoke the Sigil API.

### Migration and UI policy

Tests verify:

- old `protectionMode` values still normalize and sync,
- legacy session decisions remain readable,
- new neutral session states summarize correctly,
- extension sources no longer contain the decision event or provider gating,
- runtime UI contains no proceed/cancel authorization controls, and
- analysis/session history remains local by default.

### Regression checks

Run all extension Node tests, JavaScript syntax checks, workspace typecheck/build when dependencies are available, extension package inspection, and a manual Chrome test with MetaMask or Rabby plus an adversarial dApp fixture.

## Release Acceptance

The P0 extension finding can be closed only when:

- the original forged-decision proof no longer influences provider behavior,
- legitimate supported and unsupported provider calls preserve their behavior,
- the advisory event-abuse limits are verified,
- UI, website, store copy, privacy text, and permission justification use the advisory model,
- focused and existing extension tests pass, and
- the packaged extension receives manual browser verification.

Passing this gate removes the architecture-related `NO_GO`. The overall EU/DE release decision remains gated by the other items in `.compliance/RELEASE_CHECKLIST.md`.

## Out of Scope

- Wallet-specific authenticated blocking.
- MetaMask Snaps, WalletConnect, or embedded-wallet integration.
- Transaction execution, custody, or key access.
- Account, subscription, or monetization changes.
- Renaming the persisted settings schema.
