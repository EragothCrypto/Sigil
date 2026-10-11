# Final Colosseum Differentiation Handoff

## Feasibility and Selected Scope

Decision on 2026-10-11: ship the action-first Solana Delegate Checker fallback, not Incident Exposure Checker. Euler's exact historical transaction attribution does not prove current effective allowance/position exposure. Raydium's documented compromised protocol admin and rotation are not ordinary user SPL delegate semantics. Neither reviewed candidate has a supported complete exposure predicate and current affected-wallet control here. See [source-backed gate and plan](superpowers/plans/2026-10-11-colosseum-differentiation.md). No incidents, malicious entities, active approvals or victims were invented.

The real supported decision is: review a recorded account permission, or recognize incomplete/unavailable coverage, or establish absence of ordinary delegates only in successfully returned/decoded scope. A raw bound is not a transaction simulation, valuation or loss prediction. Zero/frozen is not future safety. No unknown delegate is called malicious.

## Actual Modules

- `artifacts/sigil/src/lib/solana-actions.ts`: deterministic action presenter; guidance version `solana-delegate-review-v1`; fixed-host cluster-bound evidence URLs; six explicitly synthetic report fixtures; public Mainnet acquisition input.
- `artifacts/sigil/src/pages/solana-monitor.tsx`: integrated next-action summary, six-question account report, exact raw units/full identities, live versus synthetic evidence, official manual revocation reference and Mainnet load control.
- `artifacts/sigil/solana-actions.test.cjs`: presenter outcomes, frozen/zero/u64 precision, malformed data, full official codec -> server evaluator -> generated client validation -> presenter contract test and provenance regressions.
- `artifacts/sigil/solana-ui.test.cjs`: existing view regression follows extracted presenter.
- `scripts/verify-solana-demo.mjs`: desktop/mobile checks for all six local examples, provenance/link suppression, Mainnet input/no autoscan, actual provider response identity/headers and explorer cluster.
- Sprint roadmap, live-test checklist, submission draft, planning state and feasibility/verification documents updated.

Existing Solana API, RPC limits, decoder, generated OpenAPI contracts, EVM tools, schema and dependency lockfile are unchanged. No new privileged path or infrastructure.

## Working Evidence and Gates

Local candidate desktop1440x1000/mobile390x844 browser tests passed on 2026-10-11. Six synthetic branches make no requests; malformed successful JSON is rejected. Screenshots inspected for coherent wrapping/no overflow; no page errors. Positive delegate capability is demonstrated only with labeled fixtures and official codec integration tests, not claimed as a live Mainnet incident victim.

- Mainnet nonempty public authority: 27 legacy accounts, two unsupported Token-2022 accounts, no ordinary delegate observations, correct partial. Initial new-report desktop local slot455664692; that run's report is superseded by subsequent empty-case report in the same output directory. Do not treat transient counts as future assertions.
- Mainnet empty control: `A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd`, complete scoped absence at slots455665440/455665448, both program counts0. Current local report `tmp/colosseum/mainnet/browser-report.json`.
- Devnet same documentation address: legacy35/Token2022unsupported14, correctpartial at slots509915192/509915197. `tmp/colosseum/browser-report.json`.
- Newest tested local HTML SHA256 `f117387c70fb04d4e1a97005b3a5e0b01eace39e4493e63171e030248c540fe7`.
- Baseline474 Node tests plus four TypeScript scripts passed; workspace typecheck, web/API builds and isolated codegen drift check passed. API wrappers/mounted Express invalid400 and provider-blocked unavailable200/no-store passed with no reachable DB; existing EVM built-wrapper smoke passed with synthetic configuration only.
- Production-filter dependency audit: no known advisories. Initial sandbox loopback/symlink permissions and local TLS-chain failures were rerun with appropriate execution rights/system CA; no TLS checks or tests disabled.
- Independent scoped review found fixture-specific on-chain provenance wording; corrected to synthetic headings/detection/provenance, covered by tests. Follow-up review passed with no remaining concrete blockers; rendered browser verification was performed separately by the main agent.

Authorized preview publication and fresh remote acceptance pending at this local checkpoint. Production and migrations remain excluded. EVM actual deployed analyze calls still blocked by ensureAnalysesSchema DDL/no-isolated-DB evidence. Do not call that open gate complete based on built/synthetic tests. Vite reports existing large-chunk and tooltip sourcemap warnings; build exit0, not a clean warning-free build or accessibility certification.

## Shipped vs Planned

Implemented: manual bounded real Mainnet/Devnet acquisition, deterministic ordinary delegate evidence, action-first review guidance, account-specific raw arithmetic, clear scope/failure semantics, versioned guidance, official explorer/reference links, six labeled demonstration branches.

Not shipped: Incident Exposure Checker/registry/current incident correlation, malicious-entity threat feed, full Token-2022/mint/protocol positions, effective transaction simulation, USD valuation, automatic revoke or remediation transactions, background monitoring/accounts/billing. No production deployment or full EU compliance clearance. Videos, repository reviewer access and user submission remain open.

## Reproducible Jury Demo

1. Open `/solana` on the current authorized branch preview; avoid old immutable previews. Use the separately supplied share link for authentication; never commit its access query.
2. Click **Load Mainnet address**, then **Check wallet**. This fills `HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ`, a public protocol token-account authority, not a personal wallet/victim. Loading alone sends no request. Show real slots, coverage and next action; current expected observation is partial with unsupported Token-2022.
3. Click **Review example** and explicitly say it is synthetic. Show permission question -> next action -> exact account/mint/delegate -> balance500/allowance250/bound250 raw units. Unknown delegate is not an incident claim; no evidence links imply a real relationship.
4. Click **Frozen example** and **Zero-bound example**: bound0 does not imply future safety. No signatures or automatic fixes.
5. Click **Incomplete example** and **Unavailable example**: failure/unsupported coverage never becomes absence. Click **No-delegate example**: successful scoped absence, not wallet safety.
6. Optionally paste the Devnet documentation address on Mainnet for a real complete empty-scope read, then return to live nonempty Mainnet. State public-RPC limits/no SLA. EVM historical demo controls stay explicitly recorded until its no-DDL live gate is solved.

Local reproduction: build the web/API with existing scripts, set `NODE_OPTIONS=--use-system-ca` where required and run `scripts/solana-demo-preview.mjs 5175`; open `http://127.0.0.1:5175/solana`. It exposes Solana only, not a replacement for the full EVM backend. Automated smoke uses `SIGIL_TEST_WALLET` and `node scripts/verify-solana-demo.mjs --live --mainnet --require-accounts`; Playwright must be resolvable through the configured runtime. Set `SIGIL_PREVIEW_URL` only in the process environment for remote tests.
