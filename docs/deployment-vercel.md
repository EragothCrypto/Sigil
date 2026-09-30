# Sigil Vercel Deployment

Sigil needs both the Vite frontend and the Express API. The production domain for the current launch is:

```text
https://sigil.s3ntrylabs.com
```

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables for Production, Preview, and Development as needed.

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
AI_INTEGRATIONS_OPENAI_BASE_URL
AI_INTEGRATIONS_OPENAI_API_KEY
SIGIL_AI_MODEL
```

Optional:

```text
ETHERSCAN_API_KEY
SIGIL_ALLOWED_ORIGINS
SIGIL_RATE_LIMIT_WINDOW_MS
SIGIL_RATE_LIMIT_MAX
LOG_LEVEL
```

For OpenRouter with DeepSeek V4 Flash (paid):

```text
AI_INTEGRATIONS_OPENAI_BASE_URL=https://openrouter.ai/api/v1
AI_INTEGRATIONS_OPENAI_API_KEY=<your OpenRouter API key>
SIGIL_AI_MODEL=deepseek/deepseek-v4-flash
```

The retired `:free` slug returns an upstream 404. Update an existing Vercel
`SIGIL_AI_MODEL` value as well: environment configuration overrides the code
default. Redeploy after changing the variable. Keep training permissions disabled
and configure an OpenRouter API-key spending limit before production use (proposed
initial budget: USD 5/month; not enforced by this repository). Model selection
does not pin a hosting provider or establish ZDR, EU residency or DPA coverage.

`DATABASE_URL` must point at a hosted Postgres database. For Sigil production, use Neon Postgres with the pooled connection string as `DATABASE_URL`. The pooled Neon host usually contains `-pooler`.

`DATABASE_URL_UNPOOLED` is recommended for schema pushes and migrations. Use the direct Neon connection string without `-pooler`.

Sigil creates or updates its small `analyses` table on first API use. For manual database management, the same schema can also be pushed from the repo with `pnpm --filter @workspace/db push`.

Use the exact uppercase variable name `DATABASE_URL` in Vercel. `Database_Url`, `database_url`, and other casing variants will not be read by Node.js. Do not use Replit's internal/provisioned database URL in Vercel; use a database that accepts external connections from Vercel Functions.

`ETHERSCAN_API_KEY` is required for Etherscan-backed contract and reputation lookups. Sigil no longer falls back to the shared `YourApiKeyToken` placeholder because that can cause unpredictable shared rate limits in production.

`SIGIL_ALLOWED_ORIGINS` can be used to add comma-separated frontend origins beyond Sigil's production and local defaults. Chrome extension origins are accepted by pattern so the Web Store extension can call the API without opening CORS to every website.

`SIGIL_RATE_LIMIT_WINDOW_MS` and `SIGIL_RATE_LIMIT_MAX` control the lightweight API rate limiter. Defaults are `60000` and `60`, meaning 60 requests per IP per minute on each warm serverless instance.

## Neon Production Database

Recommended setup:

```text
Neon region: AWS Europe (Frankfurt), aws-eu-central-1
Runtime URL: DATABASE_URL=<pooled Neon URL>
Migration URL: DATABASE_URL_UNPOOLED=<direct Neon URL>
```

Use the same Neon production database for Vercel Production. Use a separate Neon branch or database for Vercel Preview if previews should not write into production analysis history.

After changing `DATABASE_URL` in Vercel, redeploy the project so all serverless functions pick up the new database connection.

## Local Setup

Copy the template and fill in real values:

```powershell
Copy-Item .env.example .env
```

Real `.env` files are ignored by git. Do not commit secrets.

## Routing

The repository includes Vercel configs for two common project roots:

- Root project: `vercel.json`
- `artifacts/sigil` as project root: `artifacts/sigil/vercel.json`

Both route `/api/*` to the Express API function before falling back to the Vite SPA.

## Post-Deploy Checks

After Vercel deploys, check:

```text
https://sigil.s3ntrylabs.com/api/healthz
https://sigil.s3ntrylabs.com/api/readyz
```

Expected:

- `/api/healthz` returns `{ "status": "ok" }`
- `/api/readyz` returns `status: "ready"` and `database.status: "ready"`

If `/api/readyz` returns `missing_env`, add the listed variables in Vercel and redeploy. If it returns `storage_error`, replace `DATABASE_URL` with a hosted Postgres URL reachable from Vercel.

If `/api/sigil/analyze-stream` returns 404, Vercel is still serving the frontend without the API route. Confirm that the latest commit is deployed and that the project root matches one of the included configs.
