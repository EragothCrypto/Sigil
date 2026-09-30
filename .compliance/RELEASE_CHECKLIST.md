# EU/DE Release Checklist

## Must Pass Before Release

- [ ] Redesign and independently test the extension decision channel so a hostile page cannot forge `proceed` or suppress a warning.
- [ ] Deploy the UUID/private-history migration and verify new analysis links, legacy-row denial, Hall of Shame numeric links and empty public history collection.
- [ ] Confirm and publish the exact legal operator/controller identity under DDG/GDPR.
- [ ] Complete vendor DPAs, transfer assessment, regions and retention settings.
- [ ] Lock OpenRouter/model routing to documented no-training behavior or migrate to a contracted suitable provider.
- [ ] Configure and test the CRA Article 14 reporting runbook and responsible contacts.
- [ ] Restore dependencies through a trusted TLS chain; run typecheck, build, all tests, dependency audit and license/SBOM generation.
- [ ] Test production headers, CORS, rate limits, health endpoints and deletion/retention behavior.
- [ ] Repackage the extension after security changes, increment version, run store-readiness tests and submit updated disclosures if data practices change.

## Manual Product QA

- [ ] Analyze transaction hash and contract on each supported network.
- [ ] Simulate raw calldata, JSON transaction, personal-sign and typed-data requests.
- [ ] Verify cancel/proceed/timeout/queue behavior with a real wallet and adversarial test dApp.
- [ ] Verify approval scanner, wallet monitor, watchlist import/export, local clear and optional settings sync.
- [ ] Keyboard-only navigation, focus visibility, labels, zoom 200%, contrast, reduced motion and screen-reader smoke test.
- [ ] Legal links from web footer and Chrome Web Store listing; mobile/desktop rendering.
- [ ] Data-subject erasure drill using an opaque analysis link and provider-log/backups procedure.

## Release Decision

Current decision: `NO_GO` because the core extension protection can be bypassed by a hostile page and mandatory legal/vendor/CRA facts are not yet evidenced. Web-only informational use may continue only as an explicitly limited beta after the private-history fix is deployed and legal/controller/provider disclosures are completed.
