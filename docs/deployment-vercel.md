# Sigil Vercel Deployment

Sigil needs both the Vite frontend and the Express API. The production domain for the current launch is:

```text
https://sigil.s3ntrylabs.com
```

## Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables for Production, Preview, and Development as needed.

```text
DATABASE_URL
AI_INTEGRATIONS_OPENAI_BASE_URL
AI_INTEGRATIONS_OPENAI_API_KEY
SIGIL_AI_MODEL
```

Optional:

```text
ETHERSCAN_API_KEY
LOG_LEVEL
```

For OpenRouter with DeepSeek V4 Flash free:

```text
AI_INTEGRATIONS_OPENAI_BASE_URL=https://openrouter.ai/api/v1
AI_INTEGRATIONS_OPENAI_API_KEY=<your OpenRouter API key>
SIGIL_AI_MODEL=deepseek/deepseek-v4-flash:free
```

`DATABASE_URL` must point at a hosted Postgres database. Vercel Postgres, Neon, Supabase, Railway, or another managed Postgres provider can work as long as the URL is valid from Vercel Functions.

Sigil creates or updates its small `analyses` table on first API use. For manual database management, the same schema can also be pushed from the repo with `pnpm --filter @workspace/db push`.

Use the exact uppercase variable name `DATABASE_URL` in Vercel. `Database_Url`, `database_url`, and other casing variants will not be read by Node.js. Do not use Replit's internal/provisioned database URL in Vercel; use a database that accepts external connections from Vercel Functions.

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
