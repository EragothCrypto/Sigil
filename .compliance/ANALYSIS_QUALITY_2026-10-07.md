# Analysis Quality Release Checkpoint

Date: 2026-10-07. Scope: approved six-step evidence expansion, not a new legal audit.

## Implemented Worktree

- Exact network/hash incident catalog with primary-source references and separate exploit, victim and recovery roles.
- Bounded viem ABI decoding, canonical argument checks and multicall limits. Current-only ABI metadata never establishes historical implementation certainty.
- Bounded token interface and permission reads with address/block provenance. Contract-reported state is not authenticated economics, ownership or effective rights.
- Read-only `/simulate-v2` with explicit call-check, advisory-only and unavailable states. Legacy `/simulate` returns 422 rather than invented AI effects.
- Findings-v2 separates accepted risk from uncertainty. Cache validation rederives policy floors and binds transaction/hash/block identities; malformed evidence cannot publish a cached verdict.
- Web and extension consumers handle the discriminators without invented balance deltas or safe-zero fallbacks.

## Verified Locally

| Check | Result |
| --- | --- |
| Combined API, extension and web Node tests | 239 passed, zero failures |
| Full workspace typecheck | Pass |
| API and web production builds | Pass; existing tooltip sourcemap and >500KB bundle warnings remain |
| Isolated OpenAPI regeneration / generated typechecks | Pass; required analysis input and history contract retained |
| Built API smoke | Health200, unauthenticated cron401, legacy422, invalid-v2 400, advisory-v2 without effects/score |
| Synthetic Chrome analysis QA | Desktop/mobile, evidence expansion, malformed report, legacy notice, interrupted stream; pass |
| Synthetic Chrome execution QA | Eight desktop/mobile status/invalid-payload cases; pass |
| Existing TS regression scripts | Approval scanner, watchlist, wallet monitor and site reputation passed |
| Independent reviews | Whole specification approved; code-quality review blockers fixed, scoped follow-up approved with 29 passing tests |
| Extension 1.0.4 deterministic package | Two identical ZIP hashes; public download matches |
| License / component SBOM | 487 installed package versions; lockfile-linked inventory, not legal clearance or a complete dependency graph |

ZIP SHA256: `7D0765CBFFEAD475CC78AB95094029E2A3B99ECA66D40EA85D8BD318F9363170`.

## Dependency Findings

The scoped proxy-addr override updates 2.0.7 to 2.0.8. The existing trust-proxy setting remains unchanged; this is not a claim that the app's numeric trust setting was exploitable.

Fresh `pnpm audit --prod --json`: zero known advisories. Full `pnpm audit --json`: four entries, two high and two moderate (braces, source-map-js, postcss-selector-parser, fast-copy). The production-filter result excludes workspace dev-classified packages, including some build/logger tooling; it does not prove these packages are absent from deployed artifacts. Reachability and safe patching remain separate follow-up work. No blanket security clearance is implied.

Registry checks use Node system CA support; TLS verification was not disabled.

## Open Gates

Final reviews approved the implemented scope. Runtime commit `c34652b6f264e0ad0c20721236146027197f9cb1` was pushed to GitHub main and its remote SHA verified. Production deployment and fresh operator live tests remain unverified here. Extension 1.0.4 still requires Store submission and real installed-build/wallet QA. No paid model, production database mutation, new provider or account privacy change was performed.

The SBOM lockfile hash uses canonical LF text so Windows CRLF checkouts do not invalidate its identity; the normalization is declared in the component inventory. This is a component inventory, not signed provenance.

Review-driven boundary fixes: cache floors/categories and block identities are checked; named ABI tuples retain values; ABI node overflow becomes unavailable without hiding other findings; the bounded 68KiB RPC parameter envelope accommodates unchanged maximum 32KiB calldata. These corrections have executable red/green regressions.

Full internal traces, isolated balance deltas, historically bound implementation decoding, representative incident truth, statistical calibration and general novel-exploit detection remain deferred. The fixed corpus is deterministic regression acceptance, not representative accuracy or a risk probability.

Overall compliance remains **NO_GO** until the existing organizational, vendor, legal, accessibility and rollout gates have evidence. This technical checkpoint does not close those findings.

## Proxy Token State Follow-Up

Operator Aave test exposed all-unavailable token records described as successful interface responses. Corrected generation distinguishes all-unavailable, mixed and available checks. The bounded adapter now accepts one current verified, explicitly non-proxy implementation ABI for a verified proxy token, rejecting zero/self/missing implementations, nested/unknown proxy status and metadata identity mismatches. State calls remain on original token addresses at the recorded block; atomic decimals/balance validation and explicit current-ABI/non-historical qualification are preserved. Proxy permission inspection remains disabled. No new providers, inferred token prices, historical implementation claim, effective rights or signing clearance.

Cache namespace is revised and contextual acceptance additionally binds token records to receipt emitters, prohibits duplicates/available NFT-shaped state and checks token capability consistency. Eight-emitter/32-attempt/shared20-second/64KiB bounds remain unchanged; repeated proxy limits are deduplicated. Regression tests cover proxy metadata failures, address/block/caller binding, shared implementation caching, numeric boundaries, cancellation after metadata, truthful findings and adapter-to-shared-parser/cache round-trip. Review identified lost rejection reasons in the real RPC transport; accept callbacks now retain only bounded observed failure classes and clear stale reasons after successful fallback. Real-transport tests cover malformed code/decimals/balance, transport failure and successful fallback. Local verification: 256 affected Node tests, full workspace typecheck, API/web production builds and actual built API/Vercel-wrapper smoke checks pass. Independent follow-up review approved the scoped diff (66 focused tests). Existing web bundle/sourcemap and Node module warnings remain. Live Aave proxy-token success is not established by these synthetic tests; operator retest after deployment is required. Overall NO_GO unchanged.

## Metadata Diagnostic Follow-Up

Operator retest confirms corrected unavailable-only copy but both tokens still show `token_abi_unavailable`. The actual production cause remains unknown without production source responses/logs. Added fixed sanitized source/transport/ABI diagnostics, propagated through token and implementation lookup failures. No raw provider errors, URLs or keys are exposed. Verification/proxy acceptance, ABI budgets, state identity/block binding and all RPC limits are unchanged; no provider, retry or guessed token value added.

Independent review identified masked implementation-provider failures and an inaccurate ABI entry-budget diagnostic. Red/green regressions cover failed metadata without proxy flags and the 256/257 entry boundary. Fresh local verification: 260 affected Node tests, full workspace typecheck, API production build and built API/Vercel-wrapper smoke checks pass. No production model/API calls were performed. Live retest of the documented Aave hash remains required to identify the cause; unavailable is fail-closed behavior, not successful token coverage. Overall NO_GO remains unchanged.

## Etherscan Coordination Follow-Up (2026-10-08)

The operator subsequently observed `etherscan_rate_limited` for both Aave token records. This confirms provider rejection, not the exact account quota or aggregate source of traffic. Approved scope: per-instance bounded cache/coalescing and cancellable pacing. Both Etherscan transports share 1100ms minimum start spacing and 16 outstanding jobs. Strictly verified source envelopes alone are cached for 60 seconds, at most 64 entries / 16MiB, with network/address/credential/parameter isolation and cloned results. Caller deadlines include queue wait; shared requests survive individual cancellation but abort when abandoned. Existing 512KiB response reader now applies to all Etherscan responses. No automatic retries, new provider, paid service, inferred units, token state cache or evidence acceptance changes. Local saturation has a distinct `etherscan_queue_full` diagnostic.

Final local verification passes: 269 affected Node tests, full workspace typecheck, API build and built-handler/Vercel-wrapper smoke. Independent review approved the runtime scope. Follow-up tests exercise the real response reader through coordinated acquisition (oversized payload rejection, valid recovery and caching) plus cache byte eviction. Publication follows this checkpoint. Operator live token success remains unverified; per-instance serverless pacing does not guarantee global API-key quota coordination. Overall NO_GO remains unchanged.
