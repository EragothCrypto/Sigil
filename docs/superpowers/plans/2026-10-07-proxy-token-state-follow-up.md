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
