# Sigil: Colosseum 24-Hour Delivery Roadmap

Updated: 2026-10-11. Kevin explicitly changed priority from completing P00 to a hackathon-ready version within 24 hours. Approved scope: existing EVM tools plus a narrow real manual Solana wallet/delegate check; no accounts or always-on monitoring.

## Deadline and Success

Planning clock: 2026-10-11 09:08 UTC / 11:08 Europe/Berlin. Internal delivery target: 2026-10-12 09:08 UTC / 11:08 Berlin. This is a delivery target, not a completion guarantee.

Official [World's Fair rules](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf), checked 2026-10-11, section 5: closes October 12, 2026 at 11:59pm PT (October 13 at 08:59 Berlin). Administrator's clock and updated rules prevail. [FAQ](https://colosseum.com/hackathon): all ecosystems eligible, disclose prior development, repository review access, presentation video 2-3 minutes and product demo at most 3 minutes. Kevin must confirm registration and submit through his account. No prize or eligibility guarantee.

The demo must answer: what needs review, why, what evidence supports it, and what remains unknown. A real bounded Solana RPC read is necessary to claim a live Solana integration. Synthetic examples are visibly separate; never invent a malicious mainnet address. Existing EVM scanner results remain qualified and available.

## Final Differentiation Sprint

Feasibility gate completed 2026-10-11: neither the reviewed Euler historical attribution nor Raydium protocol-admin incident has a supported current effective wallet-exposure predicate in the existing pipelines. Do not ship an Incident Exposure Checker, an incident selector or NO_MATCHING_EXPOSURE from historical interaction. Detailed rationale, source references and narrow plan: [feasibility/design](superpowers/plans/2026-10-11-colosseum-differentiation.md).

Selected user-authorized fallback: action-first Solana Delegate Checker. Next action comes before raw data; each permission answers what/why/capability/evidence/manual review/unknowns. Fixed-host, cluster-bound explorer links; exact raw balance/allowance/bound; frozen/zero distinctions; explicit coverage; six labeled local demo branches. No new providers/dependencies, incident feed, transactions, signing, storage or migrations. [Verification and demo handoff](colosseum-differentiation-sprint.md).

Coding pre scope is accepted and frozen at applicationdad30cd: runtime DDL removed; fresh Aave/Euler, actual scanner/reanalysis/cross-chain journey and Mainnet/Devnet desktop/mobile passed; all five CI gates green. [Final coding acceptance and manual handoff](colosseum-pre-close-handoff.md). Only human reviewer permissions/share-link delivery, videos, personal portal fields and submission/receipt remain. Incident registry/correlation is Post-Colosseum until exact live predicates and trustworthy positive/negative controls exist.

## Delivery Order

These are timeboxes from the planning clock, not estimates that authorize lowering correctness requirements. Work proceeds automatically except for external actions or essential human facts.

| ID | Target | Deliverable | Exit Gate | State |
| --- | --- | --- | --- | --- |
| H00 | Hours 0-1 | Reprioritize every original phase and audit group; confirm scope | Approved EVM + narrow Solana scope and persisted plan | Done; independent plan review approved |
| H01 | Hours 1-7 | Versioned manual Solana scan: validated addresses, bounded RPC, official SPL codecs, ordinary delegate findings | Tested partial/failure semantics; exact integer amounts; both token programs queried; no signing | Slice done; live Devnet and nonempty Mainnet reads passed |
| H02 | Hours 7-11 | Usable Solana view within existing product; action-first permission report, provenance, examples and clear manual review steps | Desktop/mobile loading, scoped absence, partial, unavailable, frozen/zero and invalid-input paths | Fallback done in scope; candidate8acba96 live Mainnet/Devnet desktop/mobile and five CI gates passed |
| H03 | Hours 11-14 | Stabilize EVM demo paths and new endpoint; required build/type/regression checks | Aave/Euler expectations retained; changed routes tested; no crashing malformed response | Done in pre scope; SELECT-only runtime, fresh Aave/Euler and475+fourTS/types/build/codegen/wrapper/real SQL gates passed |
| H04 | Hours 14-17 | Release candidate and authorized deployment smoke | Exact candidate identified, headers/API dispatch checked; rollback available | Done; dad30cd Preview6996522900, all five CI gates and shared-access EVM/Solana desktop/mobile live passed; production unchanged |
| H05 | Hours 17-20 | Submission package, demo scripts, factual integration list and development disclosure | Copyable test inputs; videos can be recorded; no unsupported claims | Coding/materials done; Solo Founder confirmed; videos/personal fields/jury repository permissions manual |
| H06 | Hours 20-24 | Feature freeze, fix demo blockers only, final smoke and submission buffer | Reproducible jury walkthrough; Kevin submits and verifies receipt | Coding freeze/final combined journey done; actual submission and receipt remain Kevin's task |

At hour 7, if Solana acquisition cannot meet the exit gate, stop breadth expansion and repair the narrow read path. At hour 14 freeze features. If deployment is unavailable, keep the locally reproducible candidate and recorded demo; do not represent it as deployed. Deferred optional work must not consume the submission buffer.

## All Original Phases: Pre/Post-Colosseum

For every mixed phase, only the explicitly listed pre slice is in this sprint. Every other task, acceptance condition and dependency in that original phase remains post-Colosseum, not deleted or marked complete. Original phase numbers remain stable. A delivered slice is not full-phase completion.

| Phase | Importance | Pre-Colosseum Slice | Post-Colosseum Remainder |
| --- | --- | --- | --- |
| P00 Baseline/security | Pre critical, remainder post | Preserve privacy/signing boundaries, bounded failures, honest claims, working builds and demo regressions | Remaining full release/compliance/Store/operational evidence and exhaustive unchanged-surface QA |
| P01 Domain/capabilities | Pre critical, remainder post | Solana identity, versioned scan status, per-program coverage, slot and reasons | Full cross-chain package extraction, future/cloud contracts and capability service |
| P02 Threat registry | Pre minimal, remainder post | Preserve sourced EVM incident records; separate labeled synthetic test scenarios | Production Solana registry, ingestion/admin/revisions; no unsourced threat escalation |
| P03 Exposure engine | Pre critical, remainder post | Deterministic ordinary delegate review; failure != scoped absence; no AI decision authority | General threat-correlation/rule catalog and retraction fanout |
| P04 Solana adapter | Pre critical, remainder post | Official identity/token SDK, read-only allowlist, genesis, deadline/bytes/accounts caps; live read smoke | Paid providers, SLA/failover/history/indexing and production provider selection |
| P05 Wallet state | Pre critical, remainder post | Both owner-account program queries; decode supported legacy SPL account state with provenance | Complete mint metadata/state and broad Token-2022/position coverage |
| P06 SPL delegates | Pre critical, remainder post | Delegate, raw delegated amount/balance, ordinary review and exact account evidence | Full threat-backed escalation, advanced authority eligibility and richer watch context |
| P07 Authorities/Token-2022 | Post; pre coverage label | Query Token-2022 and show unsupported semantics explicitly | Extension/mint/freeze/permanent-delegate detectors and validated interactions |
| P08 Manual monitor slice | Pre critical | Address input, explicit scan, usable findings/evidence/errors and demo cases | Full local watchlist-v2 migration and all original correlation scenarios |
| P09 Snapshots/diffs | Post; optional only after H03 | None required; never claim resolution from failed rescan | Persistent comparable history, transitions, revisions and pruning |
| P10 Command experience | Pre important, remainder post | Clear navigation into Solana check and EVM investigation; no disconnected second app | Full action-first command home and richer cross-wallet workflows |
| P11 Accounts/cloud opt-in | Post | No auth provider, no server watch or silent wallet upload | Tenant-bound accounts, opt-in, export/delete and cloud notices |
| P12 Durable monitoring | Post | No background monitoring claim or cron addition | Queue/leases, recurring scans, threat recorrelation, cadence and budgets |
| P13 Alerts/delivery | Post | No external channels or browser-closed alerts | Durable in-app/outbound transitions, preferences and delivery reliability |
| P14 Protocol exposure | Post | No universal DeFi position claim | Named protocol adapters, source-backed program/position relationships |
| P15 Unified EVM | Pre preserve, remainder post | Keep existing EVM tools and limitations; verify demo controls | Current effective allowance model, Permit2/NFT/proxy-state integration |
| P16 Guided remediation | Pre review guidance, remainder post | Evidence-specific manual review steps; never construct/sign/broadcast | Reviewed revoke templates, independent wallet authorization and freshness |
| P17 Assistant | Post | Existing bounded EVM explanation only; Solana does not depend on AI | Grounded authorized report assistant and evaluation/refusal quality |
| P18 Commercial readiness | Post | Business model described as a plan, not active billing | Entitlements, checkout, paid hosting and consumer/commercial assessment |
| P19 Advanced integrations | Post | Do not expand extension interception or external APIs | Extension rollout, scoped SDK/API, webhooks/Telegram/feeds and integrations |
| P20 Scale/readiness | Pre focused smoke, remainder post | Changed-route safety, dependency/license check for new SDK, deadline/error/resource bounds | Scale/load/SLOs, full operational/public-release readiness and hardening |

## Existing Audit Backlog

The full audit `NO_GO` is not relabeled `GO`; a hackathon demo checkpoint is a separate technical decision. The hackathon is not a legal exemption. Do not remove existing notices, authentication/privacy protections or controls to meet the deadline. No new trackers, custody, cloud profiling, paid providers or external notifications in this scope.

| Gate | Pre-Colosseum | Post-Colosseum |
| --- | --- | --- |
| G01 Extension | Preserve independence/exactly-once; exclude unverified extension update from demo claims | Installed wallet/Store rollout and expanded integration |
| G02 Private results | Existing UUID/non-enumeration boundary must not regress | Authorized production migration and comprehensive rollout verification |
| G03 Legal facts | Preserve existing published facts; do not invent clearance | Qualified applicability/serviceability review |
| G04 Vendors/AI | No new paid vendor; document RPC public-address disclosure; do not depend on Solana AI | Full contractual/retention/transfer evidence before affected production rollout |
| G05 Incident readiness | No automatic protective-service promises | Operational tabletop, absence/reporting evidence |
| G06 Retention | Preserve existing limits; no new persistent wallet service | Production cron/restore/backup evidence and cloud retention |
| G07 Logs | No secrets/wallet payload logging introduced | Full vendor logs/access/retention evidence |
| G08 Lifecycle/licenses | New SDK provenance/license and working candidate build/tests | Signed provenance/full asset review/remote rulesets/support policy |
| G09 Accessibility | Keyboard/mobile/error states on changed demo screens | Exhaustive manual contrast/AT/real-device and full legal assessment |
| G10 Claims | Honest scope/integration/development-history disclosure | Qualified translations and commercial review |
| G11 Quality | Exact EVM controls + Solana success/partial/unavailable fixtures | Wider unchanged-chain/extension/optional-path QA |
| G12 Paid eligibility | No billing or automatic hosting upgrade | Commercial eligibility and paid-service review |

Broad unchanged-surface browser reruns and open organizational evidence no longer block private H01-H03 implementation. Public deployment still needs an explicit scoped decision; this plan does not create legal clearance or authorize production mutations.

## Integration and Jury Walkthrough

1. EVM: analyze Aave mainnet hash `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`; show decoded intent and remaining historical limitations.
2. EVM: analyze Euler mainnet hash `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d`; show exact sourced historical attribution, not a live compromise assertion.
3. Solana: explicit public-wallet read; show token-account/delegate evidence and finalized slot range. Exact live input and cluster are recorded after the read succeeds, not guessed.
4. Synthetic Solana delegate and unavailable cases: visibly identified fixtures using the same deterministic evaluator; unknown delegate means review, not confirmed maliciousness.
5. Show read-only/noncustodial limitations and review steps, then product direction: future continuous monitoring is roadmap, not shipped.

Submission checklist: registration/team facts, repo access, logo, live/local setup, presentation video, demo video, development-before/during-period disclosure, target user/problem, competitor differentiation, distribution plan and honest demand evidence. No fabricated traction, revenue, testimonials or market-size numbers.

## Current Execution State

Superseding final coding state: applicationdad30cdc4c2b7dbe7f00dd2063aed8e48c1724f5 frozen, [Preview](https://sigil-nanlyi0g2-s3ntrylabs.vercel.app), five CI38144968268 gates passed. Runtime schema checks no longer execute DDL; isolated privacy/retention passed, no deployed migration. Fresh live Aave/Euler and scanner -> fresh reanalysis -> Solana -> scanner on desktop/mobile passed at15:58Berlin; same-candidate Mainnet/Devnet live passed. Detailed requirement-by-requirement Pre evidence and manual-only handoff: [coding pre-close](colosseum-pre-close-handoff.md). Do not infer full P00/original-phase/legal/production completion.

### Historical Execution Checkpoints

The notes below are retained chronological history, not current open coding tasks; the superseding state above controls.

- Scope approved by Kevin: EVM + narrow manual Solana check.
- Solana manual slice implemented: official @solana/kit 6.5.0 and @solana-program/token 0.13.0, bounded genesis/read transport, ordinary legacy delegates, OpenAPI/generated types/Zod, response context validation, /solana view and independent example data.
- Existing P00 local engineering evidence retained; no full release closure claimed.
- No commit/push/deployment/paid-provider/signing/submission action performed by this roadmap.
- 2026-10-11 local evidence: 463 Node tests + four TS scripts passed, workspace typecheck/web/API builds and isolated codegen/drift passed. Production-filter dependency audit returned zero advisories (not a security certificate). Scoped reviewer found invalid COption tags accepted by SDK; reproduced, rejected canonical tags before decoding and added nine mutation cases. Final scoped review: no must-fix.
- Desktop/mobile live browser checks passed at 1440x1000 and 390x844. Actual index SHA256 0e3657bac9793c2b26b104a354782e4636e8efc3e8db712381fcfede73d305ac. Devnet official documentation example wallet returned 35 legacy accounts and 14 unsupported Token-2022 accounts, correctly partial. Finalized slots 509856586 and 509856591 on respective reads. Screenshots inspected, no horizontal overflow or page errors in smoke.
- Mounted built Express and both Vercel catch-all layouts passed malformed400/unavailable200/no-store/context checks with external requests disabled. Existing EVM health/legacy/advisory wrapper smoke passed. No fresh deployed Aave/Euler analysis claimed.
- Next: H03 exact EVM candidate/live controls, H04 authorized preview, H05 founder facts/videos, H06 final submission. Do not return to full P00 audit completion first.
- Kevin confirmed Solo Founder registration and authorized commit, push and Vercel preview on 2026-10-11. Production deploys, database migrations and paid services remain excluded. Earlier pending-authorization notes are historical.
- H04 publication: bd3dbda committed/pushed; initial Vercel preview built successfully. Preview authentication prevents unauthenticated live acceptance/jury access; shareable link requested. Initial CI verify found a pre-existing Windows-only test bootstrap; optional fallback corrected and missing-map regression added, full local baseline464 plus four TS scripts passed. Remote rerun pending. Advisory/package/privacy/retention jobs passed. No production change or submission.
- Superseding H04 checkpoint: human share link received; actual preview exposed routing405 then CORS500, both corrected with red/green tests. Application0abfd98 passed remote desktop/mobile live Solana QA at12:22Berlin on2026-10-11; correctpartial35legacy/14unsupportedToken2022, screenshots inspected, all five CI jobs green. H01/H02 and Solana deployment slice complete. H03 fresh EVM live controls remain gated by existing automatic DDL and no-migrations authorization; prior recorded controls must be labeled as such. Next H05 videos/reviewer access and H06 submission. Production was not changed.
