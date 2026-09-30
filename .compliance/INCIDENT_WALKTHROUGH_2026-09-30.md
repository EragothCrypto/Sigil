# Incident Walkthrough - 2026-09-30

Scope: analyst-only review of synthetic scenarios from `INCIDENT_EXERCISE.md`, using current local source. No actual incident, live user data, authority notification, key rotation, rollback or database deletion. Kevin Kauper accepted emergency responsibility and confirmed existing incoming-mail notifications are satisfactory; no deputy. This records logical preparedness, not an operator rehearsal or verified production access.

## A. Synthetic Analysis Disclosure

Awareness assumption: 2026-10-01 08:00 UTC. Under the exercise assumption that GDPR authority notification is required, the outer 72-hour deadline is 2026-10-04 08:00 UTC; this is not permission to wait until that time.

- First containment: restrict the affected API route/deployment using a preverified hosting control; do not rely solely on removing the homepage or disabling new submissions because existing result links can still work. Preserve minimal private evidence first where safe.
- Source anchor: `findPublicAnalysis` in `artifacts/api-server/src/routes/sigil/index.ts` restricts numeric IDs to curated records and normal analyses to UUID lookup. UUIDs remain bearer links, not user authentication; leaked links are still a relevant exposure.
- Validate recovery using synthetic owned records in staging: normal numeric ID denied, known private UUID accessible only as designed, public collection empty, curated links preserved. Do not enumerate production IDs or fetch unrelated private records.
- Decide authority/user notices from affected data and actual risk, with unknown scope clearly marked. Independent CRA/provider-contract decisions remain separate.
- Do not treat scheduled retention as urgent containment or assume it deletes provider logs/backups. Do not use the retention endpoint to erase incident evidence or undertake bulk deletion without approval.

Synthetic initial notice draft: "We are investigating potential unauthorised access to analysis records. Affected versions, record counts and data categories are under assessment. We have restricted the affected service and are preserving evidence. No private-key compromise has been established. Further confirmed findings and recommended actions will follow." This is a rehearsal draft, not a claim about Sigil production or a complete statutory form.

## B. Synthetic Exploited Extension Defect

Awareness assumption: 2026-10-01 08:00 UTC, with reliable exploitation evidence. For this scenario only, assume manufacturer CRA duties apply. Early-warning deadline: 2026-10-02 08:00 UTC; follow-up deadline: 2026-10-04 08:00 UTC. If a corrective measure is available on 2026-10-03 12:00 UTC, the exploited-vulnerability final-report deadline is 2026-10-17 12:00 UTC. A severe incident's separate final deadline depends on its actual notification date plus one calendar month.

- Stop distribution of the affected package and prepare a reviewed corrective release with regression tests and an accurate version advisory. Store actions must be verified in the operator account; submission does not guarantee immediate installation or removal from existing users.
- Source anchor: the wrapper in `artifacts/sigil-extension/inject.js` invokes the original wallet provider independently. Disabling Sigil's backend therefore cannot be assumed to neutralise already installed extension code or stop wallet execution.
- If necessary, advise affected users to disable the compromised extension pending an update. Do not promise Sigil can revoke blockchain permissions, reverse transactions or change wallet decisions. Any wallet actions belong to the user in their wallet after checking authoritative information.
- Determine applicable reporting access, correct CSIRT and user notices. During SRP outage, privately retain attempts and continue containment; apply the approved outage procedure. No real portal was accessed for this review.

## Verification and Remaining Gaps

Current focused command: `node --test artifacts/api-server/src/routes/sigil/analysis-privacy.test.cjs artifacts/api-server/src/routes/sigil/analysis-retention.test.cjs`.

Result: three retention tests passed; the privacy test file could not start because its required local `node_modules/typescript` package is missing. This is an environment/test coverage gap, not evidence of a privacy regression. Earlier checkpoint results remain historical; do not describe the current combined run as passing. No dependency install or unrelated test-harness edit was made during this documentation step.

Logical clocks, containment boundaries and communication limits were reviewed. Operational acceptance remains PENDING: operator-access/MFA/recovery confirmation, absence procedure, applicable authority/CRA scope and operator rehearsal/sign-off. No pass is awarded from this analyst-only walkthrough. Vendor, production retention, rollout and QA gates remain open; overall `NO_GO`, gate counts unchanged.
