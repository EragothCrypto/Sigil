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

1. invokes the captured original provider request immediately and exactly once without first reading, destructuring, cloning, validating, or serializing the page-supplied arguments,
2. captures and returns the original provider's exact return value immediately,
3. schedules all observation work as a separate best-effort task after the wrapper has returned, and
4. in that task, creates an observation identifier and a fully detached, bounded snapshot before emitting one advisory observation.

If the original provider throws synchronously, the wrapper rethrows the identical error without attempting observation. If it returns a promise or thenable, the wrapper returns that same object without awaiting, wrapping, or attaching handlers.

Observation is scheduled through an intrinsic captured when the extension script initializes. Scheduler failure, hostile getters/proxies, snapshot failure, event construction failure, and event dispatch failure are all contained inside the advisory path and are silently abandoned. None may replace, delay, resolve, reject, or otherwise alter the provider return.

The snapshot must be created with captured platform intrinsics or explicit primitive-field copying. Passing a transaction, typed-data object, params array, or any nested object from the provider arguments directly into `CustomEvent.detail` is forbidden. Page-controlled getters and proxy traps may run only in the later advisory task, never before the provider invocation or wrapper return.

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
- Result: “Review this alert alongside the request shown by your wallet.”
- Failure: “Sigil could not complete this analysis. Verify the request directly in your wallet.”
- Actions: “Full analysis”, “Dismiss alert”, and “Trust this site”.

The overlay must not contain “Proceed”, “Cancel request”, a second-confirmation gate, or text claiming that Sigil controls the wallet request. Dismissing or trusting a site changes only Sigil's local advisory behavior.

The wallet remains the sole place where the user authorizes or rejects the action. Sigil may still use notification policy and alert sensitivity to decide whether to show an advisory overlay. The extension cannot guarantee that an analysis finishes, or that an alert becomes visible, before a fast user confirms the wallet request.

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

Each observation identifier maps to one local session event that is updated in place rather than appended once per lifecycle transition. New events use this lifecycle:

- `status: "observed"`: accepted but no result has been displayed,
- `status: "reviewed"`: a local, API, or fallback analysis result was displayed,
- `status: "analysis_failed"`: advisory processing failed before a usable result was displayed,
- `dismissedAt`: optional timestamp set when the user closes the panel.

Dismissal is orthogonal to analysis status: a reviewed alert may later be dismissed without losing the fact that its result was displayed. Session summaries count unique observation identifiers, reviewed observations, failed analyses, and alerts dismissed. Reviewed and dismissed counts may intentionally overlap, while the total request count never double-counts one observation. Legacy proceeded/cancelled counts may remain visible for old sessions but must be labelled as legacy extension interactions, not proven wallet outcomes.

Analysis history remains local by default and continues to exclude session history from optional Chrome Sync.

## Error and Lifecycle Handling

- Provider calls do not depend on storage, network, rendering, or analysis success.
- Synchronous and asynchronous provider errors pass through unchanged.
- Argument inspection and snapshot creation occur only after the provider wrapper has returned.
- Every scheduler, snapshot, event-construction, and event-dispatch failure is contained and drops the observation.
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
- “Shows advisory risk alerts for compatible wallet requests.”
- “Best-effort request observation.”

Disallowed:

- “Blocks malicious requests.”
- “Stops dangerous signatures.”
- “Intercepts before your wallet opens.”
- “Prevents a hostile dApp from submitting a request.”
- “Guarantees an alert before wallet confirmation.”

Privacy disclosures must continue to describe the request data sent for analysis. Store permission justifications should explain that all-site content scripts observe compatible wallet-provider calls and show local advisory UI.

## Test-First Verification

Implementation follows red-green-refactor.

### Security regression

A focused executable test loads the main-world observer with a provider stub and proves:

1. the original provider is called exactly once,
2. a forged `sigil:decision` before or after the observation has no effect,
3. the original return value and rejection are preserved,
4. an observation listener cannot mutate provider arguments through `CustomEvent.detail`,
5. hostile getters or proxies are not touched until after the provider invocation and wrapper return,
6. throwing scheduler, snapshot, event-construction, or dispatch APIs cannot alter the provider return or error,
7. the original provider is invoked before any advisory event is dispatched,
8. one advisory observation is emitted for a supported method, and
9. unsupported methods pass through without an advisory event.

The test must fail against the current implementation for the expected reason before production code changes.

### Input-abuse controls

Focused tests cover stale timestamps, duplicate IDs, unsupported methods, malformed targets, oversized payloads, queue saturation, and rate-window exhaustion. Rejected observations must not invoke the Sigil API.

### Migration and UI policy

Tests verify:

- old `protectionMode` values still normalize and sync,
- legacy session decisions remain readable,
- one observation is upserted across lifecycle transitions without double-counting,
- reviewed status and optional dismissal summarize correctly,
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
