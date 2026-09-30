# Validated Analysis Findings

## Approval And Goal

Operator approved structured observations, limitations and evidenced risks, with fail-closed output: an unsupported or contradictory AI response must produce analysis_unreliable without a verdict or score. This specification makes that architecture reviewable before implementation.

The latest Euler screenshot still infers manipulation from mint/burn-shaped events and presents successful execution as a trust indicator despite prompt prohibitions. Aave, Uniswap and WETH screenshots establish individual functional paths, not score calibration or complete semantic correctness. Another natural-language prompt or a second AI judge does not solve this reliably.

## Boundaries

- Existing Ethereum RPC/explorer data, model, privacy routing and completion ceilings remain unchanged. No extra AI validation call, provider, wallet integration, tracing or database schema migration.
- No desired Euler score, special scoring for a curated historical example or guarantee that a known protocol is safe.
- Implement the same contract for transaction and contract analyses, streaming and JSON routes. Keep unsupported input and missing transaction data fail-closed.
- Existing stored reports remain unchanged and clearly legacy; new cache namespace prevents reuse as validated results. Existing extensions receive compatible warnings/positives rather than a breaking API replacement.

## Server-Owned Evidence And Findings

Add a pure evidence/claim module, separate from acquisition and UI. It receives validated input data and produces a bounded, request-local evidence inventory and allowed finding candidates. IDs bind to this request's typed facts, not arbitrary strings chosen by the AI.

Evidence includes destination identity, code at the transaction block, source verification state, inclusion/execution state, local selector match, raw receipt observations/coverage, and conservative attempted approval intent. Curated historical context remains separate. Registry recognition identifies a protocol; it is not an audit or current sanctions certification. Token symbols/units require explicit acquired emitter metadata; otherwise render addresses and raw units only.

Each candidate has a stable code, category (observation, limitation, risk or supported_indicator), required evidence types, deterministic text, and severity eligibility. The server defines candidates from facts; the AI can select only supplied candidates. Validate every reference's existence, required relationship, category and permitted use. Reject unknown codes, unexpected properties, duplicate/excessive findings, fabricated references and contradictory selections.

Initial allowlist is deliberately narrow:
- Observations: successful/reverted/pending execution, observed raw transfers, zero-address mint/burn-shaped events, destination identified in the local registry, decoded method where available.
- Limitations: missing/partial receipt coverage, no internal traces, unavailable/unverified source, selector unknown to the local registry, unestablished token units/semantics and allowance state.
- Supported indicators: source verified at the acquired destination, expressed narrowly as inspectability, never a safety/audit guarantee. Known protocol recognition remains an observation.
- Risk candidates: concrete supported registry-danger findings and conservative risky approval intent, only with the exact identity/semantics prerequisites. An attempted approval is not a granted allowance; NFT-compatible ambiguity prevents claims of unlimited ERC20 access. Critical classification requires a supported concrete risk, not a collection of limitations.
- No candidate for inflation, malicious mint/burn, hidden drains, recipient coordination, unauthorised losses, audited protocol, zero-ETH safety or successful-execution safety without separately implemented supporting evidence.

## AI Contract And Rendering

Both AI stages exchange bounded structured selections of these candidate IDs/codes; no free-form warning, positive, summary, reason, pattern or breakdown text becomes a user-visible authority. The first stage is validated before being passed to the second. A syntactically valid JSON response with an invalid semantic selection is still a failure.

The server renders summary, verdict reason, warnings, positives, breakdown and any permitted patterns from validated candidates and actual acquired facts. All material supported risk candidates and relevant deterministic limitations are server-mandatory, even when either model stage selects an empty list or omits them. AI selection is only a bounded presentation suggestion, never the authoritative risk inventory. Score computation uses the complete eligible server-owned risk inventory, not the selected subset. A model cannot turn limitations into risks or execution success into a positive. Static patterns and reputation results must also obey category/claim eligibility before presentation; they cannot bypass the validator through the route's later merge.

Apply chain/subject binding to registry recognition and risk candidates; suppress assertions when registry provenance cannot establish the request's chain and subject. Do not reuse legacy registry descriptions, audited/trusted badges, historical labels or reputation prose as a route around controlled rendering. Known protocol names are identity observations only.

Do not stream model prose or preview scores before validation. Stream step/progress events only while generating; publish the complete validated result afterward. No rejected response reaches result/done, cache or report persistence. Return a sanitized analysis_unreliable error and no score; retain phase/token diagnostics without prompt, wallet, calldata or raw response logging. No automatic retry on a semantic rejection.

Scoring is server-owned and versioned rather than freely generated by the model. Before implementation, enumerate the allowlisted risk/limitation scoring policy and inspect it independently: correlated limits do not stack into critical risk, success/zero value never lowers risk, and missing evidence never implies safety. Numerical weights are a transparent product heuristic, not loss probability or independent calibration. Do not copy the old AI score after removing unsupported findings. Rejected responses are never rescored into apparent success. A normal incomplete analysis may legitimately return a cautious assessed result with clearly separated limitations; unsupported AI selections return no assessment.

## API, Persistence And UI

Retain public verdict enum and warnings/positives arrays for extension compatibility. Store a bounded versioned report structure under details (evidenceVersion, findings, observations, limitations and score policy version). Validate this structure server-side and client-side; regenerate clients from OpenAPI rather than manually patching generated files if a typed schema extension is needed.

Web report shows Observations, Analysis Limits, Risk Findings and Supporting Evidence separately. Replace Safe to Sign with No Concrete Warning Signs Detected, qualified by the assessed data; low risk is not clearance to sign. Identify legacy stored records without the validated report version, rather than presenting them as validated. Neutral status observations never appear under trust. No decorative redesign or unrelated UX changes.

## Verification And Acceptance

- Pure tests: nonexistent/wrong-type/wrong-subject refs, allowed-code injection, duplicate/severity inflation, raw-unit magnitude, fake symbols/audits, mint/burn manipulation, NFT/ERC20 ambiguity, known-entity chain/subject binding, missing source/trace correlation and terminal failure. Empty selections and omitted material risks in either stage cannot suppress mandatory findings or lower the server-owned score.
- Route tests: both analysis paths reject before AI continuation/result emission/persistence/cache writes as appropriate; static patterns/reputation cannot reintroduce forbidden claims; missing data and invalid input have no score.
- Streaming tests: no unvalidated prose/preview score/result leaks, split JSON/usage trailers remain supported, truncation retains existing no-retry behavior.
- API/schema tests: deterministic regeneration/typechecks, bounded detail persistence and saved-report retrieval parity; legacy version handling and extension compatibility.
- UI tests and desktop/mobile inspection: separate category rendering, legacy notices, non-absolute verdict label, missing-data/error state, no overflow or score displayed for rejection.
- Fixtures cover Euler-shaped complex transfers, Aave-shaped deposit/mint, Uniswap-shaped swap, WETH Deposit-event gap, unknown/pending/reverted/EOA/deployment inputs. Fixtures prove rule behavior, not live exploit detection.
- After publication, operator runs fresh Euler/Aave/Uniswap/WETH reports. Model/provider privacy evidence, production quality and compliance NO_GO remain separate open gates.

## Review Checkpoint

Specification only; runtime is unchanged. Independent review and operator review of this document are required before implementation. Record the detailed scoring/claim table in the implementation plan; do not silently invent permissive free-text validation or treat reference matching alone as proof of an assertion.
