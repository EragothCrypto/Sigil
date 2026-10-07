# Six-Step Analysis Quality Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for bounded components and review each integration. Operator approved the written design and execution in this session.

**Goal:** Implement the six evidence-quality workstreams within existing providers before the next manual live-test round.

**Architecture:** Bounded acquisition feeds pure ABI/incident/token/state adapters. Findings-v2 separates evidence risk from uncertainty and never interprets unavailable execution as a successful simulation. Preserve v1 reports, regenerate schemas/clients, verify consumers and document the limits of the fixed evaluation corpus.

**Tech Stack:** Existing TypeScript/Express/React/Node tests, pnpm/Orval, established EVM ABI library (dependency/license review), existing RPC and explorer APIs only.

## Ownership And Order

Primary owns shared acquisition (`ethereum.ts`, new `evidence-rpc.ts`, new `analysis-adapters.ts`), validated findings/scoring, route/cache integration and report UI/parser. Delegate isolated ABI helpers, incident catalog research and simulation/consumer contract only with explicit disjoint paths. Workers do not commit or modify shared files; primary reviews and integrates them.

### 1. Bounded Acquisition And ABI Adapter

Files: API `evidence-rpc.ts`, `abi-evidence.ts`, `analysis-adapters.ts`, `ethereum.ts`, package manifest/lock and matching `*.test.cjs`.
- [x] Verify request budgets, response caps, deadlines, malformed RPC, cancellation and maximum calldata through the real transport. Boundary bug regression has a preserved red/green run; original transport tests' full initial red-run record is not retained.
- [x] Implement allowlisted read-only query transport using existing endpoints, shared 32-attempt/20-second budget, two-endpoint/six-second limits and512KiB streamed envelope cap. No user endpoint or send method.
- [x] Review/install an established ABI library; implement bounded canonical decoding with 256KiB/256entry ABI,32KiB calldata, depth4/subcall16/array32 caps, strict input and provenance types.
- [x] Run helper tests then API typecheck; do not grant historical proxy certainty from current explorer metadata.

### 2. Historical Attribution

Files: API `incident-catalog.ts`, `incident-catalog.test.cjs`; docs `analysis-incident-provenance.md`.
- [x] Verify primary incident publication and its on-chain references against full network/hash; do not use a general article as exact evidence.
- [x] Write failing exact/wrong-chain/nearby-hash/role tests, implement checked catalog lookup with visible provenance and role; unconfirmed entries cannot raise score.
- [x] Review claim scope independently. Historical exploit execution risk differs from victim/recovery observations and current exploitability.

### 3. Token Units And Reported Permission State

Files: `analysis-adapters.ts`, `analysis-adapters.test.cjs`, `ethereum.ts`.
- [x] Verify interface spoofing, ERC721 ambiguity, decimals0/6/18, uint256, unavailable state, wrong block/address and bounded partial queries. Red/green fixes cover ERC20 prerequisites, NFT caller identity and proxy ABI source; not every original test-first run is preserved.
- [x] Acquire at most8emitters,3queries/token,4permission reads within shared budget. Validate ABI/interface response shapes and record block; report contract-declared units/allowance rather than authenticated economics or effective rights.
- [x] Add decoded input provenance (current-only vs historical-bound), proxy uncertainty, and retain raw event values when semantics remain unavailable. Preserve queried state as observations, never source safety credit.
- [x] Run adapter/acquisition regressions with injected RPC and explorer responses; no live DB/inference.

### 4. Honest Execution Check And Consumers

Files: API `simulate.ts`, `execution-check.ts` and tests; `lib/api-spec/openapi.yaml`; regenerated API client/Zod; web `simulate.tsx`, `SimulationResultView.tsx`; extension background/popup/core consumers and focused tests.
- [x] Write failing tests for legacy /simulate422 and /simulate-v2 discriminator with absent score/verdict/effect fields; reject signing methods, arbitrary endpoint, malformed tx and unbounded rawData.
- [x] Implement strict structured transaction check with pinned-block read-only eth_call and explicit call_check/advisory_only/unavailable statuses. No inferred wallet balance changes, permissionsGranted or AI-generated effects. Caller disconnect cancels queries.
- [x] Extend OpenAPI and run `pnpm --filter @workspace/api-spec run codegen`; review generated diff and fail on unrelated generator regression.
- [x] Update web/extension to inspect new status before any score/effect presentation; preserve old endpoint error fallback as local advisory only, never safe/zero success. Package only after source/runtime tests pass; installed older Store rollout remains separate.

### 5. Versioned Findings, UI And Fixed Matrix

Files: `validated-findings.ts`, `ai-analyzer.ts`, `index.ts`, `analysis-cache.ts`, tests; web `validated-report.ts`, `AnalysisResultView.tsx`, tests; docs `analysis-quality-evaluation.md`.
- [x] Verify policy/ref/mandatory finding/JSON+SSE/cache tests and shared fixture matrix; derive decisionScore from risk/uncertainty rules, not wanted sample scores. Cache and tuple integration regressions have preserved red/green evidence.
- [x] Render findings-v2/dual-floor-v2 with risk null when none, coverage/capabilities and uncertainty separate. Keep riskScore compatibility alias and qualified verdict thresholds. Source-backed exploit-execution80; registry danger90; uncertainty floors as approved spec.
- [x] Integrate evidence before AI selection in both routes; persist64KiB bounded new evidence, rotate cache, no invalid preview/save/cache.
- [x] Support v1 and v2 parsing explicitly; malformed declared versions show no assessment, v1 stays labelled narrower coverage. Render source references, input decoding and contract-reported state without legacy badge/diff authority bypasses.
- [x] Exercise benign/incident/unknown/revert/proxy/NFT/spoof/missing evidence/wrong-chain fixtures, both transport paths and consumers. Count excluded unverified incident truth as incomplete, never passed.

### 6. Evaluation, Review And Publication

- [x] Generate deterministic fixture evaluation and capability matrix: zero missing mandatory findings and zero unsupported risk/effect/trust claims in covered fixtures; disclose selection bias and no statistical calibration.
- [x] Independent specification-compliance review, then code-quality/security review; resolve blockers and rerun affected tests. Whole-spec approval followed by quality fixes and independent follow-up approval (29 tests).
- [x] Run selected API/privacy/retention/extension/web regressions, workspace typechecks and both production builds. Run desktop/mobile browser QA with synthetic responses, including malformed/legacy/unavailable simulation and interrupted stream. No paid model or production DB calls.
- [x] Update implementation checkboxes and audit checkpoint; reviewed implementation committed and pushed as `c34652b6f264e0ad0c20721236146027197f9cb1`. Dashboard follow-through recorded separately; full traces/statistical calibration/installed-old-extension gates remain open.
- [ ] Deliver one consolidated operator live-test list after Vercel Ready. No overall compliance GO or guaranteed novel-exploit detection claim.

## Verification Commands

Focused: `node --test artifacts/api-server/src/routes/sigil/<component>.test.cjs`.
Combined: `node --test artifacts/api-server/src/routes/sigil/*.test.cjs artifacts/sigil-extension/*.test.cjs artifacts/sigil/*.test.cjs` (existing tests may require their current TS loader; preserve working commands).
Typechecks: `pnpm run typecheck` and scoped `tsc -p artifacts/api-server/tsconfig.json --noEmit`, `tsc -p artifacts/sigil/tsconfig.json --noEmit`.
Builds: `pnpm --filter @workspace/api-server build`, `pnpm --filter @workspace/sigil build`.
Publication: exact scoped files, clean `git diff --check`, fetched origin/no divergence, verify pushed SHA and worktree. No destructive reset or production migrations.

## Status

Publication checkpoint: runtime commit `c34652b6f264e0ad0c20721236146027197f9cb1` fast-forwarded to main and pushed to GitHub; direct remote SHA verification matched, and all239tests passed on main. Deployment Ready has not been verified. The consolidated operator list is in `docs/production-qa-matrix.md`; run it only after the correct Vercel deployment is Ready. Documentation/Dashboard follow-through does not imply live or compliance clearance.

Final verified implementation checkpoint: **239 combined tests passed**. Independent specification review approved the package; quality review's ABI-node and RPC-envelope blockers were corrected and independently rechecked (29 focused tests passed). Full workspace typecheck, both builds, generated contract checks and built API smoke passed. The locally packaged extension remains1.0.4 with unchanged verified hash. Publication/Dashboard follow-through is next; deployment, installed Store testing and the wider NO_GO gates remain open.

2026-10-07 final checkpoint: 233 combined tests and full workspace typecheck passed. Both production builds, isolated codegen/typechecks, built API smoke and synthetic analysis/execution desktop/mobile QA passed. The whole-package specification reviewer approved after named-tuple, cache floor and recursive block-binding fixes. Quality review found two additional producer/transport boundary cases; fixes and final review are underway before publication. Legacy simulation consumers including content.js now use the v2 discriminator. ZIP1.0.4 was generated twice with identical SHA256 `7D0765CBFFEAD475CC78AB95094029E2A3B99ECA66D40EA85D8BD318F9363170` and matches the public download. No commit/push or Store submission yet.

The early test-first items now record verified regressions explicitly; a complete initial red-run record for every original test is not preserved. Current deadline/response/budget/cancellation, ABI/token/NFT identity and scalar-boundary regressions are passing. RPC parameter budget is 68KiB to accommodate 32KiB hex calldata plus bounded transaction JSON; new evidence serialization remains64KiB. Full traces, historical implementation certainty, isolated effects and statistical calibration remain deferred.

2026-10-07 resumed after rate-limit interruption. Acquisition/ABI/token/NFT/incident slice independently specification-reviewed: 56 focused tests passed after fixes for ERC20 candidate prerequisites, NFT caller versus unknown owner and proxy ABI-source identity. Versioned findings/policy, JSON/SSE integration and web rendering implemented; initial combined suite 197 passed, workspace typecheck and API/web builds passed. Synthetic Chrome analysis desktop/mobile and eight execution UI cases passed. Full integration review, final rerun and content-script simulation handoff remain in progress; no publication yet.

Targeted new proxy-addr advisory patched to 2.0.8 without changing trust-proxy configuration; production audit zero advisories. Full audit retains four nonproduction/tooling advisories (two high/two moderate), not cleared or hidden. viem and license/SBOM inventories added; no paid inference, live DB operations, new provider or privacy changes. Installed Store rollout and overall compliance gates remain open.
