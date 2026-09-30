# Analysis Evidence Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task with focused regression verification.

**Goal:** Ground transaction verdicts in bounded receipt/explorer evidence and explicit limitations.

**Architecture:** A pure receipt decoder owns shape checks and coverage; ethereum.ts owns acquisition/metadata validation; ai-analyzer.ts owns truthful prompt context. Both existing routes persist the same summary. Exact historical examples are labelled separately from inferred threats.

**Tech Stack:** TypeScript, Node built-in tests, JSON-RPC, existing Etherscan client and OpenAI-compatible client.

- [x] Write failing receipt/metadata/context tests for ERC20, NFT, malformed/missing/reverted/truncated logs, unavailable explorer and token metadata errors.
- [x] Implement bounded evidence decoder and validated acquisition; keep existing data-provider configuration.
- [x] Add chain/hash scoped curated Euler regression context with no predictive-detection claim.
- [x] Integrate evidence into prompts and both route details; prohibit unsupported security conclusions.
- [x] Review independent feedback; run focused and existing regressions, typecheck/build, update compliance/dashboard evidence. No production QA or legal GO inferred.

## Verification And Review

The new tests were run failing before their implementations and passing afterward. The final selected combined suite passes 95 tests: evidence, both route callbacks/SSE, AI output/budgets, private history, retention/auth, extension behavior/policy and onboarding. RPC, explorer, database and AI responses are mocked; no live wallet, production database or paid inference was used. API and web TypeScript checks and both production builds passed. Web build retains existing tooltip sourcemap and large-chunk warnings. No new dependency or data provider was added.

Independent specification review (Newton) identified malformed ABI arrays and selector-only exploit claims; both corrected and approved. Quality review (Socrates) identified unsupported approval outcomes, EOA verification penalties, invalid ABI parameter types and contract SSE timing; these were corrected with tests. That agent's final review could not be recovered after the usage-limit interruption; a fresh read-only review (Wegener) identified remaining static approval assertions. Large approval and NFT operator candidates now preserve execution/semantic uncertainty; the final scoped quality review was approved with no blocking regressions. All final API checks and 95 regressions passed after these corrections; web sources were unchanged since their passing checks/build.

Approval corrections include intent-only web copy, no automatic revoke/exact-amount safety credit, raw amounts without assumed decimals, and no finite USD exposure inferred from unknown units. Destination verification is gated on bytecode observed at the transaction block; pending/no-block transactions remain unknown rather than querying latest and calling it transaction-block evidence. Transaction metadata lookup skips the unrelated token-info request.

## Live Follow-Up

### Transaction Lookup Follow-Up (2026-09-30)

The Aave operator screenshot renders a plausible deposit report without an inflation accusation, but the Uniswap screenshot produces score35 despite no transaction data. The example exists on mainnet; two existing public RPCs independently returned it. This does not identify which error occurred in Vercel.

New failing regressions reproduce null/malformed/mismatched first transaction responses ending fallback and a missing transaction reaching AI and persistence. Validated transaction results now gate each existing RPC endpoint attempt. Both routes stop on unavailable transaction data before AI, score generation, persistence and cache writes; JSON returns503, SSE sends a sanitized error and ends. Unavailability is not claimed as proven nonexistence. Contract creation remains supported. Cache namespacev3 avoids legacy cached verdicts; stored reports are not rewritten/deleted.

All 113 selected regressions, API typecheck/build and independent scoped review pass. Real corrected acquisition of the public Uniswap example with Explorer deliberately disabled returns mined/success, four receipt logs, two observed transfers and complete bounded event scan. No paid AI/database operation or new provider; TLS verification retained. Next: fresh production Uniswap scan after deployment, plus Aave/WETH controls. Old saved score35 reports are not evidence of current behavior. AI semantic correctness and overall release sign-off remain open.

### Receipt Interpretation Follow-Up (2026-09-30)

Operator screenshot 171059 establishes one complete live result with mined/success status and 20 bounded Transfer-shaped observations, but not score calibration or confirmed exploit mechanics. Shared rules now explicitly forbid interpreting unknown raw magnitudes as large economic amounts, zero-address events as proof of inflation/manipulation, event order as internal routing or recipient control, and remembered token symbols as verified emitter metadata. Normal protocol mint/burn is neither automatic danger nor safety; correlated evidence gaps must not become independent critical threats. Existing raw input, scoring algorithm, completion budgets and privacy routing are unchanged.

Two tests failed before implementation and pass afterward, verifying preservation of synthetic mint/burn-shaped raw observations and rule delivery through both streaming/non-streaming stages. All 108 selected regressions, API typecheck/build and independent review pass. Model adherence is NOT established by mocked tests; no paid AI call or live benign-control test was performed.

Production comparison after deployment:
- Run a fresh Euler example and one known legitimate lending/wrapping/liquidity transaction supplied by the operator; do not reuse saved reports.
- Check neither case calls unknown-unit values massive, assumes DAI/symbols without verified mapping, or asserts inflation/manipulative economics from mint/burn alone.
- Retain genuine source/selector/coverage concerns without asserting safety or requiring a predetermined score. Missing traces must be a limitation, not proof of hidden losses.
- If the model still produces unsupported claims, preserve the report as quality evidence and investigate structured evidence-linked output validation rather than assigning a preferred score.

### Token Truncation Follow-Up (2026-09-30)

The operator reports a new length failure, but the old error cannot distinguish signal gathering from verdict generation. Added phase-aware errors and validated numeric completion/reasoning usage only, including streamed usage-only trailers. Requests now prioritize compact signals and verdict fields, explicitly disclose partial summaries, retain all existing bounded receipt input and avoid duplicating signal JSON in the second prompt. Budgets and privacy/routing settings remain unchanged. Output-length instructions are advisory, not a guarantee against reasoning-token exhaustion.

Independent review identified a trailing-usage transport error could retry a known terminal completion; regression first failed, then passed after fallback was restricted to streams without a terminal finish reason. All 106 selected tests, API typecheck/build and final independent review pass. No paid inference or live database call. Deployment and a fresh production scan must establish whether truncation remains; if it does, obtain the signals/verdict phase and numeric usage before adjusting budgets or model configuration.

### Receipt Follow-Up (2026-09-30)

The post-publication screenshot exposed a remaining status defect: unavailable receipt data was labelled Pending/Unknown even for a mined example. Null results also stopped RPC fallback. Regression tests reproduced both before correction. Inclusion now remains independent of execution outcome; validated receipt retrieval advances through the existing endpoint fallback for mined null/malformed/mismatched data. Pending null receipts stop promptly. Fixed diagnostic enums are visible without storing raw upstream errors or user request data in logs. Curated historical labels remain separately visible in details but are excluded from AI evidence, preventing the application's example tag from authorising contract-incident/loss attribution. Cache v2 prevents stale process-cache reports.

Verification: 100 selected regressions pass, API typecheck/build pass and independent scoped review approves. A real public-RPC ingestion smoke (no explorer, AI or database access) returned mined/success, 56 receipt logs, 20 observed Transfer-shaped events and complete bounded event scan. Initial local Node TLS trust failed; Windows system certificate trust resolved it with verification retained. Earlier Vercel acquisition-failure reason remains unknown and must be checked on the next fresh production run. No forced risk score or claim of full trace/exploit detection.

- Deploy the reviewed version, then request a fresh scan rather than reusing an old stored report.
- Test Euler's curated example and an unrelated same-selector transaction; retrospective labels must never imply live exploit detection or a forced score.
- Test zero native value with token Transfer logs, an EOA destination, pending/reverted calls and unavailable explorer/receipt data.
- Confirm no zero-ETH/gas safety positives, invented public selector search, confirmed compiler vulnerability, or granted/revoked allowance claim occurs.
- Check both streaming result and saved report coverage. Internal traces, ERC1155 events, balance deltas, token-standard proof and exact loss attribution remain unimplemented.

Production model quality, visual browser QA and compliance sign-off are separate open checks. Implementation branch: `codex/analysis-evidence`. Operator authorised completion via commit, fast-forward integration into `main` and GitHub publication on 2026-09-30; publication does not prove successful Vercel deployment or production risk-quality validation.
