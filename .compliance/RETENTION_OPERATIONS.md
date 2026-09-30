# Analysis Retention Operations

Updated: 2026-09-30. Implemented configuration is not evidence of a successful production cleanup.

Ordinary analysis rows become eligible for deletion after `SIGIL_ANALYSIS_RETENTION_DAYS` (default 30, bounded to 1-365). Curated Hall of Shame rows are excluded. The daily job can leave eligible rows until the next successful run; allow approximately one additional day during healthy daily operation. Backups and upstream provider retention require separate controls.

## Vercel

Both supported Vercel project roots configure `GET /api/sigil/maintenance/retention` daily at `17 3 * * *` (UTC). Set a random production `CRON_SECRET` of at least 16 characters, then redeploy. Vercel supplies it as `Authorization: Bearer <secret>`. Missing/incorrect authorization returns 401 before database work. Database failure returns 500 without connection details.

After deploying, verify the job appears under project Settings / Cron Jobs, invoke it there, inspect the successful status/deletion count and confirm eligible ordinary rows disappear while curated cases remain. Monitor failed/missing runs and re-run after correcting failures. Public API rate limiting can reject a run; verify actual middleware behavior in production. A once-daily schedule is not a guarantee of exact 30-day physical deletion.

## Standalone Express

Schema initialization does not delete records. Operators running outside Vercel must configure an external daily scheduler to call the same endpoint with the secret. Keep credentials in protected scheduler configuration, not command history or logs. Without that scheduler, automatic deletion is not active. This deployment is outside the verified Vercel dispatch path.

No production database deletion was executed during this audit. Behavioral tests use database mocks, and SQL tests verify the parameterized age predicate. A staging/PostgreSQL deletion drill and production scheduler evidence remain required.

Source: [Vercel cron management and authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
