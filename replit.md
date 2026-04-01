# Workspace

## Overview

**Sigil — The Trust Layer of Web3**
"Paste any transaction. Understand what you're signing."

A Web3 security analysis tool that translates raw Ethereum transactions and contract addresses into plain English with AI-powered risk scoring. Includes a browser extension that intercepts MetaMask/Rabby transactions in real-time. Features: pattern detection engine, contract reputation scoring, approval inspector, "Should I Sign This?" AI verdicts, viral share-to-X feature, and "What Changed?" upgrade diff view for proxy contracts.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/sigil) — dark cybersecurity UI
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (no user API key needed)
- **Blockchain data**: Etherscan API (public endpoints, optional key via ETHERSCAN_API_KEY env var)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── sigil/              # React + Vite frontend (Sigil app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI integration helpers
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Sigil Features

- **Transaction Analysis**: Paste any Ethereum tx hash → plain English explanation
- **Contract Analysis**: Paste any contract address → full audit
- **Risk Scoring**: 0-100 score with low/medium/high/critical levels
- **Should I Sign This?**: Clear safe/caution/dangerous verdict with reason
- **Pattern Detection**: Two-layer engine (static heuristics + AI) detecting drainers, honeypots, fake approvals, rug pulls, phishing permit attacks — with confidence ratings, matched indicators, and historical context citing real incidents
- **Contract Reputation**: Trust score (0-100) with tier badge, age/verification/activity/exploit factors, SVG arc gauge
- **Approval Inspector**: Decodes token approval transactions, shows spender identity, prior approval history, risk level
- **Transaction Breakdown**: Visual asset-in/out layout with permissions and risk factors
- **Known Protocol Recognition**: Identifies 30+ major protocols (Uniswap, Aave, Compound, etc.)
- **Multi-network**: Ethereum, Polygon, Arbitrum, Optimism, Base (Etherscan V2 API with chainId)
- **History Feed**: All past analyses stored in PostgreSQL, browsable as a real-time intel feed
- **Browser Extension**: ZIP downloadable, intercepts MetaMask/Rabby transactions
- **Transaction Simulator**: Paste raw calldata or JSON tx object to simulate before signing

## API Routes

- `POST /api/sigil/analyze` — Main analysis endpoint (tx hash or contract address)
- `GET /api/sigil/history` — Recent analyses
- `GET /api/sigil/history/:id` — Single analysis by ID
- `GET /api/healthz` — Health check

## Database

### Tables
- `analyses` — stores every analysis result with risk data, warnings, positives

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI proxy URL (auto-provisioned)
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI proxy key (auto-provisioned)
- `ETHERSCAN_API_KEY` — Optional: Etherscan API key for higher rate limits

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/sigil` (`@workspace/sigil`)

React + Vite frontend. Dark cyberpunk security UI with animated scan effects, risk rings, and full analysis display.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/sigil/` handle blockchain data fetching (Etherscan) and AI analysis (OpenAI).

### `lib/db` (`@workspace/db`)

Database layer. Schema: `analyses` table for storing all analysis results.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

OpenAI client wrapper. Uses Replit AI Integrations proxy — no user API key required.
