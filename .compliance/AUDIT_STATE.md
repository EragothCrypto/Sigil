# Sigil EU/DE Compliance Audit State

- Audit mode: `STANDARD`
- Audit date: 2026-09-28
- Jurisdiction: European Union / Germany
- Audited revision: `9dbfc8db0dd7f6cfa04179fbdbedd3d82bc6f029`
- Working tree at start: clean, `main` aligned with `origin/main`
- Auditor note: independent security subagents were requested but unavailable because the account-wide agent usage limit was reached. The required single-pass security review was completed by the primary auditor and this limitation is carried into the final coverage statement.

## Phase Status

| Phase | Status | Evidence |
| --- | --- | --- |
| A. Repository and product inventory | Complete | Web app, API, extension, database, providers, legal routes, storage and public API surfaces inventoried. |
| B. Applicability and legal-source verification | Complete | Primary EU/German sources and provider documentation verified as of the audit date. |
| C. Findings and release blockers | Complete | Three distinct security findings validated; the sealed panel contains one semantic duplicate of the analysis-history finding. |
| D. Safe remediation | Complete | Private opaque analysis links, retention cleanup, log minimisation, legal disclosures, claim cleanup and `SECURITY.md` added. |
| E. Verification | Complete with limits | Extension tests and JS syntax checks passed; full dependency-backed checks and live TLS checks were blocked by the local certificate environment. |
| F. Audit artifact completion | Complete | Required `.compliance/` document set and sealed Codex Security report created. |
| G. Release decision | `NO_GO` | The extension decision channel remains forgeable by hostile page JavaScript. |

## Product Inventory

- `artifacts/sigil`: public React/Vite security web app and legal pages.
- `artifacts/api-server`: public Express API deployed through Vercel serverless wrappers.
- `artifacts/sigil-extension`: published Chrome Manifest V3 extension with content scripts on all web pages, local/sync extension storage, and API access limited to `https://sigil.s3ntrylabs.com/*`.
- `lib/db`: Neon/PostgreSQL persistence through Drizzle ORM.
- External services observed in code/configuration: Vercel, Neon, OpenRouter with a DeepSeek model, Etherscan, public EVM RPC endpoints, CoinGecko, and optional Google Chrome Sync.
- No account system, payment checkout, advertising tracker, analytics SDK, wallet custody, key storage, or transaction-broadcasting capability was found in the audited revision.

## Confirmed Release Blocker

The Chrome extension currently accepts a page-authored `sigil:decision` DOM event as the authorization to continue an intercepted wallet request. An executable proof of concept confirmed that hostile dApp JavaScript can forge `proceed` before the extension responds. The public analysis-history disclosure found in the audited baseline is remediated in the working tree but still requires full build, deployment and production verification.
