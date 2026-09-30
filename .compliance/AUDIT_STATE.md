# Sigil EU/DE Compliance Audit State

- Audit mode: `STANDARD`
- Audit date: 2026-09-28
- Remediation checkpoint: 2026-09-30
- Canonical repository root: `C:\Coding Projects\Sigil`
- Jurisdiction: European Union / Germany
- Audited revision: `9dbfc8db0dd7f6cfa04179fbdbedd3d82bc6f029`
- Baseline continuity: documentation changes through `b734417`; initial audit remediation `4f3df52`; advisory implementation through `51ac5e2` fast-forwarded into local `main`; tested follow-up remediation and release evidence committed as `e9dc3c6`. Local main is clean after the checkpoint commits; GitHub/Vercel/Store publication remains pending.
- Working tree at start: clean, `main` aligned with `origin/main`
- Auditor note: independent security subagents were requested but unavailable because the account-wide agent usage limit was reached. The required single-pass security review was completed by the primary auditor and this limitation is carried into the final coverage statement.

## Phase Status

| Phase | Status | Evidence |
| --- | --- | --- |
| A. Repository and product inventory | Complete | Web app, API, extension, database, providers, legal routes, storage and public API surfaces inventoried. |
| B. Applicability and legal-source verification | Complete | Primary EU/German sources and provider documentation verified as of the audit date. |
| C. Findings and release blockers | Complete | Three distinct security findings validated; the sealed panel contains one semantic duplicate of the analysis-history finding. |
| D. Safe remediation | Implemented locally | Advisory-only provider execution and bounded intake; private opaque analysis links; cross-user approval correlation removed; authenticated daily retention job; bounded numeric IDs; log minimisation; legal disclosures and claim alignment. |
| E. Verification | Complete with production limits | Libraries, API and web typechecks and both builds passed after dependency restore from cache. API privacy/auth/retention behavior verified using mocks. Extension and package checks recorded in continuation evidence. Production database/Chrome/vendor verification remains pending. |
| F. Audit artifact completion | Complete | Required `.compliance/` document set and sealed Codex Security report created. |
| G. Release decision | `NO_GO` | Local authorization-channel defect remediated; Kevin Kauper supplied as operator/controller and implemented locally. Deployment, installed Chrome QA, address evidence, vendor and CRA operational evidence remain pending. |

## Product Inventory

Publication preparation 2026-09-30: operator confirms Vercel Production secret/retention-variable setup and expressly authorises commit/push of prepared changes. Remote fetched securely using Windows certificate validation; no remote commits missing locally. Two browser-data lock entries adjusted to registry-verified releases older than existing 24-hour minimum; no age-policy exception. Frozen install succeeded with Vercel's pnpm 10.28.0 after pnpm-11 Windows linking/build-policy issues; generated placeholder build setting removed. Fresh complete workspace typecheck, API/web builds, 63 combined regression tests and built API smoke passed. Full/production audits report zero known advisories; licence/SBOM inventory refreshed (474 versions, lock SHA256 `f3487d5a7c61aac2e8ff8dc48fef765bb0819c4ef6b309c6bd9aed2012147a82`). The prior missing-TypeScript test limitation is resolved in the installed/escalated test context. Existing web sourcemap/bundle warnings remain. GitHub publication authorisation is not compliance sign-off or proof of successful Vercel deployment, cron execution, Neon deletion or Store update. Release decision remains `NO_GO` with unchanged counts pending live/legal/vendor evidence.

Retention checkpoint 2026-09-30: verified both Vercel cron configs and existing auth/deletion implementation; added dependency-free callback/config tests in `retention-route.test.cjs`. Combined new route/config and existing SQL/schema suite: 7 tests passed. These are mocked callback/config tests, not full Express, live PostgreSQL or scheduled production execution. No runtime changes; no secret creation, environment change, live deletion, deployment or automated monitoring. Hobby timing/no-retry guidance and Neon restore/erasure handling added to `RETENTION_OPERATIONS.md`; proposed daily review/26-hour escalation awaits operator confirmation. Actual Vercel secret/job/run and Neon plan/restore-window evidence requested. Privacy test's earlier missing-TypeScript limitation remains separate. P1 retention gate open; counts unchanged, `NO_GO`.

Walkthrough checkpoint 2026-09-30: operator confirmed existing mailbox notifications satisfactory; no extra email test required. Analyst-only synthetic incident walkthrough completed against analysis-access/provider-wrapper source, not an operational rehearsal. Three retention tests passed again; privacy test failed to start due missing local TypeScript dependency. Current combined run is not passing, prior verification is historical. No runtime/dependency edits, live access, deletion or notification. Evidence: `INCIDENT_WALKTHROUGH_2026-09-30.md`. Incident operational gate remains open; counts unchanged, `NO_GO`.

Operator responsibility checkpoint 2026-09-30: Kevin Kauper accepted emergency responsibility; reports incoming contact-mailbox notifications; explicitly no deputy. Recorded in runbook/readiness/checklist/exercise. Do not infer daily manual checks, DPO appointment, tested notifications, MFA access or exercise completion. Absence coverage remains a documented single-person risk. Incident-readiness group stays open; counts unchanged, `NO_GO`. Documentation-only update; no runtime change, external notification or account operation.

Incident-response checkpoint 2026-09-30: conditional CRA/GDPR reporting runbook and synthetic tabletop template prepared. CRA matrix corrected to `LEGAL_REVIEW_REQUIRED` after current non-commercial clarification; downloadability is not enough to establish commercial market placement. Commission/ENISA/EDPB guidance checked; EUR-Lex direct text retrieval unavailable in this refresh. Owner/absence coverage requested; no answer or access/rehearsal/registration assumed. Documents only, no runtime changes or production notifications. Existing P1 incident-readiness group remains open; total counts unchanged and decision `NO_GO`. Evidence: `INCIDENT_RESPONSE.md`, `INCIDENT_EXERCISE.md`, `CRA_READINESS.md`, `APPLICABILITY_MATRIX.md`.

Superseding operator clarification 2026-09-30: current Sigil operation is declared non-profit/non-commercial; future paid roadmap features are not current commercial operation. Retain Hobby now. Require an appropriate paid Vercel production plan before paid-feature activation or commercial promotion. This declaration resolves the assumed present monetisation conflict conditionally, not the independent Hobby DPA/training/privacy evidence gate. Overall release counts and `NO_GO` remain unchanged. Roadmap and phase-level dashboard tasks record the prerequisite; no account changes made.

Vendor checkpoint 2026-09-30: operator confirmed Vercel Hobby must remain. Current official terms, DPA and Fair Use were rechecked; commercial-use eligibility and Hobby processor coverage are unresolved within the existing P1 vendor gate. Hobby model-training opt-out requires account evidence. OpenRouter regional-routing documentation corrected from Enterprise-only to Business/Enterprise. Neon execution, region/backups and OpenRouter account/provider policies remain unverified. Evidence: `VENDORS_AND_TRANSFERS.md`. Documentation-only refresh; no executable code, dependencies, settings, deployment or hosting plan changed. No additional code scan/tests required for this checkpoint; prior runtime verification remains unchanged. Overall decision remains `NO_GO`; P0/P1/P2 group counts are unchanged because these items belong to the existing vendor/AI safeguards group.

- `artifacts/sigil`: public React/Vite security web app and legal pages.
- `artifacts/api-server`: public Express API deployed through Vercel serverless wrappers.
- `artifacts/sigil-extension`: published Chrome Manifest V3 extension with content scripts on all web pages, local/sync extension storage, and API access limited to `https://sigil.s3ntrylabs.com/*`.
- `lib/db`: Neon/PostgreSQL persistence through Drizzle ORM.
- External services observed in code/configuration: Vercel, Neon, OpenRouter with a DeepSeek model, Etherscan, public EVM RPC endpoints, CoinGecko, and optional Google Chrome Sync.
- No account system, payment checkout, advertising tracker, analytics SDK, wallet custody, key storage, or transaction-broadcasting capability was found in the audited revision.

## Confirmed Release Blocker

The baseline extension trusted page-authored `sigil:decision` authorization. The local implementation now invokes the original wallet provider independently and exactly once; page observations only drive best-effort advisory context. It cannot guarantee that a hostile page will emit authentic observations or display warnings. Automated adversarial tests and independent scoped reviews cover provider preservation and observation lifecycle. Private history and retention fixes require deployment and production checks. No real production data was deleted during this continuation.
