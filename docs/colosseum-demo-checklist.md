# Colosseum Demo: Live-Test List

Updated 2026-10-11. This is demo QA, not signing clearance or full audit acceptance.

## Published Candidate

### Passing Live Preview

Application commit `0abfd989a1bc7586893f6dae6bd647caecf2737d`: [immutable preview](https://sigil-jxgtsntc0-s3ntrylabs.vercel.app/solana), accessed for testing through Kevin's authorized branch share link. All five [CI jobs](https://github.com/EragothCrypto/Sigil/actions/runs/38131583171) passed. Later documentation-only commits leave the tested application source unchanged.

Actual deployed tests on 2026-10-11 at 12:22 Berlin passed at1440x1000 and390x844: live finalized Devnet read, invalid-input400, no automatic scan, labeled synthetic Review/Unavailable examples, malformed successful-response rejection, no horizontal overflow and no page errors. Both live reads observed35legacy accounts and14unsupportedToken2022 accounts, correctlypartial. Slots509870513desktop and509870527mobile; these are historical observations, not stable future counts. Screenshots were inspected.

Evidence: `tmp/colosseum/preview/browser-report.json` and corresponding PNGs. Remote HTML SHA256 `e28006f69dc22bcb13af3fe96fd0dbe6fe2a81b1ae1ef1440fab91ed4c6de8a9`. Share parameter is intentionally omitted. Production remains unchanged. This acceptance is scoped to Solana and the listed controls, not fresh deployed EVM acceptance or full release clearance.

Routing retest on 9f3068e established real API dispatch but exposed restricted-CORS HTTP500 for the branch origin (same invalid request without Origin400). Preview allowlist now derives only exact trusted Vercel deployment/branch hostnames in the preview environment; foreign Vercel origins remain denied. Fresh local baseline468 and four TS scripts/typecheck/API build/actual built dispatch pass. Final preview live read remains a separate gate until its actual successful retest.

2026-10-11 follow-up: Kevin supplied a branch shareable link (access parameter intentionally omitted from this repository). Authenticated desktop access to `/solana` succeeded, but its API POST returned HTTP405/static response on f7f0e6f. Added an explicit rewrite through the existing API entrypoint in both Vercel layouts, with red/green routing tests and actual built dispatch smoke. Final remote retest is required after the follow-up push. `SIGIL_PREVIEW_URL` lets `scripts/verify-solana-demo.mjs --live` reuse authorized preview access; reports omit the share parameter.

EVM deployed live scans are currently not executed by the agent: existing `ensureAnalysesSchema` runs CREATE/ALTER/INDEX statements before analysis, and Kevin excluded database migrations. Use prior recorded Aave/Euler controls until a no-DDL runtime path or explicit isolated-database authorization is established. Do not infer that a preview has an isolated database.

Application candidate `bd3dbdadc25ab7c30b5e56589b5dff2a12084d11` was committed/pushed on `codex/vnext-p00-baseline`. Initial [Vercel preview](https://sigil-68fs50830-s3ntrylabs.vercel.app/solana) built successfully. It redirects unauthenticated requests to Vercel SSO: jury access and deployed live checks require Kevin's shareable preview link. Production was not changed. A follow-up test-portability/documentation commit does not alter this application build.

Local baseline after the Linux CI package-map fix passes 464 Node tests plus four TS scripts. Initial remote advisory, extension-package, private-history and isolated retention jobs passed; verify is being rerun after the portability fix. Do not equate local results with deployed acceptance.

## Solana: New Manual Check

Route `/solana`. Select Devnet, click Load Devnet address, then Check wallet. No signing/wallet connection needed.

Copyable public input from [official Solana RPC documentation](https://solana.com/docs/rpc/http/gettokenaccountsbyowner):

```text
A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd
```

Live reads on 2026-10-11 09:26 UTC: 35 legacy accounts checked, 14 Token-2022 accounts unsupported, zero ordinary legacy delegate observations; correct overall state is partial, not safe. Desktop finalized slot509856586; mobile509856591. Public RPC/account state may change or rate-limit; counts are observations, not hard-coded future expectations.

Program identities (query/decode scope, not wallets to paste):

```text
Legacy SPL: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Token-2022: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
```

Additional tests:

- `not-a-solana-address`: inline invalid-input error, no RPC request.
- Review example: synthetic delegate250raw / balance500raw, review only, conspicuous Example data label. Not a real wallet/mint relationship or malicious delegate.
- Unavailable example: no counts established, no successful-negative claim, no outbound request.
- Load Devnet address alone: changes input; does not scan automatically.
- Mainnet toggle: separate cluster context, never reuse a Devnet result as Mainnet evidence. Exact successful mainnet fixture not recorded yet.

## EVM: Existing Controls

Network Ethereum Mainnet; scanner input is a complete transaction hash, not a contract address.

### Aave Supply-With-Permit

```text
Transaction: 0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac
Destination: 0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2
USDC: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
aUSDC: 0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c
```

Expected: qualified decoded supplyWithPermit intent, recorded token/interface evidence and two transfer-shaped events, with current-only ABI and execution-effect limitations. No guarantee of safety. Previous live evidence exists; retest the actual submitted deployment/candidate before video recording.

### Euler Historical Exploit

```text
Transaction: 0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d
Destination: 0xebc29199c817dc47ba12e3f86102564d640cbf99
```

Expected: exact source-backed historical Euler V1 exploit attribution preserved, not a general live-compromise assertion. Do not remove evidence limitations to improve the demo. Previous live evidence exists; current deployment retest still open.

WETH contract metadata example (not a transaction):

```text
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

## Reproduce Local Verification

```powershell
pnpm run test:baseline
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/sigil run build
node scripts/check-codegen.mjs
node scripts/verify-solana-api.mjs
```

Loopback-only Solana preview, no database/AI/dotenv loaded:

```powershell
pnpm --filter @workspace/api-server exec esbuild ./src/routes/sigil/solana-monitor.ts --bundle --platform=node --format=cjs --outfile=../../tmp/colosseum/solana-monitor.cjs
$env:NODE_OPTIONS='--use-system-ca'
node scripts/solana-demo-preview.mjs 5175
```

Open `http://127.0.0.1:5175/solana`. This preview serves the new Solana API only; EVM requires the existing full backend/deployment. TLS validation stays enabled; system CA option is needed on the current Windows setup.

Actual browser evidence: `tmp/colosseum/browser-report.json`, desktop/mobile review/live PNGs, index SHA2560e3657bac9793c2b26b104a354782e4636e8efc3e8db712381fcfede73d305ac. These are local candidate results, not Vercel deployment acceptance. Full release audit remains open.
