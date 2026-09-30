# STANDARD Audit Continuation

Date: 2026-09-30. Canonical root: `C:\Coding Projects\Sigil`.

This resumes the 2026-09-28 Standard audit of `9dbfc8d`, retaining its applicability and legal-source evidence. Documentation evolved through `b734417`, initial remediation was committed as `4f3df52`, and independently reviewed advisory implementation through `51ac5e2` was fast-forwarded into local main. This checkpoint covers follow-up code/configuration/product-claim changes; no duplicate repository-wide security scan was launched. The existing sealed security panel describes the baseline, not an automatic certification of this release.

## Implemented Remediation

- Original wallet provider execution remains independent and exactly once; page events cannot authorize/cancel execution. Bounded observations provide advisory context only. A hostile page can suppress or forge observations and analysis can arrive after wallet confirmation; web, Store, whitepaper and overview copy now disclose this.
- Anonymous analysis no longer reads other users' prior approvals. Public collection history is empty; private results use UUID bearer links; numeric IDs are accepted only for curated public cases and are bounded before SQL.
- Daily authenticated Vercel retention replaces process-start-only deletion. Schema initialization does not delete data. The configured age is eligibility, with daily execution delay and separate backup/provider retention. Standalone operators must schedule the endpoint themselves.
- Dependency audit exposed 77 advisory entries across the workspace, including development/generator dependencies. Corrected versions were applied within the same major versions, with targeted transitive overrides. These advisory counts were not treated as 77 validated application vulnerabilities.
- Orval compatibility is explicit for React Query 5 and Zod 3; postprocessing retains the namespaced type exports and encoded Vercel query URL. Isolated generation verifies required analysis input and generated type compatibility without changing committed generated files.
- Extension v1.0.3 runtime-only package, SHA-256, license inventory and a CycloneDX component inventory were generated.

## Verification Evidence

| Check | Result / scope |
| --- | --- |
| `pnpm run typecheck` | Pass for all workspace library/artifact/script projects |
| API production build | Pass with final security dependencies |
| Web production build | Pass; existing tooltip sourcemap and bundle-size warnings remain |
| Combined extension/onboarding/API suite | 59 Node-runner tests/files passed; custom assertion harnesses additionally report individual checks |
| Mocked API privacy/auth routes | 5 executable tests passed, including numeric/private lookup, missing/wrong secret and sanitized DB failure |
| SQL retention logic | 3 executable mocked-query tests (included in 54 above): bounded parameterized age, curated exclusion, repeated runs/failure/retry |
| Existing TS regression scripts | Approval scanner, watchlist, wallet monitor and site reputation passed |
| Source hardening assertions | 5 passed; supplementary checks, not end-to-end proof |
| Extension JS syntax | All five runtime scripts pass `node --check` |
| Built API middleware smoke | `node scripts/verify-api-build.mjs`: health 200, missing/forged cron secret 401, invalid simulation 400, dummy unreachable DB/API endpoints only |
| Secret-pattern scan | Tracked source/config/docs scan found no production API-key/private-key signatures; narrow signatures are not exhaustive |
| `node scripts/check-codegen.mjs` | Isolated client/Zod generation and typechecks pass; private query URL and required input retained |
| `pnpm audit --json` | 0 known advisories across final workspace lockfile; `dependency-audit.json` |
| `pnpm audit --prod --json` | 0 known advisories; excludes packages classified as dev, so full audit also performed |
| License / SBOM inventory | `dependency-licenses.json`, `sbom.cdx.json`, 474 installed package versions; declared metadata, not legal license clearance |
| Deterministic package | Two builds yielded SHA-256 `9DB2340A093D84CB7155FBAB66C9FF3BEDBDB3223CDF3FABE3067B922CEF030B`; public download matches |

Dependencies initially failed under sandbox/certificate constraints. Locked packages were restored from cache; subsequent registry checks used Node's Windows system CA support. TLS verification was never disabled. Reviewable package overrides and the lockfile record the changes. No production database deletion or external Store/deployment publication occurred during this checkpoint.

Independent scoped review approved the final dependency/config/postprocessor changes and the Vercel retention design with deployment conditions. Standalone scheduler coverage is explicitly documented. Installation emitted a non-blocking fdir/picomatch peer warning; builds, typechecks and isolated codegen passed. Isolated generation/typechecks do not prove full application compatibility after replacing the committed generated client; that replacement was not performed.

SBOM coverage is an installed package/component inventory linked to the lockfile hash. It does not contain a complete dependency relationship graph, signed provenance, static asset rights, or a formal conformity assessment. npm advisories are point-in-time signals and cannot prove absence of vulnerabilities.

## Residual Release Gates

`NO_GO`

Open baseline release findings: **P0: 2** pending rollout/production verification (extension and private history); **P1: 4** (operator identity, AI/vendor safeguards, CRA operation, retention deployment); **P2: 4** (provider log retention, lifecycle/license/CI evidence, accessibility, German legal transparency). These are gate counts, not a claim that two P0 defects remain in the locally remediated code. Legal review groups: **3** (operator/legal text, vendor/transfer assessment, consumer/accessibility/sector applicability). Organizational confirmation groups: **4** (contracts/data settings, retention/backups/logs, incident reporting ownership, release/support/QA evidence).

1. Confirm the full natural-person or registered-entity operator name and that the Hamburg c/o address is serviceable for that operator; provide representation/register/VAT facts only where applicable.
2. Confirm Vercel/Neon plans, regions, DPAs, backups and logging retention; provide OpenRouter/actual model-provider no-training/routing/retention/transfer evidence.
3. Name the CRA/security incident owner and approve the operational reporting/contact process, support period and vulnerability handling policy.
4. Configure production `CRON_SECRET`, deploy and verify private links, public collection denial, scheduled deletion and failure monitoring; perform a staging/PostgreSQL retention drill.
5. Run installed Chrome/wallet QA for v1.0.3 and publish updated Store disclosures after gate review; complete keyboard/screen-reader/accessibility and German consumer-facing legal review.

Technical procedures and manual flows are in `RETENTION_OPERATIONS.md`, `RELEASE_CHECKLIST.md` and `docs/production-qa-matrix.md`. Operator answers are still pending; this checkpoint does not invent them.
