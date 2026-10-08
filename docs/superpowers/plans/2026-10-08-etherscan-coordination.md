# Etherscan Coordination Implementation Plan

**Goal:** Reduce repeated metadata traffic and burst-related provider rejection without relaxing evidence checks.

**Approved design:** Bounded per-instance metadata cache/coalescing and cancellable request pacing, approved by the operator on 2026-10-08. No global serverless quota guarantee, automatic retries, new providers or paid services. Preserve current ABI/proxy gates and adapter deadlines.

**Architecture:** A shared coordinator serializes Etherscan requests with at least 1100ms between starts, bounds outstanding work, and cancels work when its last subscriber leaves. Only successfully verified source metadata is cached for 60 seconds, bounded by entries and bytes; no token state, balance, ABI failure or risk verdict is cached here. Cache identity includes API credential, network and normalized source address. Other Etherscan actions share pacing but are not cached. Each caller retains independent cancellation; returned payloads are isolated copies.

**Tech Stack:** TypeScript, standard AbortController/timers, existing Etherscan transport and Node tests.

- [x] Write failing tests for pacing, queue saturation, TTL/size eviction, coalescing, cancellation isolation, last-subscriber cancellation and failed lookup recovery.
- [x] Implement the coordinator and integrate both Etherscan transports, keeping existing bounded reads and per-call deadlines.
- [x] Test integration: duplicate source requests cached only after strict verification; failures not reused as successful metadata; network/address/credential identity maintained.
- [x] Run affected tests, typechecks, API build and built-handler smoke; obtain independent review and repair findings. Final: 269 tests pass, including real response-reader rejection/recovery and cache byte eviction. Independent review approved the runtime scope.
- [x] Update QA evidence and prepare verified publication. The exact publication SHA and local/remote synchronization result are recorded in the project phase checkpoint after pushing.
- [ ] Operator retest Scanner / Ethereum Mainnet: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Expand USDC/aToken state; require actual qualified data or precise unavailable reason, never inferred units or signing clearance.
