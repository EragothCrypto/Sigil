# Bounded Token Proxy Chain

Approved follow-up: investigate the repeated explicit nested-proxy report and support an additional implementation stage only within strict boundaries. The operator repeated token_proxy_nested_unsupported after the diagnostic split. Deployment freshness remains operator-reported; actual authenticated metadata/address chain was not obtained locally. No confirmed production USDC chain or live availability is claimed.

Design: token-state ABI acquisition follows at most two current explorer implementation links. Every visited contract must have verified metadata with no provider issue; the terminal node must explicitly report isProxy=false and pass existing bounded ABI/ERC20 checks. Unknown status, invalid/zero addresses, identity mismatch, cycles and excess depth fail closed. Fixed diagnostic codes distinguish these failures. Intermediate ABIs cannot bypass the terminal check. Current metadata is not historical implementation evidence.

Reads stay on the original emitter and recorded block. No implementation state is queried, and proxy permissions remain unsupported. Existing 20-second adapter lifetime, 8-emitter bound, shared metadata cache/coalescing and Etherscan pacing apply; at most one additional metadata request per proxy emitter versus the previous one-hop policy. No runtime provider, guessed ABI, retry, price inference or signing clearance added.

- [x] Reproduce two-hop rejection and cycle classification in failing tests.
- [x] Implement isolated bounded resolver and diagnostics.
- [x] Local verification: 282 affected tests pass, including cancellation/deduplication and two-hop report/parser/cache round-trip. Workspace typechecks, API build and built API/Vercel-handler import smoke pass.
- [x] Independent review found no blockers; reviewer additionally verified 76 focused tests and API typecheck. Old in-memory reports expire after 30 minutes; deployment restart clears them, or fresh scans bypass them.
- [x] Prepare publication; exact published SHA and synchronization recorded in project phase after push.
- [ ] Live retest after deployment Ready.

Scanner / Ethereum Mainnet: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Expand USDC and aToken token-state evidence. If a valid two-link chain reaches an accepted leaf and block-bound RPC succeeds, USDC may report qualified current_proxy_abi_only state. Otherwise expect token_proxy_cycle, token_proxy_depth_limit, token_proxy_status_unknown, token_proxy_implementation_unavailable or the actual upstream/ABI/RPC error, without invented values. Euler control: `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d`, retain historical exploit finding. No signing required. Overall compliance NO_GO unchanged.
