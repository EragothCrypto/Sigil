# Incident Response Runbook

## Contacts and Roles

Status 2026-09-30: Kevin Kauper expressly accepted emergency responsibility. The operator reports that incoming contact-mailbox messages trigger notifications and confirms no deputy exists. Responsibility and the declared intake arrangement are recorded; the complete runbook, access and rehearsal remain unverified. No authority accounts, incident notifications, monitoring automation or public SLA were created by this audit.

- Intake: `info@s3ntrylabs.com` with subject `Sigil security report`.
- Emergency owner: Kevin Kauper, responsible for coordinating triage, reporting decisions, technical response and user communication. This role does not appoint him as a statutory DPO or external legal adviser; specialist advice remains to be obtained when needed.
- Intake coverage: incoming-message notifications, as declared by the operator. Daily manual review, delivery reliability and response availability are not confirmed.
- Subsequent operator confirmation: existing notification operation is satisfactory; no additional test email requested. Treat this as operator attestation, not an independently observed delivery test. Daily manual checks and continuous availability remain unconfirmed.
- Deputy: none. Absence, loss of notification access or owner unavailability is an unresolved single-person operational risk. Document an absence procedure or backup arrangement before claiming dependable coverage.
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

### Independent Reporting Decisions

Maintain separate decisions for a personal-data breach, product-security event and provider/store obligations. A dependency advisory or Jules PR alone is not evidence of active exploitation. Record a non-reporting decision with rationale and revisit it when evidence changes. Do not delay applicable deadlines while waiting for a complete root cause or a patch.

| Track | Trigger and clock | Follow-through |
| --- | --- | --- |
| GDPR Articles 33/34 | On awareness of a personal-data breach, notify the competent authority without undue delay and, where feasible, within 72 hours unless risk to individuals is unlikely; document all breaches. | Supply available facts, explain any delay and provide missing details in stages. Notify affected individuals without undue delay where high risk requires it, subject to applicable exceptions. Identify the competent authority from actual establishment, not just a postal c/o address. |
| CRA Article 14, only if in scope | Active exploitation or qualifying severe product-security incident: early warning without undue delay, within 24 hours of awareness; notification within 72 hours of awareness. | Exploited vulnerability final report within 14 days after a corrective/mitigating measure becomes available; severe-incident final report within one month of the 72-hour notification. Assess required affected-user communication separately. |
| Provider/store contracts | Check the actual applicable terms immediately. | Record recipient, deadline, submitted material and acknowledgement; an authority report does not replace contractual notice. |

CRA scope is currently `LEGAL_REVIEW_REQUIRED` after the non-commercial clarification. Manufacturer and open-source-steward duties differ; do not register under an invented role or make a statutory notification merely to test a form.

### Reporting Access

For applicable CRA reports, use the [ENISA SRP](https://portal.cra-srp.enisa.europa.eu) and determine the correct national coordinating CSIRT from actual establishment. Authorised representatives need EU Login with MFA; confirm access and recovery privately. If the portal is unavailable, record the outage and retries, contact the coordinating CSIRT if immediate communication is needed, and submit through SRP when restored. Direct contact is not a substitute for the later SRP submission. Calculate deadlines independently of portal reminder counters.

### Private Incident Record

Keep live incident records in access-controlled storage outside this public repository. Use the template in `INCIDENT_EXERCISE.md` with synthetic data for rehearsal only. Record UTC awareness/detection times, classification, owners, version/commit, evidence location, containment, risk decisions, recipients, acknowledgements, outstanding questions and next review time. Do not attach wallet addresses, prompts, credentials or personal-data dumps to public GitHub issues.

Proposed internal targets, awaiting operator approval: review security intake daily, triage credible urgent reports immediately on awareness, and assign a next-review time for every incident. These targets are operational proposals, not statutory deadlines or public response guarantees. Missing coverage/representation must be documented rather than assumed.

## Recovery and Closure

- Patch with regression tests; perform security review and staged release.
- Rotate affected credentials and verify no secret remains in history, logs or artifacts.
- Confirm data restoration/deletion, monitoring and update adoption.
- Write a post-incident report with root cause, timeline, impact, decisions, notifications and corrective owners/dates.
- Feed lessons into threat model, SBOM, CRA technical file, privacy risk assessment and support documentation.

## Evidence and Approval Needed

- Owner confirmed: Kevin Kauper; incoming-message notification operation confirmed by the operator; no deputy. Additional test email is optional and not a legal prerequisite. Remaining operational evidence: necessary response/reporting access and an absence/recovery procedure. Do not share mailbox credentials or claim an independently observed delivery test.
- Actual establishment/competent authority and CRA role/scope decision.
- MFA/recovery and necessary reporting/provider access verified by the operator.
- Completed synthetic rehearsal with documented independent clocks and reporting decisions; no test submissions to production authority portals.
- Support period and public vulnerability-response commitments approved separately before publication.

Primary guidance checked 2026-09-30: [EDPB data breaches](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en), [Commission CRA reporting](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting), [ENISA SRP FAQ](https://www.enisa.europa.eu/topics/product-security/vulnerability-services/eu-incident-response-and-cyber-crisis-management/single-reporting-platform-srp/frequently-asked-questions). Guidance supports the draft; provider facts and operational completion remain unverified.
