# Sigil Security Console: UX Acceptance

2026-10-11. User-approved presentation-only sprint. Production promotion, detection changes, API changes, execution, migration and dependency changes are excluded.

## Implemented Scope

- Task navigation: Transaction check, Wallet permissions, and a named Tools disclosure. Existing routes remain accessible. Focus exit/Escape close the menu; short viewports scroll its contents.
- Main entry: immediately usable EVM form and visible Solana permission entry. Removed marketing hero, decorative statistics and repeated feature cards. Existing streaming/cancellation behavior remains.
- Solana: decision and next action first; exact raw amounts remain visible; explanation and full evidence use keyboard-operable disclosures. Synthetic examples are labeled before the decision. Complete, partial, unsupported and unavailable coverage remain separate.
- EVM: decision and next action precede summary and evidence. Scores/methodology and capability table are subordinate disclosures. Full selectable input and all recorded evidence remain available. Share moved to the end; sharing privacy unchanged.
- Shared identity: existing Sigil logo, opaque graphite, restrained cyan action accents, semantic warning colors, system UI body, Space Grotesk headings and JetBrains Mono identifiers.

Actual modules: `pages/home.tsx`, `pages/solana-monitor.tsx`, `pages/analysis.tsx`, `components/layout/Layout.tsx`, `components/sigil/AnalysisResultView.tsx`, `components/sigil/ShareButton.tsx`, `index.css`. Frontend regression tests and browser-verifier selectors were updated. No security adapter, validator, API, dependency manifest or production configuration changed.

## Twenty Design Checks

Statuses apply to the priority routes above, not every secondary screen.

| # | Pattern | Status and Rationale |
| --- | --- | --- |
| 1 | Generic purple-blue gradients | Eliminated from priority routes and shared background. |
| 2 | Gradient hero headlines | Eliminated; literal task headings. |
| 3 | Emoji interface icons/headings | Eliminated from priority presentation; Lucide status symbols remain. |
| 4 | Indiscriminate Inter | Eliminated from shared body; system UI instead. |
| 5 | Decorative colorful card borders | Eliminated; warning/status accents intentionally retained. |
| 6 | Glass/blur floating surfaces | Eliminated from shared navigation and priority routes. |
| 7 | Unreadable dark-mode contrast | Revised opaque tokens; numeric text/focus contrast regressions pass. Not a whole-app accessibility certification. |
| 8 | Three identical icon cards | Eliminated from main entry. |
| 9 | Decorative hero badges | Eliminated; evidence provenance labels intentionally remain. |
| 10 | Excessive Lucide | Reduced; retained for status, copy, external link and actual commands. |
| 11 | Untouched library templates | Revised scoped tokens/structure; existing library retained, native disclosures added. |
| 12 | Scroll fade-in animation | Eliminated from priority routes. |
| 13 | Cursor glow/spotlight | Not present; ambient shared effects removed. |
| 14 | Opacity-only button hover | Eliminated on primary commands; solid hover/focus states. |
| 15 | Arbitrary dimensions | Revised consistent spacing, 44px main controls, 4/6/8px radii. |
| 16 | Excessive em dashes | Removed from authored priority copy; recorded upstream evidence is not rewritten. |
| 17 | Marketing buzzwords | Eliminated from entry; concrete tasks and bounded claims. |
| 18 | Decorative italic serif | Not present. |
| 19 | Trend-driven fonts | Intentional retention: headings, readable body and technical identifiers have separate roles. |
| 20 | Grain over gradients | Eliminated shared texture/background utilities. |

## Verification Checkpoint

- Fresh local regression baseline: 489 Node tests, zero failures, plus four TypeScript test scripts.
- Workspace typecheck, workspace builds, isolated codegen drift and built API/Solana wrapper smoke passed. Web bundle retains existing chunk-size and tooltip sourcemap warnings.
- Independent scoped review found two navigation accessibility issues; both fixed and tested. Follow-up found stale counted-summary selectors in the EVM verifier; corrected without removing safety assertions. No frontend trust-boundary violation found.
- Actual in-app browser: desktop 1440x1000, mobile 390x844, short landscape 844x390. Main entry and all six synthetic branches exercised; malformed input, native evidence keyboard activation, Escape/focus exit and viewport bounds checked.
- Actual before/after screenshots in ignored `tmp/ux-polish/before/` and `after/`; visually inspected main entry, permission review and partial states. Full-page browser capture has scrollbar/sticky-header artifacts; geometry checks and normalized captures distinguish artifacts from UI overlap.
- Application candidate `240afdcbe295c160bc07f4799cfe7dea7aa4a765` committed/pushed. [Immutable jury Preview](https://sigil-18j89a47h-s3ntrylabs.vercel.app), deployment6997101868 succeeded. All five [same-commit CI gates38148194204](https://github.com/EragothCrypto/Sigil/actions/runs/38148194204) passed: verify, package, advisories, privacy, retention. Full advisory gate and real isolated SQL privacy/retention remain intact. Gitleaks8.30.1 scanned this commit range with redaction: no leaks. Production unchanged.
- Actual deployed browser Mainnet: public authority `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ`, finalized slot455688137, 27 legacy accounts, two unsupported Token-2022 accounts, correctly partial. Rendered/inspected at desktop and mobile. Live negative documentation-address control `A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd`, slot455688981, both account queries0/complete, explicitly scoped absence. Counts/slots are observed snapshots, not future guarantees.
- Actual deployed EVM entry rejects `0x123` with no verdict. Aave report `d3186ede-b95a-4ba9-857a-bcf14eb141f7` renders caution35 and full supplyWithPermit/current-ABI evidence; Euler report `16d3afac-863a-4f77-8f5a-dcaeee63c43a` renders historical warning80. Desktop/mobile screenshots inspected, no horizontal overflow. These are report presentation/control checks; not current wallet-exposure verification.
- Deployed evidence files are in ignored `tmp/ux-polish/preview/`. Shared preview access was verified in the authorized browser session; jury access must use Kevin's separately supplied share link. Access capability is never recorded in repository files.
- All six synthetic branches also exercised on the deployed mobile candidate: correct title, explicit example label, no horizontal overflow. Browser console errors: none observed. These examples are not live victims or live positive exposure findings.

## Final Refinement Pass

- Presentation-only follow-up to the approved console baseline: both entry tasks are visible before the EVM form; shorter entry copy preserves the visible no-clearance warning and full limitations in a native disclosure.
- Disabled Analyze is visually quiet; explicit example actions remain labeled as running analysis. No automatic request or changed analysis handler.
- Solana input collapses after a report, with keyboard-accessible reopening. Decision and next action fit the first mobile viewport; exact raw permission values remain available in three stable columns.
- Open evidence disclosures use the existing evidence accent. Navigation, API contracts, detection, wallet execution boundaries, dependencies and production configuration are unchanged.
- Local verification: 491 Node tests plus four TypeScript test scripts, workspace typecheck, frontend build and whitespace check passed. In-app browser at 1440x1000 and 390x844: entry balance, native input reopening, address change clearing a prior report, all six labeled synthetic states and no horizontal overflow verified.
- Deployment verification and exact candidate freeze are recorded separately after same-commit CI and deployed desktop/mobile inspection; the earlier freeze above remains historical evidence, not proof for this follow-up.

## Jury Walkthrough

1. Open the authorized jury Preview. Transaction check and Wallet permissions are visible named tasks.
2. Open Wallet permissions, choose Review example. The report explicitly says Example data - not a live scan. Read Next action, raw balance 500, allowance/bound 250. Expand Why review this permission? and Synthetic account evidence.
3. Try Incomplete example and Unavailable example; neither is a safe result. No-delegate example is limited to checked scope. Frozen/Zero-bound examples retain their restrictions.
4. Load Mainnet address (public protocol authority), then explicitly Check wallet. Live values may change; Token-2022 unsupported accounts remain incomplete, not negative. No scan/signature occurs merely from selecting an example/address.
5. Return to Transaction check. Ethereum Aave input: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Review the qualified decision, limitations and decoded intent through Observations/Recorded evidence.
6. Historical Euler control: `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d`. Its attribution is not current wallet exposure. Invalid input `0x123` must produce no risk verdict.

## Remaining Issues / Honest Release Scope

Secondary routes retain some prior presentation and need a later consistency pass. Large structured evidence remains dense when deliberately expanded. No full accessibility conformance claim. Public RPC availability and EVM upstream latency remain external limitations. Incident exposure correlation, effective EVM allowance checking and broad Token-2022 support are not shipped. Existing release/legal gates remain separate; no production promotion or submission has occurred.
