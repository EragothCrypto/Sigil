# Findings V2 Policy And Fixed Evaluation

## Scope

Integration checkpoint 2026-10-07: the implementation worktree wires these findings into both routes, strict cache validation and web/extension consumers. Combined suite239passed, workspace typechecks/builds and synthetic browser QA passed. Whole specification and follow-up quality reviews approved the implemented scope. The historical owner handoff notes below describe the evaluator's narrower responsibilities, not a current integration blocker. Deployment and installed-build QA remain separate.

Implements the approved six-step design's scoring/finding boundary, not the entire
acquisition, route, cache, simulation or presentation rollout. No live network,
database, paid inference or signing is used by this evaluation.

Owned files: `validated-findings.ts`, `validated-findings.test.cjs`, new
`six-step-evaluation.test.cjs` under `artifacts/api-server/src/routes/sigil/`,
and this document. Integration changes belong to the primary and UI owners.

## Policy Oracle

Report version: `findings-v2`. Policy: `dual-floor-v2`.

```text
evidenceRiskScore = null if no accepted risk, otherwise max(applicable risk floors)
uncertaintyScore  = max(0, applicable coverage floors)
decisionScore    = max(5, evidenceRiskScore ?? 0, uncertaintyScore)
riskScore        = decisionScore  # backwards-compatible render alias
inventory.score  = decisionScore  # backwards-compatible inventory alias
```

| Evidence or gap | Floor | Category |
| --- | ---: | --- |
| Curated Ethereum dangerous destination flag | 90 | risk |
| Exact source-backed historical exploit-execution transaction | 80 | risk |
| Source unverified | 40 | limitation |
| Source unknown | 35 | limitation |
| No accepted ABI decode or local selector hint | 35 | limitation |
| Missing/partial usable receipt | 35 | limitation |
| Unresolved inclusion/outcome (including reverted effects) | 35 | limitation |
| Ambiguous/unchecked transaction-specific allowance or permission grant | 40 | limitation |
| Current ABI / unresolved historical implementation semantics | 35 | limitation |
| Partial or unavailable ABI intent decoding | 35 | limitation |
| Raw units, absent traces, neutral mint/burn-shaped events | no increment | limitation/observation |
| Victim, recovery, association-only historical roles | no increment | observation |

Gaps never add together. Source verification, familiar identity and execution
success never deduct points or establish signing clearance. Contract-reported
permission queries do not remove the transaction-specific grant uncertainty.
Reported decimals do not authenticate token movement, economic size or price.

Legacy verdict boundaries remain `<=25 safe`, `<=60 caution`, otherwise
`dangerous`; `safe` means a qualified no-warning label, never safety approval.
Legacy risk levels remain `<=25 low`, `<=50 medium`, `<=75 high`, otherwise
`critical`. These apply to the heuristic decision score, not probabilities.

## Report Contract For Integrators

```typescript
type ValidatedReport = LegacyValidatedReport | ValidatedReportV2;
type ValidatedReportV2 = {
  version: 'findings-v2';
  scorePolicy: 'dual-floor-v2';
  evidenceRiskScore: number | null;
  uncertaintyScore: number;
  decisionScore: number;
  coverage: 'complete_for_supported_checks' | 'partial' | 'unavailable';
  capabilities: {
    sourceVerification: boolean;
    receiptEvents: boolean;
    incidentLookup: boolean;
    inputDecoding: boolean;
    reportedTokenState: boolean;
    reportedPermissionState: boolean;
    internalTraces: false;
    isolatedBalanceDeltas: false;
  };
  findings: Array<{
    id: string; code: string;
    category: 'observation' | 'limitation' | 'risk' | 'supported_indicator';
    text: string; evidenceRefs: string[];
  }>;
  evidence: Array<{
    id: string; kind: string; subject: string; value: string;
    transfers?: ReceiptTransfer[];
    incident?: IncidentEntry;
    input?: InputEvidence;
    tokenStates?: TokenState[];
    permissionStates?: PermissionState[];
  }>;
};
```

The discriminator is **`version`**, not an additional `reportVersion` field.
Findings use `f:<code>` and references use `e:<code>`. All inventory findings
remain mandatory, including when model selection is empty. Text is bounded to
500 characters, evidence value to 2000 characters, and the fixed generator
produces at most 32 findings/evidence records. Transfers retain the existing
bounded shape and maximum 50 records; raw values stay strings.
Combined inventory and serialized v2 report must each fit **65536 UTF-8 bytes**.
Generation throws `Validated finding report exceeds serialization bounds;
assessment unavailable` before returning an oversized inventory to the model.
Selection validation and rendering recheck the same bounds. No verdict, reduced
mandatory finding set or silent evidence truncation is returned on overflow.
The caller must propagate this as unavailable/error, never a safe fallback.

Evidence extensions:

- `historical_incident`: `incident` preserves catalog `name`, transaction `date`,
  `role`, `network`, exact `hash`, `reviewedAt`, and `sources[{url,title,claim}]`.
  Evidence `subject` is `network:hash`, not destination address. No caller-supplied
  incident labels or URLs become attribution. Only catalog exploit-execution
  roles get the 80 floor; other accepted roles remain historical observations.
- `decoded_intent`: `input` preserves ABI evidence `status`, `source`,
  `provenance{network,address,blockTag,scope,proxyResolved?,abiAddress?}`,
  `historicalCertainty`, `reason`, canonical `signature`, bounded typed
  `arguments[{name,type,value}]` and optional bounded `subcalls`. Destination
  `address` remains the transaction target; `abiAddress` may identify the current
  implementation ABI source. Values are normalized strings/booleans/null,
  arrays or objects, not numeric raw units.
- `reported_token_state`: `tokenStates` contains emitter-bound
  `{address,status,blockTag,authority:'contract_reported_interface',decimals?,
  balanceRaw?,reason?}`. Available ERC20 interface-candidate responses require
  decimals 0..36 and unsigned uint256 decimal strings. Unavailable states are
  not promoted to successful queries. No untrusted symbol establishes identity.
- `reported_permission_state`: `permissionStates` contains
  `{token,owner?,caller?,spender?,blockTag,kind,rawValue,tokenIdRaw?,
  authority:'contract_reported_interface'}`. ERC20 allowance and operator
  approval bind `owner` to transaction sender and spender to calldata.
  ERC721 `getApproved` binds **caller**, not owner, to transaction sender and
  `tokenIdRaw` to calldata. Its returned address is a contract-reported response,
  not proof the caller owns the token. Operator raw values are `'0'`/`'1'`.

All non-incident evidence subjects retain `network:destination`. Findings state
the authority limits explicitly. `abi_historical_uncertain`, `adapter_coverage`
and `allowance_unknown` are limitations, not detected attacks.

`inputDecoding` means accepted bounded call decoding, including
`partial/current_abi_only` and partial subcalls. It does not mean historical
certainty or complete child coverage. Legacy adapter `inputDecoding:false` with
a valid partial signature is accepted; report capability is recomputed.

`receiptEvents` means usable receipt events were acquired, not complete event or
balance coverage. `sourceVerification` means verification state was acquired,
including an explicit unverified result. `incidentLookup` means the offline
exact lookup was performed, not an incident match or novel exploit detection.
Current transaction generation reports `partial` when some bounded checks are
available, otherwise `unavailable`; contract metadata reports partial only when
verification state is established. `complete_for_supported_checks` is reserved;
it is never emitted by these incomplete acquisition paths and never means audit.

## Evidence Validation Boundary

`adapters-v1` envelopes must match network, destination and recorded block (or
explicit `latest` fallback), declared bounds and capabilities. State token
addresses must match retained receipt emitters; permission caller/owner,
spender, token ID and block must match their query context. Duplicate,
malformed, overflowing or contradictory state entries fail closed. Invalid
adapter evidence produces mandatory `adapter_evidence_invalid`, no decoded
intent or state capability, and does not erase the source/receipt findings.

ABI signatures, argument types/values and subcalls are rebound to canonical
calldata through the existing viem-backed decoder. A signature with substituted
argument values cannot forge decoded intent. Named tuple objects are compared
recursively by canonical ABI component position/type against positional tuple
arrays; adapter declaration order is preserved, not sorted or reduced to a set
of values. The actual ABI-to-adapter-to-findings Uniswap `exactInputSingle`
regression accepts named parameters and rejects altered values, extra fields,
swapped components and reordered fields. The report retains the original named
object; this does not change the schema or historical authority.
New evidence is bounded to 64KiB;
token states to eight, permission states to four, attempts to 32 and decoded
subcalls to 16/depth four. Current `adapters-v1` acquires **current-only** ABI
provenance: claiming `historical_bound`, resolved historical proxies or
historical certainty is rejected. Adding historical authority needs an explicit
acquisition contract, block-bound implementation proof and new tests.

These are consistency checks on internally acquired evidence, not cryptographic
authentication of arbitrary external JSON. Matching, well-shaped responses may
still be lies from a malicious contract. This layer never converts them into
rights, confirmed effects, implementation guarantees or trust indicators.

## Fixed Corpus And Acceptance

Corpus: **fixed-corpus-v1**, 31 transaction fixtures plus one reproducibility/
incident-truth gate. The owned policy unit suite supplies 15 additional tests,
including malformed envelopes and substituted ABI arguments. Each fixture lists
mandatory IDs/categories, applicable risk/gap rule inputs, allowed coverage and
provenance expectations. The evaluator derives scores and verdicts from the
independent rule table; there are no desired Euler/benign score overrides.
The size guard covers at-limit acceptance, above-limit rejection, multibyte
UTF-8 overflow, over-32 records and post-generation mutation before selection.

| Fixture group | Count | Derived risk / uncertainty / decision |
| --- | ---: | --- |
| WETH deposit, Aave supply, Uniswap swap (synthetic canonical calls) | 3 | null / 35 / 35 |
| Neutral mint, burn, ERC721 raw ID, EOA | 4 | null / 0 / 5 |
| Creation/unknown destination, unknown selector, partial receipt, pending, reverted | 5 | null / 35 / 35 |
| Unverified source, correlated acquisition gaps | 2 | null / 40 / 40 |
| Approval, lying allowance, NFT queried approval/operator | 4 | null / 40 / 40 |
| Wrong-network adapter, wrong permission spender | 2 | null / 40 / 40 |
| Unresolved proxy, unknown multicall child, lying token/spoofed event, unavailable ABI | 4 | null / 35 / 35 |
| Exact exploit execution | 1 | 80 / 0 / 80 |
| Exact victim/recovery, wrong-network/neighboring incident hash | 4 | null / 0 / 5 |
| Dangerous registry destination | 1 | 90 / 0 / 90 |
| All supported acquisition unavailable | 1 | null / 35 / 35 |

The creation/unknown-source group contains five fixtures: creation unknown
destination, unknown selector, partial receipt, pending and reverted.
Acceptance gates: zero missing declared mandatory findings, zero unsupported
risk categories, zero tested effect/trust claims, correct unavailable/partial
states, exact references and provenance, and byte-for-byte deterministic reruns.
There are two supported risk-positive fixtures and 29 with no accepted risk;
coverage cautions are not mislabelled as evidence-backed attacks.

Three fixtures use independently sourced catalog incident roles (one exploit,
one victim, one recovery). The evaluator requires the exact exploit hash to
exist with primary publication support; removing incident truth fails the gate.
The catalog sources are already curated offline; this task does not re-fetch
or independently re-review those publications. There is no catalog association
entry to benchmark. That role, unconfirmed attribution, additional incidents,
real archived protocol calls and novel exploit detection are excluded from
incident-truth counts, not fabricated positives or claimed coverage.

This small hand-selected corpus is biased toward known boundaries and regressions.
Protocol fixtures are synthetic intent/receipt shapes, not independent proof of
benign behavior. Results are deterministic acceptance, **not statistical false
positive rates, calibrated probabilities, representative accuracy or general
attack detection**. Missing representative truth remains an incomplete broader
benchmark even when these acceptance gates pass.

## Verification And Handoff

```powershell
node --test artifacts/api-server/src/routes/sigil/validated-findings.test.cjs artifacts/api-server/src/routes/sigil/six-step-evaluation.test.cjs
pnpm --filter @workspace/api-server typecheck
```

Primary/UI integration must keep v1 parsing and scores unchanged, rotate v2 cache
namespace, preserve source links/role labels, and distinguish risk from coverage
in presentation. No endpoint/cache migration or other tests are edited here.
Full JSON/SSE, cache/persistence, browser/mobile, extension and simulation checks
remain the integration owners' gates; this evaluator does not claim to run them.
