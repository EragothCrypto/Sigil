# Cyber Resilience Act Readiness

## Scope and Dates

Applicability refreshed on 2026-09-30: `LEGAL_REVIEW_REQUIRED`. The Chrome extension is software distributed in the EU, but downloadability alone does not establish CRA market placement. The operator declares current non-profit/non-commercial operation. Assess actual commercial activity, any FOSS licence and manufacturer/steward role before concluding applicability or exemption. The web/API may be an integral remote data-processing solution. For in-scope manufacturers, Article 14 reporting applies from 2026-09-11 and the broader regime from 2027-12-11; steward reporting has a different start date. Do not treat CRA and Vercel plan definitions as interchangeable.

## Readiness

| Control | State | Required action |
| --- | --- | --- |
| Vulnerability intake | Owner confirmed; operational evidence pending | Kevin Kauper accepted emergency responsibility; incoming-message notifications declared, no deputy. Verify notification delivery/access and document absence handling; no daily review or public SLA assumed. |
| Actively exploited vulnerability/severe incident reporting | Draft prepared; owner confirmed; not operationally verified | `INCIDENT_RESPONSE.md` and `INCIDENT_EXERCISE.md` define conditional reporting and rehearsal evidence. Kevin Kauper is emergency owner. Confirm applicability, absence procedure, access and complete rehearsal; no registration/submission performed. |
| Secure development lifecycle | Partial | Existing tests/security scans help; add CI gates, threat-model updates and release sign-off. |
| Vulnerability handling | Partial | No formal triage severity/SLA, coordinated disclosure or customer notification playbook. |
| Security updates | Partial | Chrome/Vercel can distribute updates, but support period, emergency rollout, rollback and user communication are undocumented. |
| SBOM/dependency evidence | Partial | Installed component inventory, license metadata and final lockfile/advisory evidence generated on 2026-09-30. Complete asset rights, dependency graph/provenance and release archival. |
| Product documentation | Partial | Version/permissions/store copy exist; add security properties, limitations, support period, update policy and manufacturer identity. |
| Technical documentation/conformity | Missing | Prepare risk assessment, architecture, essential cybersecurity requirements mapping, testing evidence and EU declaration/CE process before full application. |
| End-of-support | Missing | Define a support period consistent with expected use and publish end-of-support handling. |

Primary source: https://eur-lex.europa.eu/eli/reg/2024/2847/oj.

Current official guidance reviewed 2026-09-30: [Commission scope summary](https://digital-strategy.ec.europa.eu/en/policies/cra-summary), [Commission reporting guidance](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), and [ENISA SRP FAQ](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp/frequently-asked-questions). Legal text retrieval was blocked by the EUR-Lex browser response during this scoped refresh; current agency guidance supports the operational draft, not a definitive legal classification.
