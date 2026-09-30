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

- Deploy the reviewed version, then request a fresh scan rather than reusing an old stored report.
- Test Euler's curated example and an unrelated same-selector transaction; retrospective labels must never imply live exploit detection or a forced score.
- Test zero native value with token Transfer logs, an EOA destination, pending/reverted calls and unavailable explorer/receipt data.
- Confirm no zero-ETH/gas safety positives, invented public selector search, confirmed compiler vulnerability, or granted/revoked allowance claim occurs.
- Check both streaming result and saved report coverage. Internal traces, ERC1155 events, balance deltas, token-standard proof and exact loss attribution remain unimplemented.

Production model quality, visual browser QA and compliance sign-off are separate open checks. Implementation branch: `codex/analysis-evidence`. Operator authorised completion via commit, fast-forward integration into `main` and GitHub publication on 2026-09-30; publication does not prove successful Vercel deployment or production risk-quality validation.
