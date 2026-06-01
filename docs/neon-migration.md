# Sigil Neon Migration Runbook

Last updated: June 1, 2026

## Target Architecture

- Frontend and API hosting remain on Vercel.
- Neon becomes the production Postgres provider.
- `DATABASE_URL` is the pooled Neon connection string used by the runtime API.
- `DATABASE_URL_UNPOOLED` is the direct Neon connection string used for schema pushes and data migration.
- Analysis history and Hall of Shame records live in the `analyses` table.

## Prerequisites

1. Neon project created in the desired region.
2. Production database and role created.
3. Pooled connection string copied from Neon.
4. Direct/unpooled connection string copied from Neon.
5. Current production database URL available if historical data should be migrated.

Recommended Neon region for Sigil:

```text
AWS Europe (Frankfurt) - aws-eu-central-1
```

## Vercel Environment Variables

Set these in Vercel Project Settings for Production:

```text
DATABASE_URL=<Neon pooled connection string>
DATABASE_URL_UNPOOLED=<Neon direct connection string>
```

Keep the existing AI and Etherscan variables:

```text
AI_INTEGRATIONS_OPENAI_BASE_URL
AI_INTEGRATIONS_OPENAI_API_KEY
SIGIL_AI_MODEL
ETHERSCAN_API_KEY
LOG_LEVEL
```

## Schema Setup

From a local shell with the Neon direct URL available:

```powershell
$env:DATABASE_URL_UNPOOLED="postgresql://..."
$env:DATABASE_URL=$env:DATABASE_URL_UNPOOLED
node "$env:LOCALAPPDATA\node\corepack\v1\pnpm\11.1.2\bin\pnpm.cjs" --filter @workspace/db push
```

The API also runs a defensive `analyses` table repair on first use, but a schema push is cleaner before production cutover.

## Data Migration Options

### Clean Cutover

Use this if old analysis history is not important:

1. Push schema to Neon.
2. Set Vercel `DATABASE_URL` to Neon pooled URL.
3. Redeploy Vercel.
4. Run production checks.

### Preserve Existing Data

Use this if current `analyses` history should be retained:

1. Disable or pause writes briefly if possible.
2. Export the old Postgres database with `pg_dump`.
3. Restore into Neon using the direct Neon URL.
4. Push/repair schema.
5. Switch Vercel `DATABASE_URL` to the pooled Neon URL.
6. Redeploy Vercel.
7. Run production checks.

Suggested commands when PostgreSQL CLI tools are installed:

```powershell
pg_dump "$env:OLD_DATABASE_URL" --format=custom --no-owner --no-acl --file C:\tmp\sigil-prod.dump
pg_restore --dbname "$env:DATABASE_URL_UNPOOLED" --no-owner --no-acl --clean --if-exists C:\tmp\sigil-prod.dump
```

## Post-Cutover Checks

Check these URLs after Vercel redeploys:

```text
https://sigil.s3ntrylabs.com/api/healthz
https://sigil.s3ntrylabs.com/api/readyz
```

Expected:

- `/api/healthz` returns `status: "ok"`.
- `/api/readyz` returns `status: "ready"`.
- `/api/readyz` returns `database.status: "ready"`.

Then run one real Sigil analysis and confirm:

1. The result page opens.
2. The analysis is stored.
3. `/history` or the Global Intel Feed can read the new record.

## Rollback

If Neon readiness fails:

1. Restore the previous Vercel `DATABASE_URL`.
2. Redeploy Vercel.
3. Confirm `/api/readyz` returns ready again.
4. Investigate Neon connection string, region, SSL mode, or pooler settings before retrying.

Do not delete the old database until production has been stable on Neon.
