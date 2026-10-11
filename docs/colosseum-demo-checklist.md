# Colosseum Demo: Live-Test List

Updated 2026-10-11. This is demo QA, not signing clearance or full audit acceptance.

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
