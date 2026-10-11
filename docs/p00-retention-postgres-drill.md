# P00 Isolated PostgreSQL Retention Drill

Updated 2026-10-09. **Real isolated PostgreSQL predicate/recovery drill PASS locally.** Earlier Docker-unavailable/ECONNREFUSED checkpoints are superseded for this local drill after Kevin started Docker Desktop. Production scheduler, real Neon backup/restore and end-to-end deployed endpoint acceptance remain OPEN. No production database, retention endpoint or real user-data deletion was invoked.

## Scope and Safeguards

`node scripts/verify-retention-postgres.mjs` executes the actual `runAnalysisRetentionCleanup` source helper against a real pg Client adapter, not a copied retention predicate or in-memory SQL engine. It does not import the application pool or use `DATABASE_URL`.

The only accepted explicit `SIGIL_P00_DATABASE_URL` is PostgreSQL on numeric IPv4 loopback (`127.0.0.1`), database `sigil_p00_retention`, role `sigil_p00`, no URL query/hash options. IPv6 URL contexts are rejected because the installed connection-string driver retains brackets in the host. It checks server-reported database/role and absence of user tables/views before beginning. No remote/staging/provider URL is accepted, even if the caller labels it a test. Failure output contains only a bounded stage/whitelisted code, never the URL or raw database error.

All fixture work occurs in a single transaction using temporary tables and `search_path=pg_temp,pg_catalog`. No public-schema relation fallback. The `analyses` relation is checked as temporary before invoking cleanup. Frozen transaction `now()` and UTC timezone make the exact 30-day boundary stable. Final success requires rollback; failure attempts rollback and closes the connection. This is not production TLS configuration; existing production verify-full guidance is unchanged.

## Required Controls

| Control | Actual drill assertion |
| --- | --- |
| Ordinary 31-day-old row | Deleted by actual helper; first cleanup count 1. |
| Ordinary recent row | Survives age cleanup. |
| Curated 31-day-old row | Survives age cleanup. |
| Ordinary exact cutoff | Survives strict `<` boundary at fixed transaction timestamp. |
| Second cleanup | Count 0, unchanged survivors. |
| DB relation unavailable | Missing temporary relation error propagates; savepoint rollback restores relation and subsequent cleanup succeeds. |
| Synthetic restore/re-erasure | Erase owned recent row and assert absence; restore snapshot and assert resurrection; reapply age cutoff and the same erasure decision, assert absence while preserving curated/cutoff fixtures. |
| Finish | Rollback, no persisted fixtures; counts/status only in output. |

This covers the predicate and a synthetic recovery procedure. It does **not** prove API auth/rate limiting, production schema/migration, real Neon restore history, backup/branch/export expiry, physical deletion, a successful scheduled production job or operator absence handling. Existing mocked/auth/built-API tests and those operational gates remain separate.

Scoped review identified the missing pre-restore erasure and IPv6 driver mismatch; both were corrected. Real database negative controls for wrong server identity, nonempty database preservation and an escaping post-BEGIN failure/clean rerun have now run as recorded below. Context/workflow unit tests alone do not establish those assertions.

## Actual Local Acceptance

2026-10-09: Docker engine 29.8.0, immutable image digest below, actual server PostgreSQL **16.15** (Debian 16.15-1.pgdg12+2), x86_64. New owned disposable container `sigil-p00-retention-20261009`, ID `09ea09e97216c58079b0e17b7fcb7121e358fd40112f9e518fa56121c93bcce5`; only host binding 127.0.0.1:55432, no bind mounts or preexisting volumes. The image created its own anonymous data volume; `--rm` removal was verified after stopping this exact container, without volume pruning or changing any other container.

| Real control | Observed result |
| --- | --- |
| Positive predicate/synthetic restore | Helper JSON reports cutoff pass, curated preserved, second deletion zero, savepoint DB failure recovered, erase/restore/re-erasure pass, rollback; exit 0. |
| Nonempty database | Own public sentinel row caused preflight `empty_database` / ERR_ASSERTION, exit 1; sentinel ID/count remained unchanged; only own sentinel table dropped afterward. |
| Wrong current_user | Own synthetic role/login-default fixture caused preflight `empty_database` / ERR_ASSERTION, exit 1. Initial RESET ROLE cleanup returned to the configured wrong role and failed permission checks; explicit SET ROLE sigil_p00 restored authority, then the own role/default were removed. Final current_user is sigil_p00 and wrong-role count is zero. |
| Escaping failure | `--force-database-failure` executes a missing temporary relation query after BEGIN/fixture setup; bounded `forced_database_failure` / 42P01, exit 1. Outer finally rollback/connection close followed by full ordinary rerun, exit 0. First red run before flag implementation incorrectly succeeded, exposing the absent control. |
| Final state | Fresh session reports zero user tables/views and zero synthetic wrong roles; final full helper pass. Owned container and newly created anonymous volume absent after cleanup. |

Actual outputs: ignored `tmp/p00/retention-real-positive.log`, `retention-nonempty.log`, `retention-wrong-identity.log`, `retention-escaping-red.log`, `retention-escaping-green.log`, `retention-after-escaping.log`, `retention-final-real.log`. Experimental Node TS stripping warnings are separate from bounded helper JSON. Full baseline after control/CI changes: 350 Node tests plus four TS scripts, exit 0, no skips. This does not establish full schema migration, database least privilege or HTTP auth/rate limiting against the real database; production cron and real provider restore remain separate acceptance.

Before Docker became available, a portable EDB PostgreSQL 17.11-3 archive was fetched from its [official download origin](https://www.postgresql.org/download/windows/) and matched the [published repository checksum](https://github.com/EnterpriseDB/edb-installers/issues/682), 4b8db0930c38f6ef845db919551dedda3b6b845aeb0927b3d79a6e8e9e4537cf. Checksum comment has CONTRIBUTOR association, not a Sigil signed build. It was never unpacked/executed/installed; real acceptance used the Docker PostgreSQL 16 image instead.

## Real Built HTTP Acceptance

2026-10-09: `scripts/verify-retention-http.mjs` passed against a separate fresh PostgreSQL 16.15 container, `sigil-p00-http-retention-20261009` (ID 155d529a3bd33320d905b62c4a374c9f6f2a07e851d7214ec6c277a9b5f0d0bb), with the same pinned image and only 127.0.0.1:55432 binding. No existing volume or bind mount was used. The new anonymous volume bc74cb12c89f67cf0dbaa032f3618e47e14069282558a4c8cdc753f55f4a20ff and exact container were removed and absence verified after completion.

The harness validates the explicit loopback URL, server identity and empty database before importing the actual built Express application. It stages the bundle under new owned dotenv lookup directories, avoiding workspace `.env` files, overrides database/AI/cron contexts with synthetic values and rejects nonlocal fetches. This integration intentionally initializes the actual public schema only in its disposable database.

Observed controls: missing configured cron secret, absent authorization and wrong authorization return 401 before any user relation exists; authorized request creates the actual schema. Four synthetic rows prove old ordinary deletion (count 1), recent/curated/near-cutoff preservation and repeat count 0; unauthorized requests preserve all four. Temporarily renaming the owned table causes an actual DB failure with exactly `{error:"retention_cleanup_failed"}` / HTTP 500; unauthorized access still returns 401, and restoring the table gives HTTP 200 with unchanged survivors. Sixty requests in a controlled 15-second window succeed, request 61 returns 429 with Retry-After, and a request after expiry succeeds. This is configured local middleware, not deployed proxy/IP acceptance.

The HTTP cutoff fixture is 29 days 23 hours old, not an exact boundary across sessions. Exact 30-day cutoff proof remains the frozen-transaction helper drill above. Final survivors: curated, near_cutoff, recent. Output is in ignored `tmp/p00/retention-http-real.log`; checks found no synthetic credential, connection URL or raw SQL error. CI now builds the API and runs this integration after helper drills; remote CI has not run. Three unsafe-context CLI regressions and CI enforcement pass; full baseline is 353 Node tests plus four TS scripts, exit 0, no skips. Production cron, production migration/least privilege, actual Neon backup/restore and operational approval remain OPEN.

Reproduce using the dedicated fresh container and explicit synthetic URL below. Run the helper first (it rolls back), followed by:

```powershell
pnpm --filter @workspace/api-server run build
node scripts/verify-retention-http.mjs
```

Expected final report: `status=pass`, `scope=isolated_built_http_real_postgres`. A repeat against the same initialized database must reject at `empty_database`; use a new owned disposable container rather than deleting existing data to rerun.

## Local Example

Use a dedicated empty disposable container with no mounted volume. Start Docker Desktop separately first. The image is the verified public `library/postgres` 16-bookworm digest acquired on 2026-10-09; do not silently replace it with a floating tag. Credentials below are synthetic local fixture values, not production secrets.

```powershell
docker run --rm -d --name sigil-p00-retention `
  -p 127.0.0.1:55432:5432 `
  -e POSTGRES_DB=sigil_p00_retention -e POSTGRES_USER=sigil_p00 `
  -e POSTGRES_PASSWORD=synthetic-ci-only `
  postgres@sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4

docker exec sigil-p00-retention pg_isready -U sigil_p00 -d sigil_p00_retention
$env:SIGIL_P00_DATABASE_URL='postgresql://sigil_p00:synthetic-ci-only@127.0.0.1:55432/sigil_p00_retention'
node scripts/verify-retention-postgres.mjs
```

Wait for pg_isready success before invoking the drill. Missing URL, unreachable DB or assertion failure must exit 1; never treat it as a skip/pass. Expected actual success is JSON `check=p00-real-postgres-retention` with pass/preserved/zero/rolled-back controls. Record stdout/status, image digest and execution time, not connection credentials or fixture contents. Only stop `sigil-p00-retention` when it is the disposable container you created; never stop/delete other containers or production volumes.

## CI Preparation

Engineering-baseline `retention` job has the same digest-pinned PostgreSQL service, synthetic named database/role, loopback port, readiness health check, pinned checkout/Node actions and frozen workspace installation. It runs the positive helper, requires the explicit escaping failure with exact bounded stage/42P01 assertions, then reruns the positive helper. It is required/unconditional without production secrets or failure masking. Node context guard/CLI-redaction and structured workflow tests pass; the service job has **not** run on GitHub. Local actual SQL acceptance does not substitute for remote CI or full operational G06 closure.
