# Cyber Resilience Act Readiness

## Scope and Dates

The Chrome extension is a product with digital elements made available in the EU. The web/API can also be an integral remote data-processing solution. Article 14 vulnerability/incident reporting applies from 2026-09-11; the broader CRA regime applies from 2027-12-11.

## Readiness

| Control | State | Required action |
| --- | --- | --- |
| Vulnerability intake | Partial | `SECURITY.md` added with a private reporting channel; establish ticket ownership and response SLAs. |
| Actively exploited vulnerability/severe incident reporting | Missing | Register process and contacts for the designated CSIRT coordinator and ENISA single reporting platform; document 24-hour early warning, 72-hour notification and final-report workflow as applicable. |
| Secure development lifecycle | Partial | Existing tests/security scans help; add CI gates, threat-model updates and release sign-off. |
| Vulnerability handling | Partial | No formal triage severity/SLA, coordinated disclosure or customer notification playbook. |
| Security updates | Partial | Chrome/Vercel can distribute updates, but support period, emergency rollout, rollback and user communication are undocumented. |
| SBOM/dependency evidence | Partial | Installed component inventory, license metadata and final lockfile/advisory evidence generated on 2026-09-30. Complete asset rights, dependency graph/provenance and release archival. |
| Product documentation | Partial | Version/permissions/store copy exist; add security properties, limitations, support period, update policy and manufacturer identity. |
| Technical documentation/conformity | Missing | Prepare risk assessment, architecture, essential cybersecurity requirements mapping, testing evidence and EU declaration/CE process before full application. |
| End-of-support | Missing | Define a support period consistent with expected use and publish end-of-support handling. |

Primary source: https://eur-lex.europa.eu/eli/reg/2024/2847/oj.
