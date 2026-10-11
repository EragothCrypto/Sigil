# Colosseum Coding Pre-Task Acceptance

Current frozen UX candidate: application `c1a834ec92d9028e384b60c4901fa80313be4574`, [Preview](https://sigil-9m0oclrto-s3ntrylabs.vercel.app). All five same-candidate CI38149821945 gates passed; 491 Node tests plus four TS scripts, types/builds/codegen/wrappers, Gitleaks and scoped review passed. Final desktop/mobile entry, saved Aave report and live Mainnet partial snapshot (slot455695028, legacy27, unsupported2) verified. Presentation-only final refinement supersedes240afdc and the older freeze below; navigation/backend/detection/configuration unchanged. [UX acceptance, 20-pattern ledger, screenshots and jury walkthrough](colosseum-ux-polish.md). No production promotion or new security behavior. Earlier evidence below remains historical.

Updated 2026-10-11, 16:03 Europe/Berlin. Coding scope frozen at application `dad30cdc4c2b7dbe7f00dd2063aed8e48c1724f5`. This is scoped hackathon acceptance, not full original-phase completion, production authorization or EU/legal clearance.

## Candidate and Evidence

- [Immutable Preview](https://sigil-nanlyi0g2-s3ntrylabs.vercel.app), Preview deployment6996522900, not production. Jury access uses Kevin's separately supplied branch share URL; its access capability is not stored here.
- All five [CI gates38144968268](https://github.com/EragothCrypto/Sigil/actions/runs/38144968268) passed: verify, full advisory audit, reproducible extension package, real isolated PostgreSQL privacy and retention.
- Final local478 Node tests plus four TS scripts passed (application publication baseline475; three additional verifier access-redaction regressions). Workspace types, API/web builds, generated-code drift and built EVM/Solana wrapper smokes passed. Staged Gitleaks/default rules/redaction and whitespace passed for application publication.
- Real disposable PostgreSQL helper and built HTTP privacy/retention checks passed. Empty/missing legacy schema is rejected without runtime repair; explicit bootstrap is isolated and guarded. Numeric private IDs denied, legacy private rows not backfilled, UUID uniqueness enforced, curated cases preserved, cutoff/repeat/failure/rate-limit recovery verified. No deployed migration.
- Narrow independent schema review: no concrete blocker. Catalog predicate adversarial shapes were statically reviewed; no claim of exhaustive database-index or full repository audit.
- Live EVM final rerun at15:58Berlin: Aavefresh `findings-v2`, caution35; Eulerfresh `findings-v2`, dangerous80 with exact historical exploit evidence. UUID records persisted/retrieved; both results rendered at1440x1000/390x844. Screenshots inspected, no horizontal overflow/page errors. `tmp/colosseum/evm-preclose/report.json` and PNGs.
- Actual desktop/mobile journey passed: malformed hash400/no verdict -> valid scanner input -> report -> actual fresh reanalysis with new UUID on desktop -> Solana navigation -> labeled Review example -> Scanner navigation. No signing or fabricated live delegate.
- Same candidate live Mainnet: public authority `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ`, legacy27, Token-2022unsupported2, correctpartial, finalized slots455675389/455675404. Devnet rerun also passed on both viewports. Counts/slots are historical observations, not future guarantees.
- Final real Mainnet empty control: documentation address `A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd`, both program counts0/complete, `no_delegates_found` at finalized slots455677412/455677422. Scope is successfully returned token accounts only, not wallet safety. Preserved separately in `tmp/colosseum/preview-mainnet-empty/`; original nonempty report restored at its documented path.
- Six labeled synthetic outcomes, no-auto-scan, malformed HTTP200 rejection, invalid input, wallet/cluster binding, no-store and evidence link cluster checks passed in both live Solana suites. Mainnet/Devnet reports under `tmp/colosseum/preview-mainnet/` and `tmp/colosseum/preview/`.
- Deployed HTML SHA256 `3a84d62a80dec800c5d95df6ffb74673f7365889a73168dc22c2ec5f09b44568`. Local HTML hash is recorded separately; these are not asserted identical builds.

## Requirement-by-Requirement Pre Closure

| Pre requirement | Authoritative verification | State |
| --- | --- | --- |
| P00 bounded/privacy/signing/build demo safeguards | Baseline, real privacy/retention, wrapper smokes, exact CI and live browser controls | Done in pre scope |
| P01 versioned identity/status/coverage | wallet-state/rpc/client-validator tests; live wallet, cluster, finalized slots and per-program coverage | Done in pre scope |
| P02 sourced EVM records; separate synthetic scenarios | Euler exact-hash source-backed live finding; six fixture provenance/link tests and browser checks | Done in pre scope |
| P03 deterministic delegate outcomes; failure is not absence | official codec -> evaluator -> generated validator -> presenter tests; partial/unavailable/negative browser branches | Done in pre scope |
| P04 official SDK, bounded read transport/genesis/caps | rpc and wallet-state tests reject wrong genesis/IDs/bytes/cancellation/429; real Mainnet/Devnet reads | Done in pre scope |
| P05 both program queries; legacy supported decoding | actual coverage includes legacy and Token-2022 query; official layout/COption/owner/corruption/account-cap tests | Done in pre scope |
| P06 exact delegate/account/raw evidence | u64/presenter integration tests; six-question synthetic account report; exact ordinary bound, frozen/zero caveats | Done in pre scope |
| P07 unsupported Token-2022 label only | real nonempty Mainnet/Devnet unsupported coverage remains partial | Done in pre scope |
| P08 manual usable view/API/errors/examples | actual desktop/mobile six cases, explicit scan, invalid/malformed response, no auto scan | Done in pre scope |
| P10 navigation into both tools | actual scanner -> report -> Solana -> scanner journey on desktop/mobile | Done in pre scope |
| P15 preserve EVM and demo controls | full baseline plus fresh Aave/Euler, saved reports, fresh reanalysis and qualified historical ABI/source evidence | Done in pre scope |
| P16 evidence-specific manual guidance/no signing | presenter six questions, exact capability, official manual review reference, UI no signer/broadcast path; tests | Done in pre scope |
| P20 focused safety/dependency/resource/build checks | all five CI gates, local builds/types/codegen, provider-boundary and malformed data tests | Done in pre scope |
| H03 stabilized exact EVM candidate | no runtime DDL; actual fresh controls and combined journey | Done |
| H04 authorized Preview, headers/dispatch/access | exact GitHub deployment/CI, real shared-access fresh Chrome contexts, CSP/API/no-store controls | Done; human must provide jury share link |
| H05 coding submission materials | factual draft, script, logo already in application, candidate and copyable test inputs supplied | Done; personal fields/videos/repo permissions manual |
| H06 coding feature freeze/final smoke | frozen application SHA, same-candidate live evidence and combined journey | Done; portal submission/receipt manual |

Audit pre slices G01-G12 remain preserved, not reclassified as full GO: extension isolation/exactly-once regressions and reproducible package; UUID privacy; unchanged published legal facts/notices; no new vendor/tracker/paid infrastructure; no protective-service promises; retention; no new wallet-payload/secret logging; SDK/component inventory and dependency audit; changed-screen keyboard navigation/mobile/errors; honest integration claims; exact EVM/Solana controls; no billing. Original operational, Store, vendor/legal, full accessibility and license-clearance requirements remain Post-Colosseum as mapped in the roadmap.

## Actual Changes in This Closure

- `analysis-schema.ts`: SELECT-only required-column and unique-ID preflight; coalesced success and failure retry. Runtime DDL removed.
- `scripts/analyses-schema.sql`: previous bootstrap retained outside server import graph; operator authorization required for any deployed use.
- `analysis-retention.test.cjs`, `vercel-routing.test.cjs`: read-only/fail-closed regressions replace automatic-repair expectation.
- `verify-retention-http.mjs`: guarded explicit disposable-fixture bootstrap and missing-schema/no-repair checks; previous privacy/retention assertions retained.
- `verify-colosseum-evm.mjs`: real fresh stream/history/desktop/mobile and scanner/reanalysis/Solana-navigation reproduction; access capability omitted from reports.
- `colosseum-evm-guard.test.mjs`: reproduced a malformed access URL leaking through uncaught Node configuration errors; configuration now fails with fixed bounded JSON before browser loading. Missing/malformed/wrong-host cases pass without value disclosure. Successful live behavior is unchanged.
- Deployment guide, roadmap, planning state, test checklist, submission draft and handoff corrected to current acceptance.

## Jury Reproduction

1. Use Kevin's share link for the current branch Preview. Open `/solana`; **Load Mainnet address**, then **Check wallet**. Explain finalized slots and partial coverage, not wallet safety.
2. **Review example**: explicitly synthetic; balance500/allowance250/ordinary bound250 raw units. Show what the permission can do and the manual next action. Incomplete/Unavailable cannot establish absence; Frozen/Zero-bound do not establish future safety.
3. Scanner, Ethereum: Aave `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Show qualified supplyWithPermit intent, raw evidence and current-only historical ABI limitation.
4. Scanner, Ethereum: Euler `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d`. Show exact source-backed historical exploit attribution, not current wallet exposure.
5. Provider latency is variable. A previously saved report is evidence at its recorded time, not a fresh scan. Actual current live failure must remain unavailable; do not substitute a synthetic victim.

Automated reproduction: provide the authorized access URL via process-only `SIGIL_PREVIEW_URL`, ensure Chrome/Playwright resolution, then run `node scripts/verify-colosseum-evm.mjs`, `node scripts/verify-solana-demo.mjs --live --mainnet --require-accounts` with the Mainnet input in `SIGIL_TEST_WALLET`, and `node scripts/verify-solana-demo.mjs --live` with that override removed for the documentation Devnet input. Existing build/type/baseline commands are in the live-test checklist. TLS verification stays enabled.

## Only Human Submission Work Remains

Kevin: arrange actual private repository reviewer access; supply the authorized Preview share link in the portal; complete track/personal fields and disclose prior work; record/upload presentation and demo using the supplied scripts; submit and confirm the receipt. No automated submission, production promotion or permission changes were performed.

Not shipped: Incident Exposure Checker, live incident correlation, full Token-2022/mint/protocol-position support, continuous monitoring, accounts/billing, prepared/automatic revocation, execution simulation, loss valuation or full public-production/EU release clearance. Existing Vite chunk/sourcemap warnings remain nonblocking build warnings, not hidden or called warning-free.
