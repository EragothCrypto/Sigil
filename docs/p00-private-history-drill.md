# P00 Private History Drill

2026-10-09, local candidate on `codex/vnext-p00-baseline`; not deployed acceptance or G02 closure.

## Scope

`scripts/verify-retention-http.mjs --privacy` reuses the retention harness's explicit named loopback database, exact server identity, empty-database preflight and staged built API. Workspace dotenv lookup is avoided. Fetch is restricted to the ephemeral local HTTP server; no analysis POST, AI, blockchain provider or wallet call occurs.

The privacy mode creates two synthetic legacy rows in a table without `public_id`. The actual GET endpoint performs the existing schema migration. Legacy rows retain null UUIDs and their contents. A third synthetic row receives a fixed UUID directly through fixture SQL; this does not prove random UUID generation on analysis save.

## Observed Acceptance

Actual PostgreSQL 16.15 and built Express application: 25 HTTP requests, exit 0 and `scope=isolated_built_http_real_postgres_privacy`.

- Public history returns exactly `[]`, before and after adding the opaque-link fixture.
- Ordinary legacy and new private numeric IDs return the exact bounded 404 response.
- Zero, negative, fractional, overflowing, unknown UUID and SQL-shaped IDs return 404 through both path and query forms.
- The exact opaque UUID returns the intended synthetic row through both forms; output retains the UUID rather than a numeric ID.
- Curated numeric access succeeds; Hall lists only the curated fixture.
- The actual partial unique UUID index exists; duplicate UUID insertion fails with PostgreSQL 23505.
- All three synthetic rows remain. Repeating the drill rejects at `empty_database`; direct SQL confirms unchanged fixture contents.

Nine CLI guard tests cover missing/remote/wrong-role contexts in both modes and unknown, value-bearing boolean or positional arguments. Full baseline: 372 Node tests plus four TS scripts, exit 0, no skips. API build passes.

Scoped independent review found no actionable issue in the new branch/argument guards and reran nine guard tests; it did not independently repeat real SQL or review the existing shared isolation harness. Privacy-route database-error injection remains untested. The unchanged default retention mode was rerun on a second fresh container: all existing authorization/schema/deletion/error/recovery/rate-limit assertions pass, exit 0. That container `6c670b499663d26fcf590edb80f873a0ab71f755fb1180b32650c33a42601fcc` and its new anonymous volume `e74c841b015d136079387abf1c603147b175b04b4d35455bc889840c6fda4516` were removed with absence verified.

Disposable container `sigil-p00-privacy-http-20261009`, ID `bae8831e3e74f6a1a30ae596402855694b63a7c99889f586487aa324afed7489`, used only numeric loopback port 55432 with no bind mount or existing volume. Its new anonymous volume `1f579cb39a4bdd3e64968e880803cd212ec59ec8b0cc4b0aca83875d2d1da4e5` and container were removed; absence verified.

## Repeatable Example

Use the fresh disposable-container recipe and synthetic URL in [the retention drill](p00-retention-postgres-drill.md). Wait for readiness. Build must finish before running:

```powershell
pnpm --filter @workspace/api-server run build
node scripts/verify-retention-http.mjs --privacy
```

Do not run privacy and retention HTTP modes against the same initialized database. Each requires a new empty owned disposable database; never clear existing data to satisfy the guard.

Within this synthetic drill, `/api/sigil/history/1` must return 404; `/api/sigil/history/2` must return the curated fixture; `/api/sigil/history/12345678-1234-4234-8234-123456789abc` must return the opaque fixture. These IDs are not seeded into the ordinary dev preview or production.

## Remaining Gates

Opaque links provide bearer access, not account or wallet authentication. This does not test ownership, UUID generation on save, production migration, deployed SHA, provider backup, least-privilege DDL or remote CI. Production checks require separate operational approval and synthetic deployed evidence; G02 and P00 remain OPEN/NO_GO.

## CI Follow-Through

2026-10-09: the workflow now includes an unconditional `privacy` job on its own Ubuntu runner and its own fresh digest-pinned PostgreSQL service, rather than reusing the retention job's initialized database. Synthetic role/database/password and numeric loopback binding match the strict drill guard. Pinned checkout/setup-node, fixed package manager, frozen installation and API build precede the exact `node scripts/verify-retention-http.mjs --privacy` command. No production secret, table reset, cleanup deletion or failure masking is added.

A new policy regression first failed because the privacy job was absent; it now checks isolation/service configuration, readiness, command order, explicit synthetic URL and no deletion/reset/retention helper in that job. Existing global tests still require immutable actions, read-only permissions, nonpersistent checkout credentials and no skipped/failure-masked jobs. Seven CI tests plus nine CLI guards pass; complete baseline379 Node tests plus four TS scripts passes with no skips. Diff check passes.

This prepares workflow execution only. No push, GitHub run or repository branch-protection/ruleset update was performed. Workflow presence is not remote success or enforcement by required merge statuses. Prior actual local SQL/HTTP evidence remains the integration checkpoint above; production migration and G02/P00 release gates remain open.

Scoped independent review found that privacy install/build prerequisites could acquire a skipped condition without failing the original policy test (the global command check matched another job). Corrected explicit no-if/no-continue checks for install, build and HTTP integration. Two in-memory mutations of the actual test module separately set privacy install/build if=false; both child processes fail with the exact prerequisite assertion. The workflow file is not edited by these negative controls. Final seven CI plus nine guard tests and full379 Node/four TS baseline pass. Reviewer did not perform remote execution.
