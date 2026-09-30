# Incident Tabletop Exercise

Status: prepared, NOT RUN. This document contains synthetic scenarios only. Complete a private exercise record; do not put real incident data, credentials or user identifiers in this repository. Do not send test reports to authorities or real users.

Checkpoint 2026-09-30: a code-grounded analyst walkthrough is documented in `INCIDENT_WALKTHROUGH_2026-09-30.md`. This is not an operator-participated rehearsal, production test or full operational pass. Notification operation is accepted on operator attestation; no extra test email is required.

## Prerequisites

- Incident owner confirmed: Kevin Kauper. Incoming-mail notifications declared, no deputy. Before operational sign-off, verify delivery/access and document absence handling; a daily review schedule remains unapproved.
- Owner can access deployment rollback, key rotation, database controls and Store release management using MFA; record verification without secrets.
- Identify applicable notification tracks and competent recipients; unresolved CRA classification remains explicit.

## Scenario A: Private Analysis Disclosure

Synthetic premise: at 2026-10-01 08:00 UTC a credible report shows that a new API defect discloses private analysis records. No actual defect or disclosure is asserted.

1. Record awareness, available evidence, affected deployment and unknown scope. Preserve minimal evidence privately.
2. Describe safe containment and how to verify it without querying other users' records.
3. Evaluate personal-data breach risk and authority/user notification independently. Under the synthetic premise that the GDPR notification is required, the 72-hour outer deadline is 2026-10-04 08:00 UTC; action without undue delay remains required.
4. Draft a factual initial notification with unknowns marked, not invented. Plan staged updates, user advice and recovery verification.

## Scenario B: Exploited Extension Defect

Synthetic premise: awareness at 2026-10-01 08:00 UTC; credible active-exploitation evidence is available. Assume manufacturer CRA reporting applies solely for this exercise.

1. Classify exploitation separately from severity and personal-data consequences.
2. Early-warning outer deadline: 2026-10-02 08:00 UTC. Notification outer deadline: 2026-10-04 08:00 UTC. Both clocks start at awareness, not submission or patch availability.
3. Assume a corrective measure is available at 2026-10-03 12:00 UTC: exploited-vulnerability final-report outer deadline is 2026-10-17 12:00 UTC. For a separately qualifying severe incident, compute its final deadline from the actual 72-hour notification submission plus one calendar month, not 30 days.
4. Rehearse SRP outage handling, update distribution and affected-user advice without an actual portal submission. Do not imply Chrome review or propagation is instantaneous.

## Private Record Fields

Exercise ID/date; participant/approver; scenario; awareness timestamp; legal scope assumptions; recipients; computed deadlines; evidence location; containment authority; MFA/access result; draft communication; recovery checks; absence coverage; unresolved actions/owner/due date; pass/fail and sign-off.

## Acceptance

Pass only when an approved owner can find required access, compute independent clocks, distinguish reporting tracks, draft accurate communication, explain containment/recovery and record outstanding gaps. A written template alone is not completion. Failures create follow-up work in the existing release-gate dashboard task, not a false claim of operational readiness.
