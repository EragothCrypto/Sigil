# Advisory Extension Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Sigil's forgeable page-controlled wallet decision channel with a truthful, bounded, non-blocking advisory observer while preserving provider behavior, installed settings, local history, and useful risk alerts.

**Architecture:** The MAIN-world wrapper calls the original provider first and returns its exact result without awaiting or gating. A contained post-return task emits a detached observation snapshot; the isolated content script validates that untrusted observation through a pure stateful gate before analysis or UI. Overlay, sessions, popup, website, and store copy then use advisory language and neutral lifecycle states.

**Tech Stack:** Chrome Manifest V3, plain JavaScript, Node.js built-in test runner, `vm` test harness, React/Vite marketing pages, Markdown release documentation.

**Design reference:** `docs/superpowers/specs/2026-09-28-advisory-extension-security-design.md`

**Dashboard execution note:** Update only Sigil task `62bfed8a-4a91-4486-9e97-e6368a777856` (“Release Follow-Through & EU/DE Compliance Gate”) when this phase changes state.

---

## File Map

- Create `artifacts/sigil-extension/inject-advisory.test.cjs` for executable provider-preservation and forged-event regression tests.
- Create `artifacts/sigil-extension/content-intake.test.cjs` for executable rejected-observation side-effect tests.
- Create `artifacts/sigil-extension/content-advisory.test.cjs` for queue, auto-close, and stale-async-completion tests.
- Modify `artifacts/sigil-extension/inject.js` for exact provider forwarding plus detached post-return observations.
- Modify `artifacts/sigil-extension/core.js` and `core.test.cjs` for observation validation, display policy, and session lifecycle.
- Modify `artifacts/sigil-extension/content.js` for bounded intake and advisory-only UI.
- Modify `artifacts/sigil-extension/store-readiness.test.cjs` for package-policy assertions.
- Modify `artifacts/sigil-extension/popup.html`, `popup.js`, and `background.js` for advisory settings and metrics.
- Modify `artifacts/sigil-extension/manifest.json`, `docs/chrome-web-store-submission.md`, and `docs/production-qa-matrix.md` for truthful release metadata.
- Modify `artifacts/sigil/src/pages/extension.tsx`, `home.tsx`, `approvals.tsx`, `wallet-monitor.tsx`, and `legal.tsx` to remove enforcement and timing guarantees.
- Modify `sigil-whitepaper.md` to replace the legacy blocking/interception architecture and roadmap claims.
- Update the existing `.compliance` audit files only after the security patch is integrated with the separate audit changes.
- Create `artifacts/release/sigil-chrome-extension-v1.0.3.zip` and `.sha256.txt`, then replace `artifacts/sigil/public/sigil-extension.zip`.
- Create `scripts/package-sigil-extension.ps1` for deterministic, allowlisted extension packaging.

## Fixed Observation Limits

Use one exported constant so tests and runtime share these values:

~~~js
const OBSERVATION_LIMITS = Object.freeze({
  maxAgeMs: 30_000,
  maxFutureSkewMs: 5_000,
  maxSerializedTargetBytes: 65_536,
  maxQueued: 8,
  maxAcceptedPerWindow: 12,
  rateWindowMs: 60_000,
  seenTtlMs: 120_000,
  maxSeenIds: 128,
});
~~~

Accept only UUID v4 IDs and the eight existing EVM signing methods. Changing a limit requires a matching boundary test and a reason in the commit message.

## Observation Event Contract

Tasks 1-3 share exactly this contract:

~~~js
const SIGIL_OBSERVATION_EVENT = "sigil:observation";

{
  version: 1,
  observationId: "uuid-v4",
  method: "eth_sendTransaction",
  observedAt: 1_780_000_000_000,
  target: {
    type: "transaction",
    data: { /* detached JSON-compatible request snapshot */ }
  }
}
~~~

There is no `requestId` and no response event. `inject.js` and `core.js` cannot share runtime code because they execute in different worlds, so both enforce the same constants and target schema. `store-readiness.test.cjs` compares their declared numeric limits and event-name literals to prevent drift.

Snapshot and gate validation reject rather than truncate when any bound is exceeded:

- maximum depth: 8;
- maximum aggregate nodes: 512;
- maximum keys on one object: 64;
- maximum array length: 128;
- maximum string length: 32,768 UTF-16 code units;
- maximum final JSON serialization: 65,536 bytes;
- allowed leaves: null, boolean, finite number, and string;
- forbidden: undefined, bigint, symbol, function, accessor property, cycle, non-plain object, and symbol key.

Allowed target shapes are exact:

- `transaction`: `data` is a plain JSON object; no `from` sibling;
- `raw_sign` and `personal_sign`: `data` and `from` are strings;
- `typed_data`: `data` is a string, plain JSON object, or v1 plain JSON array and `from` is an address string.

Outer target keys are limited to `type`, `data`, and the method-appropriate `from`. The target type must match the provider method.

Use this complete method extraction matrix:

| Method | Target type | Data | From |
| --- | --- | --- | --- |
| `eth_sendTransaction` | `transaction` | `params[0]` plain object | none |
| `eth_signTransaction` | `transaction` | `params[0]` plain object | none |
| `eth_sign` | `raw_sign` | `params[1]` string | `params[0]` address |
| `personal_sign` | `personal_sign` | `params[0]` string | `params[1]` address |
| `eth_signTypedData` | `typed_data` | non-address parameter | address parameter |
| `eth_signTypedData_v1` | `typed_data` | non-address parameter, including v1 array | address parameter |
| `eth_signTypedData_v3` | `typed_data` | non-address string/object parameter | address parameter |
| `eth_signTypedData_v4` | `typed_data` | non-address string/object parameter | address parameter |

For typed-data methods, exactly one of the first two params must be an EVM address and the other is the payload. Reject ambiguous or missing address/payload pairs. This supports both historical parameter orders without guessing.

### Task 1: Make Provider Execution Independent From Page Decisions

**Files:**
- Create: `artifacts/sigil-extension/inject-advisory.test.cjs`
- Modify: `artifacts/sigil-extension/inject.js:1-105`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs:95-108`

- [ ] **Step 1: Write the failing provider-preservation tests**

Create a `node:test` and `vm` harness that executes the real injector with a fake `window.ethereum`. Cover:

- forged `sigil:decision` events cannot change execution;
- the provider is called exactly once;
- exact promise/thenable identity is returned;
- an identical synchronous error is rethrown;
- provider receiver and every wrapper argument are preserved;
- provider invocation occurs before advisory dispatch;
- unsupported methods create no observation;
- nested event details share no references with provider arguments;
- hostile getters/proxies are untouched until the queued task;
- a timer that invokes synchronously produces no observation;
- throwing timer, snapshot, `CustomEvent`, or `dispatchEvent` APIs cannot change the provider result.
- all eight methods produce exactly the matrix-defined detached target, including the v1 array payload and both typed-data address positions.

Representative assertion:

~~~js
const result = provider.request(request);
window.dispatchEvent(new FakeCustomEvent("sigil:decision", {
  detail: { observationId: crypto.randomUUID(), action: "cancel" },
}));
assert.strictEqual(result, providerResult);
assert.equal(provider.calls.length, 1);
timers.flush();
assert.equal(observations.length, 1);
~~~

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test artifacts/sigil-extension/inject-advisory.test.cjs`

Expected: FAIL because the current async wrapper waits for a page-authored decision and changes the returned promise.

- [ ] **Step 3: Implement the minimal observer**

At injector initialization capture the invocation, timer, object-inspection, JSON, UTF-8 byte-counting (`TextEncoder`), event-construction, and dispatch intrinsics under the manifest's `document_start` precondition. Keep the original provider method unbound.

Replace it with a non-async function that:

1. invokes the original exactly once with the provider receiver and complete argument list before inspecting page arguments;
2. captures the exact result or rethrows the identical synchronous error;
3. schedules a contained advisory callback;
4. drops a callback invoked synchronously through a wrapper-local returned guard;
5. builds the exact `sigil:observation` v1 contract only in the later task;
6. rejects snapshots that violate the fixed deep bounds before dispatch;
7. obtains UUID v4 from the captured native `crypto.randomUUID` and drops observation if unavailable;
8. emits only detached JSON-compatible detail; and
9. returns the original result without awaiting or attaching handlers.

Remove the `sigil:decision` listener, Proceed/Cancel branches, and timeout.

- [ ] **Step 4: Replace the old package assertion**

Assert the runtime has no `sigil:decision` or async provider wrapper, while the manifest retains `run_at: "document_start"` and `world: "MAIN"`.

- [ ] **Step 5: Verify GREEN**

Run:

~~~powershell
node --test artifacts/sigil-extension/inject-advisory.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
node --check artifacts/sigil-extension/inject.js
~~~

Expected: all tests pass and syntax check is silent.

- [ ] **Step 6: Commit**

~~~bash
git add artifacts/sigil-extension/inject.js artifacts/sigil-extension/inject-advisory.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
git commit -m "fix(extension): remove page-controlled wallet decisions"
~~~

### Task 2: Validate and Bound Untrusted Observations

**Files:**
- Modify: `artifacts/sigil-extension/core.js:1-110,450-590,693-710`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Create: `artifacts/sigil-extension/content-intake.test.cjs`
- Modify: `artifacts/sigil-extension/content.js:1-45,319-336`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs`

- [ ] **Step 1: Write failing pure-gate tests**

Design `core.createObservationGate({ now })` and test:

~~~js
const gate = core.createObservationGate({ now: () => 1_000_000 });
assert.equal(gate.accept(validObservation(), { queueLength: 0 }).accepted, true);
assert.equal(gate.accept(validObservation(), { queueLength: 0 }).reason, "duplicate");
~~~

Cover unsupported methods, invalid UUIDs, event-version mismatch, extra top-level event or target keys, stale/future timestamps, method/target mismatch, every exact target shape, the v1 typed-data array, accessor and symbol keys, cycles, non-plain objects, non-finite numbers, each depth/node/key/array/string boundary, ASCII and multibyte UTF-8 cases immediately below/at/above 65,536 serialized bytes, queue length eight, the thirteenth event per minute, window expiry, seen-ID TTL, and the 128-entry cap.

- [ ] **Step 2: Run and verify RED**

Run: `node --test artifacts/sigil-extension/core.test.cjs`

Expected: FAIL because the gate and limits do not exist.

- [ ] **Step 3: Implement the pure gate**

Export `OBSERVATION_LIMITS` and:

~~~js
function createObservationGate({ now = () => Date.now() } = {}) {
  const seen = new Map();
  const acceptedAt = [];
  return {
    accept(detail, { queueLength = 0 } = {}) {
      // prune, validate, record, return { accepted, reason, observation }
    },
  };
}
~~~

Return a normalized object only after every check succeeds. Never truncate or reinterpret malformed data into an accepted observation.

- [ ] **Step 4: Gate before every content-script side effect**

In `content.js`, listen only for `sigil:observation`. Call the gate before queueing, storage, rendering, or API work. Push only `decision.observation`, never raw `event.detail`.

- [ ] **Step 5: Write and run an executable rejected-intake test**

Create a `vm` harness for the real `content.js` with fake `window`, `chrome.storage`, `fetch`, and a document stub that records access. Dispatch invalid UUID, stale, oversized, duplicate, queue-saturated, and rate-saturated observations.

Assert each rejected event performs zero storage reads/writes, zero fetches, zero DOM/render access, and adds no queued work. Include one accepted control that reaches the expected first storage/settings read so the harness proves the listener is active.

Also retain source assertions that `observationGate.accept` appears before `requestQueue.push` and raw event details are not queued.

Run:

~~~powershell
node --test artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/content-intake.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
node --check artifacts/sigil-extension/core.js
node --check artifacts/sigil-extension/content.js
~~~

Expected: all pass.

- [ ] **Step 6: Commit**

~~~bash
git add artifacts/sigil-extension/core.js artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/content.js artifacts/sigil-extension/content-intake.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
git commit -m "fix(extension): bound untrusted request observations"
~~~

### Task 3: Convert Overlay and Sessions to Advisory Lifecycle

**Files:**
- Modify: `artifacts/sigil-extension/core.js:450-690`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Modify: `artifacts/sigil-extension/content.js:15-336`
- Create: `artifacts/sigil-extension/content-advisory.test.cjs`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs`

- [ ] **Step 1: Write failing display and lifecycle tests**

Change pre-screen expectations from authorization actions to `display: "skip"|"show"`. Test one session event per observation ID:

~~~js
const observed = core.createSessionEvent({ observationId: id, status: "observed", ...base });
const reviewed = core.createSessionEvent({ observationId: id, status: "reviewed", ...base });
const sessions = core.recordSessionEvent(core.recordSessionEvent([], observed, 12), reviewed, 12);
assert.equal(sessions[0].events.length, 1);
assert.equal(sessions[0].summary.reviewed, 1);
~~~

Verify `dismissedAt` is orthogonal, totals remain unique, `analysis_failed` is counted, and legacy Proceed/Cancel records remain readable under legacy counters.

- [ ] **Step 2: Run and verify RED**

Run: `node --test artifacts/sigil-extension/core.test.cjs`

Expected: FAIL on the new display and session contract.

- [ ] **Step 3: Implement the neutral core model**

- Replace `action: "proceed"|"show"` with `display: "skip"|"show"`.
- Remove `requiresSecondConfirm`.
- Add `observationId`, `status`, and optional `dismissedAt`.
- Upsert by observation ID.
- Summarize observed, reviewed, analysisFailed, dismissed, legacyProceeded, and legacyCancelled.

- [ ] **Step 4: Rewrite content lifecycle**

- Replace `finish(action)` with advisory-only close/update handling.
- Remove decision dispatch, second confirmation, Proceed, and Cancel controls.
- Render Full analysis, Dismiss alert, and Trust this site.
- Record observed once, then upsert reviewed or analysis-failed status.
- Preserve reviewed status when setting `dismissedAt`.
- Treat a usable API-error fallback as reviewed.
- Add a bounded 45-second auto-close so an ignored panel cannot stall the queue.
- Ensure disabled, trusted, and quiet paths never imply wallet authorization.

Every active observation receives an isolated lifecycle token in addition to its observation ID. Render, API, storage-update, dismiss, trust-site, error, and auto-close callbacks capture both values and begin with an active-token check. `finishAdvisory` clears the matching timer, invalidates the token before advancing the queue, and becomes a no-op for stale tokens. An API or storage continuation that resolves after auto-close or queue advancement must not render, persist, dismiss, or clear the next observation.

- [ ] **Step 5: Write the failing stale-completion lifecycle test**

Use a `vm` harness with controllable timers, deferred fetch/storage promises, and two accepted observations. Auto-close the first, start the second, then resolve the first request's deferred work.

Assert the late first completion performs no render or write, does not clear the second observation, and cannot cancel the second observation's timer. Assert manual close and auto-close each advance exactly once.

- [ ] **Step 6: Strengthen source-policy tests**

Reject `sigil:decision`, “Cancel request”, a Proceed button, blocked-request errors, and security-check timeout text. Assert advisory controls and copy exist.

- [ ] **Step 7: Verify GREEN**

Run:

~~~powershell
node --test artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/inject-advisory.test.cjs artifacts/sigil-extension/content-intake.test.cjs artifacts/sigil-extension/content-advisory.test.cjs artifacts/sigil-extension/store-readiness.test.cjs artifacts/sigil-extension/vercel-routing.test.cjs
node --check artifacts/sigil-extension/core.js
node --check artifacts/sigil-extension/content.js
~~~

Expected: all pass.

- [ ] **Step 8: Commit**

~~~bash
git add artifacts/sigil-extension/core.js artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/content.js artifacts/sigil-extension/content-advisory.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
git commit -m "feat(extension): present wallet requests as advisory alerts"
~~~

### Task 4: Rename Settings and Popup Metrics Without Breaking Sync

**Files:**
- Modify: `artifacts/sigil-extension/popup.html:485-570`
- Modify: `artifacts/sigil-extension/popup.js:130-260,380-408`
- Modify: `artifacts/sigil-extension/background.js:8-33`
- Modify: `artifacts/sigil-extension/core.test.cjs`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs`

- [ ] **Step 1: Add failing compatibility and copy tests**

Retain and test `protectionMode` with Quiet/Standard/Strict in normalization and sync payloads. Add source assertions for “Wallet Request Alerts”, “Alert Sensitivity”, and legacy-session labels. Reject “Transaction Guard”, “Guard enabled”, and interception-before-wallet claims.

- [ ] **Step 2: Run and verify RED**

Run: `node --test artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/store-readiness.test.cjs`

Expected: FAIL on old popup copy.

- [ ] **Step 3: Update UI language**

- Enabled control: “Wallet Request Alerts”.
- Protection Mode: “Alert Sensitivity”.
- Quiet/Standard/Strict: fewer/normal/more advisory checks.
- New metrics: reviewed, dismissed, failed.
- Old values: “Legacy extension actions”.
- Toasts: request alerts enabled/paused and alert sensitivity updated.
- Preserve DOM IDs and stored keys.

- [ ] **Step 4: Verify and commit**

Run:

~~~powershell
node --test artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
node --check artifacts/sigil-extension/popup.js
node --check artifacts/sigil-extension/background.js
~~~

Expected: all pass.

~~~bash
git add artifacts/sigil-extension/popup.html artifacts/sigil-extension/popup.js artifacts/sigil-extension/background.js artifacts/sigil-extension/core.test.cjs artifacts/sigil-extension/store-readiness.test.cjs
git commit -m "feat(extension): rename protection controls for advisory mode"
~~~

### Task 5: Align Manifest, Website, Store, and Privacy Copy

**Files:**
- Modify: `artifacts/sigil-extension/manifest.json:1-44`
- Modify: `docs/chrome-web-store-submission.md:20-125`
- Modify: `docs/production-qa-matrix.md:35-55`
- Modify: `artifacts/sigil/src/pages/extension.tsx:40-205`
- Modify: `artifacts/sigil/src/pages/home.tsx:30-85,330-345`
- Modify: `artifacts/sigil/src/pages/approvals.tsx:325-335`
- Modify: `artifacts/sigil/src/pages/wallet-monitor.tsx:288-298`
- Modify: `artifacts/sigil/src/pages/legal.tsx`
- Modify: `sigil-whitepaper.md:314-321,658-662,759-814`
- Modify: `artifacts/sigil-extension/store-readiness.test.cjs`

- [ ] **Step 1: Add failing forbidden-claim tests**

Scan the entire tracked repository, excluding historical plans/specs and the compliance finding evidence, for current enforcement and guaranteed-timing claims. Keep the core “Understand wallet and transaction risk before you sign” positioning, but reject claims that Sigil blocks, stops, authorizes, cancels, or guarantees alert timing. Include `sigil-whitepaper.md` and its architecture, use-case, pricing, and Phase 2 sections.

- [ ] **Step 2: Run and verify RED**

Run: `node --test artifacts/sigil-extension/store-readiness.test.cjs`

Expected: FAIL on current manifest, popup, and submission copy.

- [ ] **Step 3: Update metadata**

Increment manifest `1.0.2` to `1.0.3`. Describe best-effort compatible-provider observation and advisory analysis. Keep permissions unchanged.

- [ ] **Step 4: Update website and store copy**

Use:

- “Reviews compatible wallet requests.”
- “Shows advisory risk alerts while you evaluate requests in your wallet.”
- “The wallet remains the only place that approves or rejects an action.”
- “Automatic observation is best-effort and can be bypassed or suppressed by a hostile page.”

Update all-sites permission justification without claiming authenticated interception. Preserve data-use disclosures.

**Hard dependency before this edit:** stop Task 5 until the owner of the main checkout has reviewed and committed the current EU/DE audit changes as one dedicated commit. The owner records that SHA in the task notes. From a clean advisory worktree run `git rebase <audit-commit-sha>`, resolve only the overlapping copy files, then compare each resolved file with both parents using `git diff <audit-commit-sha>^ <audit-commit-sha> -- <path>` and `git diff b734417..HEAD -- <path>`. Never drop private-history, retention, vendor, operator, log-minimization, SECURITY, or `.compliance` changes. If the owner cannot create that reviewed commit, Task 5 is blocked; do not use stash files, shell copy, or a guessed patch.

- [ ] **Step 5: Update production QA**

Replace Proceed/Cancel/timeout checks with provider-result preservation, forged-event immunity, abuse-boundary handling, advisory UI, trusted-site behavior, queue auto-close, local history, session summary, and disclosure that confirmation may occur before analysis finishes.

- [ ] **Step 6: Verify**

Run:

~~~powershell
node --test artifacts/sigil-extension/*.test.cjs
pnpm run typecheck
pnpm --filter @workspace/sigil run build
git diff --check
~~~

Expected: all pass. If dependency TLS is unavailable, stop as blocked instead of disabling TLS verification.

- [ ] **Step 7: Commit**

~~~bash
git add artifacts/sigil-extension/manifest.json artifacts/sigil-extension/store-readiness.test.cjs docs/chrome-web-store-submission.md docs/production-qa-matrix.md sigil-whitepaper.md artifacts/sigil/src/pages/extension.tsx artifacts/sigil/src/pages/home.tsx artifacts/sigil/src/pages/approvals.tsx artifacts/sigil/src/pages/wallet-monitor.tsx artifacts/sigil/src/pages/legal.tsx
git commit -m "docs(extension): align product claims with advisory model"
~~~

### Task 6: Adversarial Verification, Packaging, and Audit Gate

**Files:**
- Modify after audit integration: `.compliance/SECURITY_HARDENING.md`, `RELEASE_CHECKLIST.md`, `AUDIT_STATE.md`, `COMPLIANCE_AUDIT.md`
- Create: `scripts/package-sigil-extension.ps1`
- Create: `artifacts/release/sigil-chrome-extension-v1.0.3.zip`
- Create: `artifacts/release/sigil-chrome-extension-v1.0.3.sha256.txt`
- Replace: `artifacts/sigil/public/sigil-extension.zip`
- Regenerate: final extension ZIP using the new deterministic packaging script

- [ ] **Step 1: Re-run malicious classes**

Test copied request IDs and forged decisions, synchronous mutation, nested detail mutation, hostile getters/proxies, synchronous/throwing timer, throwing event APIs, duplicate/stale/oversized observations, queue saturation, and rate saturation.

Expected: provider call, result, error, receiver, and arguments remain unchanged; rejected observations cause no API work.

- [ ] **Step 2: Run legitimate controls**

Verify transaction, personal-sign, typed-data, and approval calls invoke the wallet once; unsupported methods pass through; safe/caution/dangerous/API-failure/trusted/disabled/Quiet/Standard/Strict flows remain useful; legacy and new sessions render without data loss.

- [ ] **Step 3: Run the full suite**

~~~powershell
node --test artifacts/sigil-extension/*.test.cjs
Get-ChildItem artifacts/sigil-extension/*.js | ForEach-Object { node --check $_.FullName }
pnpm run typecheck
pnpm -r --if-present run test
pnpm --filter @workspace/sigil run build
pnpm audit --prod
git diff --check
~~~

Expected: all applicable checks pass. Record unavailable checks verbatim and do not call the finding fixed while a relevant gate is unavailable.

- [ ] **Step 4: Perform manual Chrome QA**

Load the unpacked extension in a clean profile with MetaMask or Rabby and a controlled adversarial fixture. Confirm the wallet is authoritative, Sigil never delays/resolves the request, alerts are understandable, and consoles are clean.

- [ ] **Step 5: Package and inspect version 1.0.3**

Create `scripts/package-sigil-extension.ps1` and run it from the repository root. The script uses `System.IO.Compression.ZipArchive` directly, creates entries in the allowlist order below, assigns every entry the fixed UTC timestamp `1980-01-01T00:00:00Z`, uses optimal Deflate compression, writes through `FileMode.Create`, copies the exact bytes to the public ZIP, and writes the lowercase SHA-256 file.

~~~powershell
& ./scripts/package-sigil-extension.ps1
$first = (Get-FileHash -Algorithm SHA256 artifacts/release/sigil-chrome-extension-v1.0.3.zip).Hash
& ./scripts/package-sigil-extension.ps1
$second = (Get-FileHash -Algorithm SHA256 artifacts/release/sigil-chrome-extension-v1.0.3.zip).Hash
if ($first -ne $second) { throw "Extension package is not reproducible" }
if ((Get-FileHash artifacts/sigil/public/sigil-extension.zip).Hash -ne $second) {
  throw "Public and versioned extension ZIPs differ"
}
tar -tf artifacts/release/sigil-chrome-extension-v1.0.3.zip
~~~

The ZIP inclusion list must be exactly:

~~~text
manifest.json
background.js
content.js
core.js
inject.js
popup.html
popup.js
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
~~~

Confirm tests, source maps, secrets, development files, remote code, and obsolete decision-channel code are absent. Confirm `artifacts/sigil/public/sigil-extension.zip` has the same SHA-256 as the versioned ZIP.

- [ ] **Step 6: Update audit and dashboard**

After every technical gate passes, mark only the forgeable-decision P0 as remediated and link exact evidence. Keep overall `NO_GO` until legal operator, provider transfer/training, CRA, accessibility, deployment, and production-verification gates pass. Update only the phase-level MCP dashboard task.

- [ ] **Step 7: Request reviews and commit**

Use `codex-security:verify-fix` against the original high finding and `superpowers:requesting-code-review` on the complete branch diff.

~~~bash
git add .compliance scripts/package-sigil-extension.ps1 artifacts/release/sigil-chrome-extension-v1.0.3.zip artifacts/release/sigil-chrome-extension-v1.0.3.sha256.txt artifacts/sigil/public/sigil-extension.zip
git commit -m "docs(compliance): record advisory extension verification"
~~~

Task 6 depends on Tasks 1-5, the audit-change transfer, successful focused and workspace verification, and manual browser QA. Do not push or submit the Chrome Store update until both reviews and all required release checks pass.
