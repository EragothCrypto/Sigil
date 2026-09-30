# Analysis Quality: Six-Step Evidence Expansion

Date: 2026-09-30
Baseline: published validated-findings runtime a8dfc01; documentation checkpoint 2ec80c6.
Status: written design for operator review, not implemented.

## Goal And Constraints

Deliver a single reviewed implementation package before the next operator live-test round. Run automated regression tests during each step; do not defer verification until the end.

Use existing public RPC endpoints and Etherscan-style APIs only. No new paid provider, subscription, wallet connection, external incident fetch on a user-supplied URL, production database mutation, paid inference test or privacy relaxation is authorised. Existing AI model/budgets remain unchanged. Provider errors, incomplete data and unsupported networks are explicit limits, never successful evidence or an invented verdict.

The six workstreams build upon the controlled finding inventory, mandatory findings, ID-only model selections, pre-publication validation and versioned heuristic scoring. Additional evidence must not restore free-prose claims through simulation, badges, prices, legacy renderers or cache hits.

## Alternatives And Choice

1. Existing-source evidence adapters (chosen): bounded ABI decoding, token/state queries, curated source-backed incident data, explicit unsupported simulation/traces. Lowest operational cost; not comprehensive execution analysis.
2. Dedicated simulation/trace service: potentially broader state-delta coverage but adds cost, privacy/vendor work and operator setup; deferred.
3. More AI inference over the same metadata: insufficient to establish transaction effects, incident attribution or permissions; rejected as evidence authority.

## Architecture

Keep acquisition, decoding, finding generation and presentation separate. Pure typed evidence adapters accept checked acquisition envelopes and return available/unavailable/partial status, chain/address/block or hash identity, provenance and bounded data. Findings are generated from this checked evidence, never raw explorer labels or AI narrative. The report gains a new explicit version; rotate cache namespace and retain read compatibility for v1, with clear coverage labels rather than rewriting old records.

Use a proven EVM ABI library already present in the workspace if suitable; otherwise add a narrowly scoped established library after dependency/license review. Do not hand-roll general ABI parsing. Reject ambiguous selectors, malformed/noncanonical encodings, excessive nesting/arrays and truncated calldata. Limit decoding work and persisted payload sizes. No whole source or unbounded decoded payload goes to AI, logs or the UI.

Resource envelope: retain current 200 examined receipt logs/50 retained transfers. At most eight distinct token emitters per scan; at most three state queries per emitter and four permission queries, sharing a total cap of 32 new RPC attempts including fallbacks. Use at most two existing endpoints per new query, six-second request timeout and a 20-second adapter deadline. Enforce a 512KiB streamed response limit before JSON parsing, 256KiB ABI limit/256 entries, 32KiB calldata, nesting depth four, 16 decoded subcalls total and 32 items per dynamic array. Persist at most 64KiB new adapter evidence; truncation/cap exhaustion must set partial/unavailable and never retain a complete flag. Do not truncate input and then decode it as complete. Test below/at/above limits, shared fallback exhaustion and deadline cancellation; caller disconnect aborts outstanding work. Limits may reduce coverage, not loosen silently to fit a fixture.

### 1. Historical Incident Attribution

Create a curated structured incident catalog with exact network/hash, incident name/date, source URLs, review date, attribution scope and supported statement. Check primary incident publications against the exact transaction, using primary-linked on-chain evidence where needed. A general article about Euler plus an unrelated/unconfirmed hash is not an accepted exact-match record.

Distinguish historical transaction association from a dangerous destination registry flag and from current exploit detection. An exact source-backed match with an independently established exploit-execution role becomes a mandatory historical-risk finding with its provenance visibly linked. Confirmed victim, recovery or association-only matches become mandatory historical observations instead, without that risk floor. Do not infer that every call to the destination is malicious, that the user lost funds, or that the old attack is still executable. Unconfirmed sample labels remain observations or are removed; they cannot raise the score. Incident data is curated offline, not downloaded per analysis request.

Acceptance: exact hash/network match only; nearby hashes, other chains and unrelated calls never inherit the incident flag. Every accepted entry has auditable claim support. No desired Euler score or fabricated attribution is permitted.

### 2. Verified ABI And Parameter Decoding

Acquire a bounded validated destination ABI from existing explorer APIs. Verification status and ABI availability remain distinct. Decode full bounded calldata, not only a local selector hint. Persist method signature, bounded typed arguments and acquisition identity; show decoded input as attempted intent, not confirmed effects. Local selector hints are a separate weaker evidence class.

For proxies, bind ABI provenance to a verified implementation and the applicable block; explorer current metadata cannot establish historical implementation identity. If historical proxy resolution is unavailable, label current-ABI decoding accordingly and do not grant historical semantic certainty. Multicall subcalls are bounded, recursively decoded only with supported semantics; unknown children preserve partial coverage. Recognising multicall does not establish every inner action.

Acceptance: Aave supply and Uniswap router examples can be decoded where matching ABI evidence is available; spoofed selectors, failed explorer calls, wrong-chain ABI, proxy mismatches, malformed dynamic offsets and unknown nested calls remain explicit limits. Known protocol names never lower scores on their own.

### 3. Token Identity And Units

Bind token evidence to chain and receipt emitter/token address. Query bounded metadata through existing RPC/explorer APIs with checked envelopes. Establish ERC20 semantics from an explicit reviewed evidence rule, not Transfer shape or name alone; retain NFT token IDs separately. Use integer/string arithmetic for decimals and amounts, never floating point for raw uint256 values. Validate decimal range and metadata size; reject conflicts, malformed responses and missing code.

Record the query block and whether identity/units are historical or current-only. Apply historical quantities only when token semantics/decimals at that block are established. Otherwise retain raw units with a limit. Symbol is an untrusted display label, not an address identity. Event amounts do not prove economic value or authenticity; no USD value without separately bound price evidence.

Acceptance: zero decimals, six/eighteen decimals, maximum uint256, duplicate/spoofed symbols, ERC721 IDs, conflicting metadata and missing archive state are covered. Unknown does not become eighteen decimals or token value zero.

Evidence authority: label standards as interfaces/claims, not guaranteed implementation semantics. An ERC20 interface candidate requires a validated chain/address-bound source ABI declaring transfer(address,uint256), balanceOf(address) and decimals() with the expected output types, plus successful exactly sized balanceOf/decimals eth_call responses at the recorded block and bytecode present. Decimal formatting is explicitly based on contract-reported decimals; it is not authenticated economic value or proof the emitted Transfer represents real movement. Conflicts, ambiguous NFT-shaped evidence or missing ABI prevent ERC20 amount interpretation. A spoof contract satisfying every interface check remains an interface candidate, gets no safety credit, and must never be described as an audited standard token. NFT IDs stay raw and never use ERC20 decimals. Adversarial fixtures must include lying metadata/interface responses and spoofed events.

### 4. Effects, Permissions And Honest Simulation

Add actual bounded read-only state queries for supported allowance/approval semantics. Include owner/spender/token/chain and queried block; latest allowance is current state, not proof a historical transaction granted it. Historical block-level state can include other transactions and must not be called the target transaction's isolated before/after delta. Calldata expresses intent; successful receipts alone do not prove permission changes.

Replace the existing simulate.ts free-form AI outcome authority. Structured transaction input may support an explicit read-only eth_call feasibility check via existing RPCs, with a pinned block/context and unsupported/revert/timeout outcomes. eth_call is not a mined execution, full wallet simulation or complete asset-delta report. Do not claim an approval was granted by an eth_call. Unstructured wallet-prompt text can be advisory input only, without invented permissions or assetChanges.

No production signing, eth_sendTransaction or eth_sendRawTransaction. Strictly allowlisted RPC destinations/methods; user fields cannot supply endpoints. Preserve API/schema compatibility only where truthful: an unavailable outcome must not be coerced into old mandatory scores or fabricated empty success. Update OpenAPI and regenerate clients/Zod through the existing codegen workflow when schemas change; fix generators rather than hand-editing generated files.

Supported state cases: an ERC20-interface candidate with a matching allowance(address,address)->uint256 ABI may expose the exact queried allowance word; ERC721/ERC1155 support claims require canonical ERC165 results and the applicable getApproved/isApprovedForAll ABI/state response, with their scope clearly distinct. Store values as contract-reported state, never permission effectiveness or proven implementation semantics. No current-state query establishes a historical grant/revoke. Malicious contracts may lie in all these calls; fixtures must prove such reports cannot become trust indicators or guaranteed spending rights.

Simulation contract: add /simulate-v2 with a discriminated response: assessmentStatus = observed_state | call_check | advisory_only | unavailable, reportVersion, capabilities and limitations. advisory_only/unavailable have no verdict, riskScore, riskLevel, assetChanges or permissionsGranted properties, not zero/null-to-zero defaults. call_check may report success/revert at its pinned block but likewise has no invented wallet deltas or granted permissions; observed_state reports only bounded queried state with identity/block. Neither status is a complete execution simulation. Upgrade web/extension consumers to inspect the discriminator before presentation. Existing /simulate cannot truthfully serve its old required outcome schema: return HTTP422 with error=execution_analysis_unavailable and an explanatory message rather than a success object. Old client error fallbacks remain explicitly local advisory checks, never remote simulation evidence; if a consumer maps unavailability to safe/zero/empty-success, fix and package that consumer and retain this as an installed-old-build limitation until Store rollout. Tests must cover both the new API and old-client HTTP error path, with assertions against zero-risk or confirmed-effect fallbacks. Existing primary analysis routes remain backwards compatible with documented decision scores.

Real internal traces, isolated wallet balance deltas, storage simulation and historical archive support are NOT assumed available. Publish an explicit capability matrix. These remain deferred coverage, not checked-off execution analysis. Scope completion means implemented available checks plus a truthful guarded unavailable path; it does not mean comprehensive simulation on all networks.

Acceptance: state calls have exact identities/blocks; failed, missing or contradictory results cannot become effects. Test raw JSON, calldata-only and prose separately. API/web/extension consumers cannot display a simulated confirmed loss/receive/granted permission without accepted execution evidence.

### 5. Fixed Regression And QA Matrix

Version fixtures and expected evidence properties, not predetermined sample scores. Include benign Aave/Uniswap/WETH, independently attributed incident transactions, ambiguous approvals/NFTs, EOA/creation, failed/pending/unknown/reverted acquisition, proxy changes, partial events, metadata/ABI/RPC errors and same addresses/hashes on wrong networks. No live production API is required for automated tests.

Exercise both JSON/SSE endpoints, persistence/cache boundaries, malformed v2 and legacy records, web desktop/mobile, extension compatibility, simulation input validation and error propagation. All affected flows must preserve fail-closed findings and progress-only rendering.

Acceptance: reproducible automated suite passes, adversarial evidence cannot forge authority, mandatory findings cannot be suppressed by model selection, and the operator receives one consolidated live-test list only after implementation review/builds.

### 6. Score Policy, Coverage And Evaluation

Introduce an explicit versioned heuristic policy grounded in reviewed evidence categories. Separate evidence-backed risk from uncertainty/coverage in API and UI; do not present a coverage gap as a proven attack. Keep correlated gaps from accumulating into arbitrary critical scores. Evidence-backed historical risk does not assert current exploitability. Neither verified source, familiar protocol nor successful execution gives unconditional signing clearance.

Define a labelled fixture evaluation report for false warning signals and missed supported findings. Separate incident-association benchmarks from novel exploit detection; exact incident lookup is not general attack detection. Report sample counts, selection bias and coverage limits. Small curated tests support deterministic acceptance, not statistical accuracy estimates or calibrated probabilities.

Acceptance: published policy/version and explanations agree with code; missing evidence has an explicit state; benchmark failures block the implementation checkpoint. Statistical calibration and comprehensive exploit detection remain future work until there is an independently labelled representative corpus. No marketing claim of 100% safety/accuracy.

Policy oracle dual-floor-v2: evidenceRiskScore is null when no accepted risk exists, otherwise the maximum applicable rule floor; uncertaintyScore is the maximum applicable coverage floor or zero. decisionScore = max(5, evidenceRiskScore ?? 0, uncertaintyScore). Keep riskScore as a documented backwards-compatible alias of decisionScore, not a probability. Verified source/known identity/execution success confer no deductions. Coverage is complete_for_supported_checks | partial | unavailable with explicit per-adapter capabilities; this never means a full audit. Floors: source unverified40, source unknown35, unknown selector35, missing/partial receipt or unresolved inclusion/outcome35, ambiguous/unchecked allowance40; no increment for raw units, traces missing or neutral mint/burn. Curated dangerous destination flag90 remains an explicitly attributed registry warning. Source-verified exact historical exploit-execution attribution80 applies only to entries establishing that execution's attack role; victim, recovery, association-only or unconfirmed entries are observations and do not get this floor. Historical evidence never claims present exploitability. Compatibility verdict mapping remains <=25 safe (qualified no-warning label), <=60 caution, otherwise dangerous; riskLevel thresholds25/50/75 apply to decisionScore and are labelled heuristic. v1 report parsing and scores remain unchanged, cache v2 cannot reuse v1.

Before implementation, each reviewed fixture declares expected mandatory finding IDs/categories, provenance bindings, allowed coverage and evidenceRiskScore/uncertaintyScore inputs. Scores/verdicts are derived from the policy table, not independently assigned desired sample numbers. Gate on zero missing mandatory findings and zero unsupported risk/effect/trust claims in this fixed corpus; invalid evidence must produce the expected unavailable/partial result. Exact incident match/mismatch, interface spoofing, legitimate deposit/mint/swap, missing data and uncertain proxy fixtures are required. The evaluator records corpus count and exclusions; absent independently sourced incident truth is an incomplete benchmark, not a pass. This is deterministic fixture acceptance, not measured real-world detection accuracy.

## Delivery And Review

Execute in six dependency-ordered implementation steps with disjoint unit tests and scoped review. Finish with the combined regression suite, API/web/workspace typechecks as applicable, builds, synthetic browser/consumer checks and a documented capability/evaluation matrix. Update the existing phase-level Dashboard task, not dozens of microtasks. Commit/push only the reviewed implementation under the ongoing workflow; Vercel Ready and operator live QA remain separate.

No compliance GO is inferred. Provider contract/retention/transfer, installed Store-build and other existing release gates remain open.
