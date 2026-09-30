# EU/DE Release Checklist

## Must Pass Before Release

- [x] Remove page-event wallet authorization; independently test provider preservation and bounded best-effort advisory observations. Hostile-page warning suppression remains an explicitly disclosed limitation.
- [ ] Deploy the UUID/private-history migration and verify new analysis links, legacy-row denial, Hall of Shame numeric links and empty public history collection.
- [x] Record supplied legal operator/controller and content responsible person: Kevin Kauper; implement in legal UI.
- [ ] Verify live publication and preserve serviceability evidence for Kevin Kauper at the supplied Hamburg c/o address.
- [ ] Complete vendor DPAs, transfer assessment, regions and retention settings.
- [ ] Lock OpenRouter/model routing to documented no-training behavior or migrate to a contracted suitable provider.
- [ ] Configure and test the CRA Article 14 reporting runbook and responsible contacts.
- [x] Restore dependencies from the available package cache with TLS verification enabled; run library/API/web typechecks and production API/web builds.
- [x] Run full dependency advisory audit and generate installed-package license/SBOM inventories.
- [ ] Complete asset/license clearance, signed provenance and installed-profile QA.
- [ ] Test production headers, CORS, rate limits, health endpoints and deletion/retention behavior.
- [x] Generate deterministic v1.0.3 ZIP and SHA-256 evidence with a runtime-file allowlist.
- [ ] Submit v1.0.3 with updated advisory disclosures after release-gate approval.
- [ ] Configure `CRON_SECRET`, redeploy and verify the daily retention job, failure monitoring and provider backups; see `RETENTION_OPERATIONS.md`.

## Manual Product QA

- [ ] Analyze transaction hash and contract on each supported network.
- [ ] Simulate raw calldata, JSON transaction, personal-sign and typed-data requests.
- [ ] Verify provider result/error preservation, wallet-only approval/rejection, advisory dismissal/auto-close/queue behavior and hostile-page suppression limits with a real wallet/test dApp.
- [ ] Verify approval scanner, wallet monitor, watchlist import/export, local clear and optional settings sync.
- [ ] Keyboard-only navigation, focus visibility, labels, zoom 200%, contrast, reduced motion and screen-reader smoke test.
- [ ] Legal links from web footer and Chrome Web Store listing; mobile/desktop rendering.
- [ ] Data-subject erasure drill using an opaque analysis link and provider-log/backups procedure.

## Release Decision

Current decision: `NO_GO` until local fixes are deployed and verified and legal/vendor/CRA facts are evidenced. The advisory redesign removes extension authority over wallet execution; it does not provide authenticated or guaranteed warnings on hostile pages. Existing Store publication is not evidence that the new local release is approved or installed.
