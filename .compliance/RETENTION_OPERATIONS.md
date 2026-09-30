# Analysis Retention Operations

Updated: 2026-09-30. Implemented configuration is not evidence of a successful production cleanup.

Operator checkpoint: Kevin Kauper confirms Production `CRON_SECRET` and `SIGIL_ANALYSIS_RETENTION_DAYS` setup completed and authorises GitHub publication of the prepared code. Values were not disclosed or independently inspected. Commit `d03a89c3fce45dd65e29bad5052a771d44391372` was pushed; Kevin subsequently confirms its Vercel deployment is Ready and the cron job is visible. This is operator-provided deployment evidence, not an independently observed successful cron run. Run status and Neon backup evidence remain pending. Publishing the job can activate real age-based deletion; publication permission is not an overall compliance GO.

Ordinary analysis rows become eligible for deletion after `SIGIL_ANALYSIS_RETENTION_DAYS` (default 30, bounded to 1-365). Curated Hall of Shame rows are excluded. The daily job can leave eligible rows until the next successful run; allow approximately one additional day during healthy daily operation. Backups and upstream provider retention require separate controls.

## Vercel

Both supported Vercel project roots configure `GET /api/sigil/maintenance/retention` daily at `17 3 * * *` (UTC). Set a random production `CRON_SECRET` of at least 16 characters, then redeploy. Vercel supplies it as `Authorization: Bearer <secret>`. Missing/incorrect authorization returns 401 before database work. Database failure returns 500 without connection details.

After deploying, verify the job appears under project Settings / Cron Jobs, invoke it there, inspect the successful status/deletion count and confirm eligible ordinary rows disappear while curated cases remain. Monitor failed/missing runs and re-run after correcting failures. Public API rate limiting can reject a run; verify actual middleware behavior in production. A once-daily schedule is not a guarantee of exact 30-day physical deletion.

## Standalone Express

Schema initialization does not delete records. Operators running outside Vercel must configure an external daily scheduler to call the same endpoint with the secret. Keep credentials in protected scheduler configuration, not command history or logs. Without that scheduler, automatic deletion is not active. This deployment is outside the verified Vercel dispatch path.

No production database deletion was executed during this audit. Behavioral tests use database mocks, and SQL tests verify the parameterized age predicate. A staging/PostgreSQL deletion drill and production scheduler evidence remain required.

Source: [Vercel cron management and authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Hobby Schedule and Failure Control

Official documentation checked 2026-09-30: Hobby supports once-daily cron jobs with hour-level rather than minute-level precision. The configured expression is compatible; do not promise execution exactly at 03:17 UTC. Vercel does not automatically retry a failed cron invocation. Source: [Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing) and the management guide above.

Proposed lightweight manual control, awaiting operational confirmation: Kevin Kauper checks the most recent successful run at least daily and records its UTC timestamp, status and deletion count privately. Escalate immediately on observed 401/429/500, timeout or no successful run for 26 hours. The 26-hour threshold is a proposed monitoring trigger, not a promised deletion limit. Mailbox notifications are not evidence of cron monitoring; no automated alert is installed.

| Failure | Response |
| --- | --- |
| 401 | Verify production `CRON_SECRET` exists and the deployed function uses its current value. Redeploy after configuration changes; do not log the secret. |
| 429 | Check rate-limit/firewall behavior and invocation source; retry after the indicated delay using the authorised control. Do not globally remove public rate limits. |
| 500/timeout | Inspect sanitised execution logs, database availability/schema and function limits. Preserve evidence and investigate before repeating. |
| No invocation | Confirm cron enabled on the actual production project/root and deployment, plan limits and deployment protection. |

Recovery invocation performs real deletion. Before a manual live invocation, review eligible counts privately and obtain approval for the actual deletion. This audit did not invoke the live endpoint. An HTTP 200 with `deleted: 0` is a valid execution, but not proof that the cutoff or database selection is correct. Concurrent/repeated calls do not require invented retry promises; verify actual behavior before enabling an external scheduler.

## Staging Deletion Drill

Use an isolated empty staging database with synthetic fixtures, not a branch cloned from real production data. Confirm the application points to that database without printing credentials. Under a 30-day policy create four owned fixtures: ordinary 31-day-old, ordinary recent, curated 31-day-old, and ordinary exactly at a fixed test cutoff. Verify only the old ordinary row is deleted, curated/recent rows survive, the strict `<` boundary is understood, and a second run deletes zero. A moving database `now()` can cross a boundary between commands; use a fixed transaction timestamp for boundary verification or a suitable margin for endpoint testing.

Also verify missing/wrong secret denial before DB work, sanitized DB failure and subsequent successful recovery. Archive counts/statuses, not record contents. Mock tests do not replace this PostgreSQL drill. No staging credentials or database connector are available to this audit, so the drill is prepared, NOT RUN.

## Neon Restore and Backup Inventory

Operator-confirmed settings on 2026-09-30: integrated Neon database uses Free; project History Window is 6 hours; region is AWS US East 1 (N. Virginia), `us-east-1`, USA, as read by Kevin Kauper in the console. Plan/window/region evidence is complete on operator attestation, not independent console inspection. Other branches, snapshots, external exports and provider physical-deletion terms remain unverified. This does not establish that all copies disappear six hours after SQL deletion. No region migration performed; US processing must be included in the vendor/transfer assessment.

Record the actual integrated Neon plan, region, root/child branches, restore/history window, snapshots and any external exports with their owners/access and expiry. Do not infer settings from a generic Free-plan default. Neon restore history can recover earlier data; ordinary SQL deletion does not prove immediate erasure from that history or provider infrastructure.

If restoring a database, keep the restored workload inaccessible to users until the applicable retention cutoff and any separately recorded erasure requests are reapplied and verified. Age-based cleanup alone cannot reapply an individual erasure request for a recent record. Keep necessary minimal erasure references privately and securely for this purpose, not in public source or logs. Review recovery branches, snapshots and exports as well as the primary database; do not delete provider-managed backups blindly.

Primary provider source: [Neon instant restore documentation source](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md) (official repository, checked 2026-09-30). Actual retention settings and contractual physical-deletion timelines remain unverified.

## Operator Evidence Needed

1. Confirm `CRON_SECRET` is configured for Production and the deployment includes this job; provide only setting names/status, never the secret.
2. Record a successful scheduled-run timestamp/status and approved staging drill result. Do not use a live deletion as a test without approval.
3. Supply Neon plan/region/restore-window and branch/snapshot/export inventory, without connection URLs or credentials.
4. Confirm who performs daily run review, failure recovery and absence coverage. No alert automation is claimed.
