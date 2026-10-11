# Colosseum Manual Solana Implementation Plan

> For agentic workers: use superpowers:executing-plans task-by-task. Do not wait for whole P00 closure. No unrelated refactor or external deployment/signing.

**Goal:** working manual Solana wallet/delegate integration alongside EVM within the 24-hour demo sprint.

**Architecture:** official public-key/SPL decoders, bounded RPC transport, deterministic review report, additive Express/OpenAPI endpoint and existing React UI.

**Tech Stack:** existing TypeScript/Express/React/Vite; official Solana SDK selected and pinned before use.

Checkpoint 2026-10-11: independent plan review approved. H01/H02 local slices completed; focused red/green and 463 Node + four TS baseline, types/build/codegen passed. Actual desktop/mobile live browser and built Express/both catch-all unavailable-path tests passed. COption decoder edge reproduced/fixed/tested and final focused review no must-fix. H03-H06 external/candidate gates are not complete; see active roadmap for evidence and remaining acceptance.

## H01: Data Path

Create artifacts/api-server/src/monitoring/chains/solana/{wallet-state,rpc}.ts and matching .test.cjs files. Preserve existing EVM modules.

- [x] Write failing runtime tests for valid key/program fixtures, delegate amount min(balance,delegatedAmount), frozen state, malformed binary/owner mismatch, partial Token-2022 and failed query. Use official codec-encoded fixture bytes, no copied custom layout.
- [x] Run `node --test artifacts/api-server/src/monitoring/chains/solana/*.test.cjs` and record expected missing-module failure.
- [x] Select/pin official SDK dependencies after current API/license check. Implement smallest report/evaluator: supported legacy scope only, per-query context, all integer amounts as strings.
- [x] Add failing transport tests for genesis, IDs/errors, caps, cancellation and method allowlist. Implement bounded transport with public mainnet/devnet defaults; never accept RPC URL from request.
- [x] Re-run focused tests and API typecheck/build. No commit without requested approval.

## H02: API and UI

Create artifacts/api-server/src/routes/sigil/solana-monitor.ts; mount in routes/index.ts. Describe contract in lib/api-spec/openapi.yaml and regenerate existing generators. Add both api wrapper layouts only if catch-all coverage requires it. Add artifacts/sigil/src/pages/solana-monitor.tsx and focused report-validation/tests; update App.tsx/layout navigation minimally.

- [x] Write route/schema tests first: valid wallet/cluster, malformed request, unavailable result and response context binding.
- [x] Implement explicit read-only POST with disconnect cancellation and existing rate/security boundaries, no persistence.
- [x] Implement input, loading, review/partial/unavailable states, evidence and synthetic examples with clear labeling. No always-on or safe-wallet claim.
- [x] Run changed-route HTTP and actual browser desktop/mobile smoke; assert no automatic scan/signing and exact context-bound result.

## H03-H06: Candidate and Submission

- [ ] Run focused tests, workspace types, web/API build and codegen/drift once on final candidate; record results, not broad unchanged 157-view reruns.
- [ ] Record live Solana read input/genesis/slots and EVM Aave/Euler result semantics. Failure remains unavailable and blocks live-integration claims.
- [ ] Produce docs/colosseum-demo-checklist.md and submission narrative/scripts with pre-existing-work disclosure and no fabricated traction.
- [ ] At hour 14 freeze new features. Resolve only demo blockers, prepare authorized deployment/rollback, record final walkthrough.
- [ ] Kevin records/uploads videos and completes submission; record receipt only after actual confirmation.
