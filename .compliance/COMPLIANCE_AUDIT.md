# Sigil EU/Germany Release Audit

Audit mode: `STANDARD`  
Audit date: 2026-09-28  
Remediation checkpoint: 2026-09-30; details in `CONTINUATION_2026-09-30.md`.
Audited baseline: `9dbfc8db0dd7f6cfa04179fbdbedd3d82bc6f029`

## Executive Decision

`NO_GO`

The audited baseline trusted a hostile-page DOM event to authorize wallet execution. Local remediation removes that authority entirely: wallet execution is independent and the extension provides bounded best-effort advisory observations. Private analysis access and cross-user approval-history disclosure are also fixed locally. Deployment, installed Chrome tests and mandatory operator/vendor/incident-response evidence remain release gates.

The audit also found public enumeration of submitted analyses in the audited revision, indefinite database retention, over-detailed error logging, incomplete legal operator identity, unverified AI-provider training/transfer settings, and no operational CRA reporting process. The working tree fixes the public history, adds UUID bearer links, 30-day cleanup, log minimisation, accurate privacy disclosures, marketing-claim cleanup and a security reporting policy. Those changes still require a trusted dependency restore, full build/test, deployment and production verification.

Continuation verification supersedes the dependency/build limitation above: workspace typecheck, production builds, 59 combined Node tests/files, existing TypeScript regression scripts and isolated generator checks now pass. Full and production dependency audits report zero known advisories. Deployment, real PostgreSQL deletion, installed Chrome and organizational evidence remain pending. Final open gate counts and the consolidated operator list are in `CONTINUATION_2026-09-30.md`.

## Findings

| Priority | Finding | State |
| --- | --- | --- |
| P0 | Hostile dApps can forge `sigil:decision` and bypass extension analysis/warning. | Fixed locally by advisory redesign, adversarial tests and independent reviews; production/Store rollout unverified. |
| P0 | Public analysis history and sequential detail IDs disclose submitted scans. | Remediated in working tree; deployment and regression verification pending. |
| P1 | DDG/GDPR operator/controller identity is not proven to be a legal person/entity name. | Manual legal/business confirmation required. |
| P1 | OpenRouter free-model routing, provider training, retention, DPA and international transfer safeguards are unverified. | Manual account/contract change required. |
| P1 | CRA Article 14 reporting process and contacts are not operational although the duty date has begun. | Organisational implementation required. |
| P1 | Ordinary analyses had no reliable retention/deletion schedule. | Secret-protected daily Vercel job and executable mocked SQL/auth tests added; scheduler/secret/deletion drill/provider backup verification pending. |
| P2 | Wallet/hash/model output appeared in error logs. | Remediated in working tree; provider log retention pending. |
| P2 | No CI, SBOM, license inventory, formal support period or reproducible extension release evidence. | Backlog before full CRA application; CI/SBOM should start now. |
| P2 | Accessibility has not received a documented keyboard/screen-reader/WCAG test; future paid flow may trigger BFSG. | Manual QA/legal classification required. |
| P2 | English-only legal/product notices may be insufficiently transparent for a Germany-directed consumer launch. | German legal review/translation required before monetisation. |

## Verification Performed

- Repository, routes, schemas, extension manifest/content/background/popup logic, storage, legal UI and provider calls reviewed.
- Current primary EU/German sources checked for GDPR, AI Act, CRA, DDG, TDDDG, BFSG and consumer-law timing.
- Secret-pattern scan of the working tree found placeholders only; no production credential was identified.
- `git diff --check` passed except expected Windows line-ending warnings.
- Executable proof of concept confirmed the extension event-channel bypass.
- The app-backed Codex Security Standard scan was sealed successfully. It contains one high, two medium and one low entries; the two medium entries are a semantic duplicate of the same analysis-history finding, so there are three distinct validated findings.
- All three dependency-free extension test files passed, and `node --check` passed for `background.js`, `content.js`, `core.js`, `inject.js` and `popup.js`.

## Verification Limits

- Independent security subagents were unavailable during the original pass; scoped independent remediation reviews were completed during the continuation. These reviews do not replace or duplicate the original Standard scan.
- Initial dependency restore failed on certificates. The continuation restored locked dependencies from the available cache without disabling TLS; library/API/web typechecks and API/web builds now pass. Dependency advisory audit and license evidence are tracked separately in the continuation report.
- Production vendor account settings, contracts, regions, backups, logs and database contents were not accessible.
- Live URL and API smoke checks could not be completed because the local Windows TLS provider returned `SEC_E_NO_CREDENTIALS` and the independent web fetch surface also could not access the deployment. These transport failures are not treated as evidence of a production outage.
- No qualified legal opinion, formal DPIA, penetration test or assistive-technology audit was performed.

## Required Next Gate

The replacement design and local builds are ready for further release verification. Configure and verify daily retention, deploy private-history fixes, run installed Chrome QA, complete legal/vendor/CRA confirmations and submit the advisory v1.0.3 Store update. The current production deployment is not assumed to contain these changes.
