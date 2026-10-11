# Sigil vNext P00 Baseline Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with test-driven-development and independent review. Steps use checkbox syntax for tracking.

**Goal:** Start the approved first phase (P00) with a reproducible engineering baseline and honest release evidence, without claiming public readiness.

**Architecture:** Preserve existing advisory extension, findings-v2, UUID history and bounded read-only checks. Add isolated generated-output drift verification and secretless CI around existing checks. Correct only unsupported current product claims; consolidate inherited gates without changing audit finding counts or NO_GO.

**Tech Stack:** Existing Node 24, pnpm 10, TypeScript, Node test runner, Orval, GitHub Actions, PowerShell packaging.

**Scope approval:** User approved the comprehensive roadmap and asked to start Phase 1. This means first chronological phase P00, not skipping the baseline to P01. Reuse the current checkout on `codex/vnext-p00-baseline` so the uncommitted approved roadmap remains available. No production writes/deletion, paid inference, credentials, Store submission or hosting change.

## Task 1: Gate Evidence Ledger and Diagnostic Triage

Files: new `.compliance/VNEXT_P00_BASELINE.md`; update `.planning/STATE.md`, `.planning/ROADMAP.md`, `.compliance/RELEASE_CHECKLIST.md`, `docs/production-qa-matrix.md` only for current pointers/version correction.

- [ ] Map G01-G12 to authoritative existing evidence, accountable owner, next exact acceptance and open status. Preserve historical evidence and NO_GO; do not equate operator attestation, mocks, ZIP presence or file existence with rollout.
- [ ] Record exact Aave/Euler hashes, block and two Euler emitter diagnostics. Source investigation may use public primary evidence; if unavailable, preserve the gap and name the missing sanitized ABI/proxy provenance. Never loosen acceptance to manufacture availability.
- [ ] Identify URL deprecation / pg SSL warning ownership from installed dependency source. Do not rewrite real connection URLs or weaken TLS; document minimal safe follow-through and blocked reproduction.
- [ ] Triage installed dependency inventory and previous advisory counts versus fresh audit results; do not overwrite earlier snapshots or infer deployed absence from prod filtering. CI/dependency supply-chain checks are not legal asset clearance.

## Task 2: Explicit Isolated Codegen Drift Check

Files: new `scripts/codegen-drift.mjs`, `scripts/codegen-drift.test.mjs`; modify `scripts/check-codegen.mjs`.

- [ ] Add failing Node tests for missing/extra/changed generated files, nested paths, CRLF equivalence and exact temporary `custom-fetch` relocation. Use real temporary directories with test cleanup; compare all files, not just selected schema fields. No general whitespace/import normalization.
- [ ] Run `node --test scripts/codegen-drift.test.mjs`; observe missing-function/module or failed assertions before implementation.
- [ ] Implement `compareGeneratedTrees(generatedRoot, committedRoot, { relocatedMutator })` returning path-only drift entries with kind missing/extra/changed. Exact roots: `lib/api-client-react/tmp/codegen/generated` vs `lib/api-client-react/src/generated`, and the equivalent `api-zod` pair; compare postprocessed `lib/api-zod/tmp/codegen/index.ts` vs `lib/api-zod/src/index.ts` separately. Sort deterministically; normalize LF only and the two exact imports `import { customFetch } from "../../../src/custom-fetch";` and `import type { ErrorType, BodyType } from "../../../src/custom-fetch";` to their `../custom-fetch` counterpart in client `api.ts` only. Missing roots, non-file/symlink entries and read failures must fail, not produce a pass. Do not compare handwritten package src files or ignore API changes/types.
- [ ] Wire both package generated trees into existing isolated generation/typechecks; throw on any mismatch, never modify committed generated files automatically.
- [ ] Rerun focused tests and actual `node scripts/check-codegen.mjs`. Expected pass on this baseline except the known relative mutator relocation. Record failures if actual drift is found.

## Task 3: Capability-Accurate Current Claims

Files: new `artifacts/sigil/home-claims.test.cjs`; modify `artifacts/sigil/src/pages/home.tsx`, `overview.md`, `sigil-whitepaper.md`.

- [ ] Write failing source-contract tests for home network count bound to actual NETWORKS, no fabricated volume/signal/latency/full-history/current-sanctions or arbitrary-bytecode promises; require event-only approval limitation and heuristic/no-safety-claim copy.
- [ ] Run `node --test artifacts/sigil/home-claims.test.cjs` and observe unsupported existing claims.
- [ ] Keep existing home layout/controls. Replace unsupported stats with factual scope; feature text describes bounded metadata/ABI/events and curated attribution. Label Tornado example historical registry, not a live OFAC verdict. Say manual monitor/log-derived approvals are not current permission checks or background monitoring.
- [ ] Reconcile overview current claims and extension version. Mark old whitepaper architecture/formulas/Delivered items historical and superseded by current baseline, not implementation truth. Add explicit current capability table instead of silently rewriting historical design.
- [ ] Rerun tests/typechecks/web build and inspect desktop/mobile render; no screenshot alone implies accessibility certification. Start local preview for the user when appropriate.

## Task 4: Secretless CI and Reproducible Package Evidence

Files: new `.github/workflows/verify.yml`, `scripts/ci-policy.test.mjs`, `scripts/evidence-output.test.mjs`; modify `scripts/generate-sbom.mjs`, `scripts/package-extension.ps1`, root `package.json` for reusable baseline test script if needed.

- [ ] Test workflow policy before adding it: unprivileged PR/push checks, contents read, no secrets/pull_request_target, immutable action revisions, frozen installation, tests/typechecks/build/drift, isolated built API smoke, deterministic extension packaging on Windows. Evidence steps must not mutate production or auto-release.
- [ ] Add test-first explicit SBOM `--inventory`/`--output` options and extension `-EvidenceDirectory` option confined to a subdirectory of repository `tmp`; evidence mode never copies public/release ZIP or overwrites `.compliance`. SBOM input in CI comes from fresh `pnpm licenses list --json` to ignored tmp, preserving old audit artifacts. Test temporary output plus unchanged authoritative artifacts; default release script behavior remains compatible.
- [ ] Implement pinned checkout/setup-node Actions verified against their official release commits, fixed pnpm version, no npm lifecycle safety bypass. Use actual existing Node/tsx suites. Run SBOM into ignored `tmp` directory and compare two temporary ZIP hashes. A separate unprivileged audit job executes `pnpm audit --audit-level=low`, with no continue-on-error or shell failure masking: advisories fail the job, and registry/network/parse failures also fail rather than mean clean. Full advisories including dev must be triaged before release; remote results are not assumed locally.
- [ ] Secret-check boundary: policy tests forbid workflow secret references, persisted checkout credentials and committed real env-file names. A full repository/history secret scanner and signed release provenance are explicitly deferred/open G08 prerequisites, not claimed complete by these narrow tests. Tests reject skipped required checks, pull_request_target and continue-on-error/`|| true` masking. No privileged artifact signing on untrusted PR code.
- [ ] Verify workflow structure via tests. Remote CI, signed provenance, installed Store QA and paid/vendor release approvals remain unverified until actual evidence exists; do not label these complete.

## Task 5: Fresh Verification and Handoff

- [ ] Run all CJS API/web/extension tests plus new mjs checks, four existing tsx regression scripts, workspace typecheck, API/web builds, isolated generation/drift and built API smoke (localhost-only mock configuration).
- [ ] Package extension twice to ignored test paths and compare hash/allowlist. Generate SBOM into ignored temp output, not authoritative old evidence overwrite.
- [ ] Independent phase-slice review; fix concrete blockers and rerun affected checks. Inspect final diff for unrelated edits and secret material; `git diff --check`.
- [ ] Record actual outcomes and limitations in P00 ledger/state. Distinguish this completed engineering slice from entire P00 public-readiness gate; no automatic P01 implementation, merge, deploy or NO_GO change.

## Acceptance / Rollback

## Execution Checkpoint (2026-10-09)

- [x] Task 1: gate ledger, exact inputs and diagnostic/advisory triage recorded. Unavailable Euler source and external rollout evidence remain explicitly open, not accepted.
- [x] Task 2: failing drift regressions observed; minimal comparison implemented; final generation/typechecks/full committed drift pass without generated writes.
- [x] Task 3: failing current-claim regressions observed; home/overview/whitepaper corrected; final desktop/mobile rendering, typechecks and web build pass.
- [x] Task 4: failing CI/evidence regressions observed; unprivileged workflow, isolated packaging/SBOM and workspace-owned TS runner implemented. Full audit acquired and reports four findings; GitHub execution/full secret-history scan/signed provenance remain open.
- [x] Task 5: 310 Node tests + four TS scripts, types/builds/drift/API-wrapper smoke, two identical packages and fresh temporary 487-component inventory verified; independent slice review approved after SBOM isolation correction.

Individual unchecked design steps above describe the original sequence; this checkpoint records the executed slice without implying whole-phase release acceptance. Evidence: `.compliance/VNEXT_P00_BASELINE.md`. Changes retained locally on `codex/vnext-p00-baseline`; no commit/push/deploy or automatic P01 start.

### Rollback / Acceptance Boundary

Drift detects path/content mismatch without generated writes; CI uses no production secrets; home does not advertise unsupported current capabilities. Each inherited gate has an owner and evidence request. Existing analysis safety boundaries stay unchanged. Rollback only new CI/drift/copy changes if necessary, never restore vulnerable extension authorization. No new schema migration/provider/job needed.
