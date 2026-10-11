# Colosseum Differentiation: Feasibility and Implementation

## Feasibility Gate (2026-10-11)

Decision: do not ship Incident Exposure Checker in this sprint. Ship the user-authorized action-first Solana Delegate Checker fallback. This is a timeboxed conclusion for the existing pipelines and reviewed incidents, not a claim that incident correlation is impossible in general.

| Candidate | Authoritative evidence | Current evidence / predicate gap | Decision |
| --- | --- | --- | --- |
| Euler V1, Ethereum chain ID1, March13 2023 | [Euler Labs recovery account](https://www.euler.finance/blog/war-peace-behind-the-scenes-of-eulers-240m-exploit-recovery); existing exact-hash catalog binds first exploit `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d` to destination `0xebc29199c817dc47ba12e3f86102564d640cbf99` | Catalog attributes historical transactions, not current effective wallet exposure. approvals.ts scans bounded historical events and explicitly does not read current allowance. Token-response adapters do not establish effective rights or a complete position predicate. No current affected-wallet positive control is established. Historical interaction/absence cannot answer Am I Affected. | Unsupported in this slice |
| Raydium December16 2022, Solana mainnet | [Raydium postmortem](https://raydium.medium.com/detailed-post-mortem-and-next-steps-d6d6dd461c3e) identifies compromised admin `HggGrUeg4ReGvpPMLJMFKV69NTXL1r4wQ9Pk9Ljutwyv` and authority rotation | This is protocol admin/pool authority, not an ordinary user SPL delegate. Existing decoder checks legacy token-account delegates only, not Raydium program state, positions or historical compensation. No complete supported exposure predicate or live affected-wallet control is established. | Unsupported in this slice |

Neither candidate establishes exact current permission/position semantics needed for ACTION_REQUIRED or a genuine scoped NO_MATCHING_EXPOSURE. Do not create an empty registry or an incident selector that implies support. Current RPC allows getGenesisHash/getTokenAccountsByOwner, at most three calls, 18s/512KiB/100-account caps. Mainnet/Devnet reads already passed on desktop/mobile; public RPC has no SLA and failures remain unavailable. EVM analyze routes execute schema DDL and must not be used under the no-migration boundary.

## Selected Design

**Goal:** Turn decoded account data into a bounded, actionable permission review without inventing an incident, malicious address or victim.

**Architecture:** Preserve the Solana endpoint, report version, official decoder, generated contracts and EVM tools. Add a pure client-side presenter over validated reports, versioned guidance and visibly synthetic fixtures. Integrate action-first summaries and per-account evidence/guidance into the existing /solana page. No new dependency, provider, account, persistence, transaction preparation, signature, custody, automatic revoke or background job.

**Authority:** [Solana delegate semantics](https://solana.com/docs/tokens/basics/approve-delegate) and [revoke semantics](https://solana.com/docs/tokens/basics/revoke-delegate). Ordinary allowance permits bounded transfer and non-native-token burn authority, not general control of SOL/wallet/mints. Account-state arithmetic is an upper bound under ordinary rules, not a simulated executable transaction. Mint state, decimals/economic value, actor control and Token-2022 semantics remain unverified.

**Outcomes:** review known permissions first even with incomplete coverage; otherwise distinguish incomplete/unavailable from complete scoped absence. Zero balance/allowance/frozen are review observations, not future safety. Synthetic review/negative/partial/unavailable/frozen/zero cases have no live evidence links. Live links use fixed official explorer host and explicit cluster. Account identity remains the full address, not an invented symbol.

## Execution Checklist

- [x] Add failing presenter/fixture/semantic/UI tests; verify red.
- [x] Implement pure action summaries, permission guidance and examples; preserve API.
- [x] Integrate account-specific six-question report, explorer provenance and Mainnet example input.
- [x] Expand browser checks: all fixture branches, negative/partial API contract tests, tampered data, links, no auto scan/signing and responsive views.
- [x] Run local baseline, types, builds, codegen, built API smoke, live Mainnet/Devnet browser reads and prod dependency audit; staged secret gate before publication.
- [x] Independent bounded review; provenance correction and affected regression/browser checks passed; no remaining concrete blocker in follow-up review.
- [ ] Update sprint/demo/submission docs with evidence and shipped versus planned scope; authorized commit/push/preview smoke only.

## Jury Journey

Enter public owner address -> choose Mainnet -> explicit check -> next action -> coverage -> account evidence when present -> manual guidance. Mainnet public protocol token-account authority `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ` is an acquisition control, not a person or incident victim. Positive delegate arithmetic and frozen/zero cases are visibly synthetic unless actual current data independently establishes them. Negative absence is scoped only; failures never become negative.

## Release Boundary

No production action or migration. No claim of full incident correlation, token valuation, complete wallet safety or legal release. Private repository/jury share access, EVM live no-DDL path, videos and user submission remain separate open gates.
