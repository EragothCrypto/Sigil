# Proxy Token State Follow-Up Implementation Plan

> **For agentic workers:** Use superpowers:test-driven-development and superpowers:verification-before-completion. Independent review is scoped to adapter/report/cache compatibility.

**Goal:** Correct misleading token observations and support bounded contract-reported ERC20 state for one-hop verified proxies without claiming historical implementation semantics or effective rights.

**Architecture:** Preserve the existing report shape, fixed RPC providers, eight-emitter cap, shared timeout/request budget and strict validation. Resolve one current verified non-proxy implementation ABI only for token interface checks. Query original token addresses at the recorded block, not implementation addresses. Keep proxy permission inspection disabled. Available proxy observations retain `current_proxy_abi_only` reason and an explicit analysis limit. All-unavailable and mixed token findings must accurately describe their statuses.

**Tech Stack:** TypeScript, viem, existing Ethereum metadata/RPC adapters, Node test runner.

## Tasks

- [x] Add failing adapter tests for valid one-hop proxies, missing/unverified/nested implementation, metadata identity mismatch, absent block code and malformed/RPC state responses. Check original address/block binding, no partial decimals and no proxy permission queries.
- [x] Add failing findings tests for all-unavailable, mixed and available token states; preserve state evidence and score/capability rules.
- [x] Implement precise unavailable reasons, bounded proxy ABI resolution and status-aware findings. Invalidate stale in-memory analysis cache namespace if needed.
- [x] Run focused tests, shared validation/cache integration, full affected suite, typecheck and API/web builds; independently review changes and repair actionable findings. Final: 256 affected tests pass; reviewer approved after the real-RPC rejection-classification regression was fixed.
- [x] Update QA evidence for the scoped changes. Publication and MCP checkpoint follow verification.
- [ ] Operator retest of the documented Aave mainnet hash after Vercel Ready; do not claim successful live token reads until observed.

## Operator Retest

Scanner / Ethereum Mainnet: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`.
Expand token evidence. Each token must show actual block-bound reported decimals/balance or a precise unavailable reason, never fabricated units. Current implementation ABI remains non-historical; no authenticated movement, effective permission or signing clearance. If archive/RPC/ABI evidence is missing, unavailable remains an acceptable fail-closed outcome, not a successful token-coverage test.

## Metadata Diagnostics Checkpoint

The operator retest showed both tokens unavailable with `token_abi_unavailable`. The unavailable-only observation copy is corrected, but live token coverage is still open. Production credentials/logs are not available locally; the actual cause is not established.

- [x] Add fixed, sanitized Etherscan source/transport/ABI failure codes and propagate them through token and one-hop implementation metadata failures. No provider messages, URLs or keys are included in diagnostics.
- [x] Preserve strict verification, proxy gates, ABI size/entry budgets, RPC targets and existing request budgets; no retries, providers or guessed units added.
- [x] Reproduce review findings with failing tests, then fix masked implementation failures and distinguish the 256-entry ABI boundary from limit rejection. All 260 affected tests, workspace typecheck, API build and built API/wrapper smoke tests pass.
- [x] After deployment Ready, perform a new mainnet scan of the Aave hash above and expand both token records. Operator observed `etherscan_rate_limited` for both tokens; successful token coverage remains unconfirmed.

Operator result after diagnostic deployment: both token records explicitly show `etherscan_rate_limited`. Diagnostic retest is complete; successful token coverage remains open. Provider rate rejection is now observed, but exact account quota/aggregate traffic is unknown. Proposed next scope: bounded metadata-only cache/coalescing and cancellable pacing within existing deadlines, preserving fail-closed behavior. No implementation of this new scope yet; obtain design approval first. Per-instance serverless coordination does not guarantee a global API-key quota.
