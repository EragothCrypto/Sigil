# EU/DE Release Checklist

## Must Pass Before Release

- [ ] Deploy and live-test evidence-first transaction analysis: Euler curated example versus unrelated transaction, zero native value with receipt token transfers, missing/reverted receipt and explorer failure. Confirm coverage is visible and no unsupported safety/public-selector/compiler claims occur. Local regression verification is not production AI-quality sign-off; internal tracing remains unimplemented.

- [x] Remove page-event wallet authorization; independently test provider preservation and bounded best-effort advisory observations. Hostile-page warning suppression remains an explicitly disclosed limitation.
- [ ] Deploy the UUID/private-history migration and verify new analysis links, legacy-row denial, Hall of Shame numeric links and empty public history collection.
- [x] Record supplied legal operator/controller and content responsible person: Kevin Kauper; implement in legal UI.
- [ ] Verify live publication and preserve serviceability evidence for Kevin Kauper at the supplied Hamburg c/o address.
- [ ] Complete vendor DPAs, transfer assessment, regions and retention settings.
- [x] Record operator declaration: Sigil currently operates non-profit/non-commercial; retain Vercel Hobby for this stage. This is not independent provider approval or confirmation of charitable status.
- [ ] Resolve Vercel Hobby processor-term coverage and verify model-training opt-out; reassess plan eligibility if commercial activity is introduced. See `VENDORS_AND_TRANSFERS.md`.
- [ ] Before monetisation launch or promotion of paid offerings: move Sigil production to an appropriate paid Vercel plan, verify applicable DPA and plan limits, then enable paid features/checkout/API subscriptions. No upgrade now.
- [ ] Lock OpenRouter/model routing to documented no-training behavior or migrate to a contracted suitable provider.
- [x] Prepare conditional CRA/GDPR incident runbook and synthetic tabletop template; clarify unresolved CRA scope for current non-commercial operation.
- [x] Record Kevin Kauper's acceptance of emergency responsibility, incoming-mail notification arrangement and absence of a deputy.
- [ ] Test intake notifications/access, document absence handling, confirm applicable reporting routes/access and complete the tabletop exercise; owner acceptance is not operational sign-off.
- [x] Restore dependencies from the available package cache with TLS verification enabled; run library/API/web typechecks and production API/web builds.
- [x] Run full dependency advisory audit and generate installed-package license/SBOM inventories.
- [ ] Complete asset/license clearance, signed provenance and installed-profile QA.
- [ ] Test production headers, CORS, rate limits, health endpoints and deletion/retention behavior.
- [x] Generate deterministic v1.0.3 ZIP and SHA-256 evidence with a runtime-file allowlist.
- [ ] Submit v1.0.3 with updated advisory disclosures after release-gate approval.
- [x] Operator confirms Production secret/retention setup, deployment `d03a89c` Ready and daily cron job visible in Vercel.
- [x] Operator confirms integrated Neon Free plan and 6-hour project History Window. Other backup copies, region and contractual retention remain unverified.
- [x] Operator subsequently confirms Neon region AWS `us-east-1` (N. Virginia), USA. Region information is now complete; applicable US transfer safeguards/contract evidence remain open.
- [ ] Verify a successful scheduled retention run, failure monitoring and provider backups; see `RETENTION_OPERATIONS.md`. Visible job/deployment is not execution evidence.
- [x] Verify retention callback/config and SQL/schema behavior with 7 focused mocked tests; prepare Hobby failure-control, isolated staging drill and Neon restore/erasure procedures. Production execution, real PostgreSQL drill and monitoring remain unverified.

## Manual Product QA

- [x] Operator screenshot confirms one mainnet example-contract analysis renders a complete verdict after the DeepSeek token-budget correction (2026-09-30). This is not an all-network or risk-accuracy pass; provider identity and metadata/claim quality remain open.
- [x] Operator reports a completed Euler example transaction scan after the requested ZDR change. Rendering passes only; actual post-change endpoint policy and exploit/risk accuracy remain unverified. Source review identifies unsupported verification/selector claims and missing token/internal-call evidence for correction before risk-quality sign-off.
- [ ] Analyze transaction hash and contract on each supported network.
- [ ] Simulate raw calldata, JSON transaction, personal-sign and typed-data requests.
- [ ] Verify provider result/error preservation, wallet-only approval/rejection, advisory dismissal/auto-close/queue behavior and hostile-page suppression limits with a real wallet/test dApp.
- [ ] Verify approval scanner, wallet monitor, watchlist import/export, local clear and optional settings sync.
- [ ] Keyboard-only navigation, focus visibility, labels, zoom 200%, contrast, reduced motion and screen-reader smoke test.
- [ ] Legal links from web footer and Chrome Web Store listing; mobile/desktop rendering.
- [ ] Data-subject erasure drill using an opaque analysis link and provider-log/backups procedure.

## Release Decision

Current decision: `NO_GO` until local fixes are deployed and verified and legal/vendor/CRA facts are evidenced. The advisory redesign removes extension authority over wallet execution; it does not provide authenticated or guaranteed warnings on hostile pages. Existing Store publication is not evidence that the new local release is approved or installed.
