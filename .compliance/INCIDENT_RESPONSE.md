# Incident Response Runbook

## Contacts and Roles

- Intake: `info@s3ntrylabs.com` with subject `Sigil security report`.
- Incident commander, privacy lead, technical lead, communications owner and legal contact: assign named people outside the repository before release.
- Maintain access to Vercel, Neon, OpenRouter, Chrome Web Store, domain/DNS and GitHub with MFA and recovery controls.

## First Response

1. Record detection time, reporter, affected versions, systems, data categories and current evidence.
2. Preserve logs and deployment/database snapshots without copying unnecessary personal data.
3. Contain: revoke/rotate keys, disable affected endpoints/features, pause extension rollout, restrict database access or roll back deployment.
4. Assess confidentiality, integrity, availability, user safety, exploitability and whether private keys/transactions could be affected.
5. Determine notification clocks immediately.

## Regulatory and User Assessment

- GDPR: assess personal-data breach risk; document the decision. Notify the competent supervisory authority within 72 hours when required and affected persons without undue delay for high risk.
- CRA Article 14: for actively exploited vulnerabilities or severe incidents affecting product security, use the designated CSIRT/ENISA reporting route and applicable staged deadlines, including early warning and follow-up reports.
- Contract/store: check Vercel, Neon, OpenRouter, Chrome Web Store and partner notification duties.
- User notice must state facts, affected versions/data, likely consequences, mitigation, update/revocation instructions and contact channel without minimizing uncertainty.

## Recovery and Closure

- Patch with regression tests; perform security review and staged release.
- Rotate affected credentials and verify no secret remains in history, logs or artifacts.
- Confirm data restoration/deletion, monitoring and update adoption.
- Write a post-incident report with root cause, timeline, impact, decisions, notifications and corrective owners/dates.
- Feed lessons into threat model, SBOM, CRA technical file, privacy risk assessment and support documentation.
