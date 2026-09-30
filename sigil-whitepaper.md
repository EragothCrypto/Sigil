# Sigil — The Trust Layer of Web3
## Technical Whitepaper · v1.0 · April 2026

Current-claims update: September 30, 2026. The Chrome Web Store has a historical published build. Advisory-only extension version 1.0.3 is implemented locally, pending release, and not yet published; production and installed-build manual QA remain pending. Historical roadmap completion does not establish deployment or verification of this update.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem: Trust is Broken in Web3](#2-the-problem-trust-is-broken-in-web3)
3. [The Solution: Sigil's On-Chain Risk Engine](#3-the-solution-sigils-on-chain-risk-engine)
4. [How It Works — End to End](#4-how-it-works--end-to-end)
5. [Feature Reference](#5-feature-reference)
6. [Technical Architecture](#6-technical-architecture)
7. [The Two-Step AI Pipeline](#7-the-two-step-ai-pipeline)
8. [Risk Scoring & Pattern Detection](#8-risk-scoring--pattern-detection)
9. [OFAC Sanctions & Threat Intelligence](#9-ofac-sanctions--threat-intelligence)
10. [Contract Reputation System](#10-contract-reputation-system)
11. [Multi-Chain Support](#11-multi-chain-support)
12. [Data Sources & Infrastructure](#12-data-sources--infrastructure)
13. [Privacy & Caching](#13-privacy--caching)
14. [Use Cases](#14-use-cases)
15. [Why Sigil?](#15-why-sigil)
16. [Hall of Shame — Learning from History](#16-hall-of-shame--learning-from-history)
17. [Roadmap](#17-roadmap)
18. [Appendix: Risk Scoring Factors](#appendix-risk-scoring-factors)

---

## 1. Executive Summary

Sigil is a multi-chain Web3 security platform that translates on-chain transactions and smart contracts into advisory security verdicts. Its core positioning is: **Understand wallet and transaction risk before you sign.** Manual pre-sign review supports that goal; automatic extension observations do not guarantee an analysis before a wallet prompt or confirmation.

Wallet requests can expose users to permissions and asset movements that are difficult to interpret. Sigil combines deterministic static analysis, AI explanations, sanctions signals, and contract reputation into an advisory "Trust Layer" alongside the user's wallet, not an authorization gate for on-chain actions.

**Core capabilities at a glance:**

| Capability | Detail |
|---|---|
| Supported chains | 10 EVM-compatible networks |
| Risk signals per scan | 50+ |
| AI model | GPT-5.2 (two-step chain-of-thought) |
| Response time | Variable; no guaranteed latency or pre-confirmation delivery |
| Sanctions database | OFAC + Lazarus Group wallets |
| Streaming | Real-time SSE token streaming |
| Contract analysis | Source code, ABI, bytecode, upgrade diff |

---

## 2. The Problem: Trust is Broken in Web3

### 2.1 The Scale of On-Chain Theft

Web3 remains the most hostile financial environment in the world for retail users. According to on-chain data:

- **Over $10 billion** in user funds lost to exploits, phishing, and malicious contracts since 2020
- The **Bybit hack (2025)** alone drained $1.5 billion in a single transaction
- **Ronin Bridge** lost $625 million to a multi-signature compromise
- **Euler Finance** was exploited for $197 million via a flash loan attack
- Rug pulls and honeypots cost users hundreds of millions annually

### 2.2 Why Users Cannot Protect Themselves

The core problem is legibility. When a user is asked to sign a transaction, they see:

```
0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff
ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
```

This is an ERC-20 `approve()` call granting an unlimited token allowance to a DEX aggregator — or to a wallet drainer. Without decoding it, the difference is invisible.

Existing tools fail users in predictable ways:

- **Block explorers** (Etherscan, etc.) show raw data without interpretation
- **Wallet warnings** are generic and do not decode calldata
- **Audit reports** are written for engineers, not users, and are often paywalled
- **Community alerts** are reactive — they appear after funds are lost

### 2.3 The Gap Sigil Fills

Sigil supports before-you-sign review with plain-English risk analysis. Its extension observes compatible wallet requests on a best-effort basis; analysis may finish after the wallet prompt or confirmation. Post-transaction analysis and approval reviews also support ongoing wallet-risk awareness.

---

## 3. The Solution: Sigil's On-Chain Risk Engine

Sigil processes any transaction hash or smart contract address through a multi-stage analysis pipeline and returns:

1. A **risk score** from 0 (safe) to 100 (dangerous)
2. A **plain-English verdict** summarising what the contract or transaction does
3. **Specific risk warnings** tagged by category (Honeypot, Drainer, OFAC, Rug Pull, Phishing)
4. **Decoded calldata** — what the transaction actually calls and what it moves
5. **Asset breakdown** — which tokens or NFTs are involved and their USD value
6. **Pattern matches** — specific bytecode-level red flags with severity ratings
7. **Score factors** — a transparent explanation of how the risk score was calculated
8. **Contract reputation** — a 0–100 "credit score" based on age, activity, and known exploit history

Streaming analysis is delivered to the browser via Server-Sent Events as results become available. Provider, network, and processing conditions affect timing; no first-token or completion latency is guaranteed.

---

## 4. How It Works — End to End

```
User Input (tx hash or contract address)
         │
         ▼
  ┌─────────────────┐
  │  Input Resolver │  Detects: tx hash vs. contract address
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │              Data Fetcher                   │
  │  - Raw tx from RPC (eth_getTransaction)     │
  │  - Contract source + ABI (Etherscan V2)     │
  │  - Token metadata & USD price (CoinGecko)   │
  │  - Etherscan verified status                │
  └────────┬────────────────────────────────────┘
           │
           ▼
  ┌───────────────────────────────────────────────────┐
  │   Parallel Analysis (runs simultaneously)         │
  │                                                   │
  │  ┌─────────────────┐  ┌────────────────────────┐  │
  │  │ Pattern Detector│  │  OFAC / Entity Check   │  │
  │  │ (50+ heuristics)│  │  (sanctions + Lazarus) │  │
  │  └────────┬────────┘  └──────────┬─────────────┘  │
  │           │                      │                 │
  │  ┌────────▼──────────────────────▼─────────────┐  │
  │  │         Score Factor Calculator             │  │
  │  │  (deterministic, explainable scoring)       │  │
  │  └─────────────────────────────────────────────┘  │
  └───────────────────────────────────────────────────┘
           │
           ▼
  ┌──────────────────────────────────────┐
  │   Two-Step AI Pipeline (GPT-5.2)    │
  │                                      │
  │  Step 1: Evidence Enumeration        │
  │  Step 2: Verdict + Risk Score        │
  │                                      │
  │  Override: OFAC → forced DANGEROUS   │
  └────────────────────┬─────────────────┘
                       │
                       ▼
  ┌──────────────────────────────────────┐
  │   Response Streamed via SSE          │
  │   → step → metadata → tokens → done  │
  └──────────────────────────────────────┘
                       │
                       ▼
  ┌──────────────────────────────────────┐
  │   Response Cache (30-min TTL)        │
  │   Key: network:address_or_hash       │
  └──────────────────────────────────────┘
```

---

## 5. Feature Reference

### 5.1 Streaming AI Analysis

Sigil streams its analysis in real time using **Server-Sent Events (SSE)**. The client receives a sequence of events:

1. `step` — announces which analysis phase is active ("Gathering evidence…")
2. `metadata` — sends structured data (risk score, patterns, factors) as JSON
3. `token` — streams individual prose tokens from the AI summary
4. `done` — signals analysis is complete

This design progressively reveals available analysis without waiting for the entire response. It does not guarantee when a verdict appears or that it precedes wallet confirmation.

### 5.2 Two-Step Chain-of-Thought AI

Rather than asking a single prompt for both analysis and verdict, Sigil splits the task:

- **Step 1 (Evidence):** The model is instructed to enumerate every concrete signal it observes — suspicious function selectors, missing ownership renouncements, flash loan potential, admin key risks. No verdict yet.
- **Step 2 (Verdict):** Using Step 1's evidence as grounded context, the model derives the final structured JSON verdict.

This approach dramatically reduces hallucinations because the model is forced to reason from evidence, not pattern-match on surface features of the address.

### 5.3 Risk Score (0–100)

Every analysis produces a 0–100 risk score. The score is a composite of:

- AI-derived assessment (weighted majority)
- Deterministic score factor additions/subtractions
- OFAC override (floor of 90 if sanctioned)

Score bands:

| Range | Label | Colour |
|---|---|---|
| 0–30 | Low Risk | Green |
| 31–59 | Medium Risk | Amber |
| 60–79 | High Risk | Orange |
| 80–100 | Critical / Dangerous | Red |

### 5.4 Pattern Detection Engine

Runs in parallel with the AI, scanning for 50+ specific bytecode and ABI-level patterns:

**Wallet Drainer Patterns**
- `sweepToken` selector detected
- `setApprovalForAll` granting to unknown spender
- Unlimited approval signature (`0xffffffffffffffff...`)

**Honeypot Patterns**
- Hidden `isBlacklisted` mapping
- `setMaxTxAmount` with admin-only setter
- Unverified source code with transfer restrictions

**Rug Pull Patterns**
- Unrestricted `mint()` function
- `selfdestruct` present in ABI
- Owner-controlled liquidity removal

**Phishing Patterns**
- Contract name contains "Airdrop", "Reward", "Claim"
- Proxy with uninitialized implementation slot
- Social engineering function names

Each pattern match is returned with a severity (`low`, `medium`, `high`, `critical`) and a human-readable description.

### 5.5 Approval Inspector

For any `approve()` or `setApprovalForAll()` transaction, Sigil decodes:

- The spender address (with known-entity label if recognised)
- The token and USD value of the approved amount
- Whether the approval is unlimited (`uint256.max`)
- Historical approvals from the same wallet stored in the database

Unlimited approvals to unverified contracts are flagged as **Critical**.

### 5.6 Contract Reputation System

Every contract address receives a **Reputation Score** (0–100) computed from:

- **Age bonus:** Contracts older than 1 year earn up to +25 points ("battle-tested")
- **Age penalty:** Contracts deployed < 7 days ago lose up to −30 points
- **Activity bonus:** High transaction count signals genuine usage
- **Exploit registry:** A hardcoded registry of known attacker and victim addresses (Euler Finance, Ronin Bridge, Poly Network, Wormhole, Bybit) applies a hard penalty

This score is displayed alongside the AI verdict as a secondary trust signal.

### 5.7 OFAC Sanctions Detection

Sigil maintains a real-time checked list of:

- All **OFAC-designated** Tornado Cash pool and router addresses
- **Lazarus Group** (DPRK state-sponsored) wallet addresses
- Additional known mixer and privacy protocol addresses

If any input address matches the sanctions list, Sigil **overrides** the AI verdict to `DANGEROUS` and sets a risk score ≥ 90, regardless of any other signals. A sanctions warning banner is displayed prominently.

### 5.8 Contract Diff (Upgrade Inspector)

For upgradeable smart contracts using the EIP-1967 proxy standard, Sigil can compare two implementation versions:

1. Reads the `implementation` storage slot of the proxy
2. Fetches the ABI of both the old and new implementation
3. Computes the function-level diff (added, removed, modified selectors)
4. Sends the diff to GPT-4.1-mini for a security-impact summary

This allows governance participants and DeFi users to understand what changed in a protocol upgrade before voting or interacting.

### 5.9 Transaction Simulation

A dedicated simulation endpoint powered by **GPT-5.2** predicts the outcome of any transaction before it is signed. Accepts:

- A raw transaction hash (replays the calldata)
- A JSON transaction object (`to`, `data`, `value`, `from`)
- A plain-English wallet prompt ("approve 1000 USDC to Uniswap")

Returns a predicted state change: tokens transferred, approvals granted, ETH moved, and any risk flags raised.

### 5.10 Curated Public Intel Feed

The current local history UI shows curated public Hall-of-Shame cases only, supplied by `/api/sigil/hall-of-shame`. `/api/sigil/history` returns an empty list without a result identifier, not a cross-user feed of submitted analyses. Non-curated saved analyses are accessible through private, unguessable UUID links, subject to configured retention. These bearer links are not account-authenticated: anyone possessing a link can access its result, so users should share deliberately. Production deployment and migration verification remain pending. Public case entries show:

- Input identifier (truncated address/hash)
- Network analysed
- Final risk verdict and score
- Timestamp
- Any Hall of Shame or OFAC flags

### 5.11 Hall of Shame

A curated, pre-seeded database of the most significant on-chain exploits in history, used as an educational and demonstration tool:

| Incident | Amount Lost | Year |
|---|---|---|
| Bybit Exchange Hack | $1.5B | 2025 |
| Ronin Bridge | $625M | 2022 |
| Poly Network | $611M | 2021 |
| FTX Collapse | $600M | 2022 |
| Binance Bridge | $570M | 2022 |
| Wormhole Bridge | $325M | 2022 |
| Euler Finance | $197M | 2023 |
| Beanstalk Farms | $182M | 2022 |

Each entry is annotated with the attack vector (private key compromise, flash loan, governance attack, etc.) and a danger verdict badge.

### 5.12 Jargon Tooltips

Technical terms (ERC-20, OFAC, flash loan, proxy, permit, setApprovalForAll) in any analysis output are automatically wrapped in tooltip components that provide plain-English definitions on hover. Non-technical users can understand every part of their verdict without leaving the page.

### 5.13 Share Button

Saved non-curated analyses use private UUID result links rather than enumerable numeric IDs. Anyone given the link can access the retained result. Deliberate sharing does not add an analysis to the curated public history; retention expiry can make a result unavailable.

### 5.14 Browser Extension

A lightweight vanilla JavaScript browser extension uses best-effort hooks for compatible EIP-1193 wallet requests. The following describes the locally implemented, unpublished 1.0.3 update, not verified behavior of the historical Store build:

- Reviews compatible wallet requests, including transaction, raw-signature, personal-signature, and typed-data methods, through untrusted page observations.
- The original wallet provider runs independently exactly once per wrapped request, preserving its result or error without waiting for observations, Sigil UI, or network analysis.
- Performs local advisory checks and sends suitable observations to the Sigil API for deeper analysis; a page overlay may display a risk verdict.
- Has no blocking, proceed, or cancel authority. The wallet remains the only place that approves or rejects a request; dismissing an alert or trusting a site affects Sigil alerts only.
- A hostile page may suppress or forge observations. Intake limits constrain accepted data but do not authenticate wallet activity or guarantee coverage.
- Analysis may finish after the wallet prompt or confirmation. Missing warnings or a low score are not proof of safety.

---

## 6. Technical Architecture

### 6.1 Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, custom glassmorphism design system |
| Animation | Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (via Drizzle ORM) |
| AI | OpenAI GPT-5.2 (analysis), GPT-4.1-mini (diff) |
| Streaming | Server-Sent Events (SSE) |
| Monorepo | pnpm workspaces |
| Package manager | pnpm |

### 6.2 Repository Structure

```
workspace/
├── artifacts/
│   ├── sigil/                    # React frontend
│   │   └── src/
│   │       ├── pages/            # Scanner, Simulate, History, Extension, Home
│   │       ├── components/
│   │       │   ├── layout/       # Nav, Layout wrapper
│   │       │   └── sigil/        # Analysis components
│   │       └── lib/              # API client, utilities
│   ├── api-server/               # Express API
│   │   └── src/routes/sigil/
│   │       ├── ai-analyzer.ts    # Two-step AI + streaming
│   │       ├── pattern-detector.ts
│   │       ├── score-factors.ts
│   │       ├── contract-reputation.ts
│   │       ├── known-entities.ts # OFAC + Lazarus
│   │       ├── analysis-cache.ts # In-memory LRU cache
│   │       ├── contract-diff.ts  # EIP-1967 upgrade diff
│   │       └── hall-of-shame-seed.ts
│   └── sigil-pitch/              # Hackathon slide deck
└── packages/
    └── shared/                   # Shared TypeScript types
```

### 6.3 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sigil/analyze` | Standard (non-streaming) analysis |
| `POST` | `/api/sigil/analyze-stream` | SSE streaming analysis |
| `POST` | `/api/sigil/simulate` | Transaction outcome simulation |
| `POST` | `/api/sigil/contract-diff` | Proxy upgrade diff |
| `GET` | `/api/sigil/hall-of-shame` | Historical exploit entries |
| `GET` | `/api/sigil/history` | Empty list without an identifier; result lookup with `?id=` |
| `GET` | `/api/sigil/history/:id` | Private UUID result lookup; numeric IDs restricted to curated cases |

### 6.4 Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Scanner (Home) | Main analysis interface + landing page |
| `/simulate` | Simulate | Transaction simulation |
| `/history` | Feed | Curated public cases only |
| `/extension` | Extension | Browser extension documentation |

---

## 7. The Two-Step AI Pipeline

The core of Sigil's intelligence is a deliberate two-step chain-of-thought reasoning process:

### Step 1: Evidence Gathering Prompt

```
You are a Web3 security analyst. Given the following on-chain data, enumerate 
every specific technical signal you observe — both risk signals and positive 
signals. Do not draw conclusions yet. Only list evidence.

On-chain data:
- Transaction status: [success/fail]
- Calldata decoded: [function + args]
- Contract verified: [yes/no]
- Contract ABI: [...]
- Known entity: [label if recognised]
- OFAC flagged: [yes/no]
- Pattern matches: [list]
```

### Step 2: Verdict Derivation Prompt

```
You are a Web3 security analyst. Based on the following evidence gathered 
in Step 1, derive a final security verdict.

Evidence: [Step 1 output]

Return a JSON object with:
{
  "riskScore": 0-100,
  "verdict": "SAFE|LOW_RISK|MEDIUM_RISK|HIGH_RISK|DANGEROUS",
  "summary": "plain-English explanation",
  "warnings": [...],
  "breakdown": { "tokens": [...], "approvals": [...] }
}
```

### Why Two Steps?

Single-prompt analysis suffers from a well-documented problem in large language models: the model simultaneously tries to understand the data, reason about it, and format the output. Each of these tasks competes for context budget and attention.

By separating evidence gathering from verdict derivation:

- **Hallucination drops** — the verdict step only reasons from stated evidence, not from raw bytes
- **Accuracy improves** — the model cannot skip subtle signals in a compressed single pass
- **Transparency increases** — Step 1 output is inspectable, giving auditors a reasoning chain

The streaming architecture means users see the verdict summary prose tokens arriving while the JSON verdict is still being generated, producing the fastest possible subjective response time.

---

## 8. Risk Scoring & Pattern Detection

### 8.1 Score Factor System

Score factors are deterministic, rule-based adjustments applied to the base AI-derived score. Each factor has a fixed delta:

| Factor | Delta | Trigger |
|---|---|---|
| Unverified source code | +30 | No source on Etherscan |
| OFAC sanctioned | +45 | Address on OFAC list |
| Known exploit address | +40 | In exploit registry |
| Unlimited approval | +25 | `uint256.max` approval |
| Honeypot pattern detected | +35 | Hidden blacklist found |
| Rug pull pattern detected | +30 | Unrestricted mint or selfdestruct |
| Wallet drainer pattern | +40 | sweepToken or drainer selector |
| Contract age < 7 days | +20 | Brand new deployment |
| Known legitimate protocol | −25 | In whitelist (Uniswap, USDC, etc.) |
| Verified source + no warnings | −15 | Clean verified contract |
| Battle-tested (1+ year) | −10 | Age > 365 days |

Factors are displayed to the user as a transparent breakdown — each one shows its delta and its trigger condition, making the score explainable rather than opaque.

### 8.2 Pattern Detector Architecture

The pattern detector runs a parallel analysis against the raw transaction calldata and contract ABI. It uses two approaches:

1. **Method selector matching** — compares the first 4 bytes of calldata against a registry of known dangerous selectors (e.g., `0xd505accf` = `permit()`, `0xa22cb465` = `setApprovalForAll()`)
2. **ABI function name matching** — searches the verified ABI for function names that match risk patterns (`sweepToken`, `isBlacklisted`, `setMaxTxAmount`, `selfdestruct`)

Results are returned as typed `PatternMatch` objects:

```typescript
type PatternMatch = {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matched: boolean;
};
```

---

## 9. OFAC Sanctions & Threat Intelligence

### 9.1 What Is OFAC?

The Office of Foreign Assets Control (OFAC) is a U.S. Treasury department division that maintains a list of sanctioned individuals, entities, and wallet addresses. Interacting with a sanctioned address exposes users to serious legal risk in many jurisdictions.

### 9.2 Sigil's Sanctions Database

Sigil maintains an internal known-entities registry containing:

- **Tornado Cash** — all major pool addresses (0.1 ETH, 1 ETH, 10 ETH, 100 ETH pools) and the Tornado Cash router, designated by OFAC in August 2022
- **Lazarus Group** — North Korean state-sponsored hacker wallets associated with the Ronin Bridge, Harmony Horizon, and Bybit hacks
- **Mixer addresses** — additional known privacy tool addresses with exploit association

### 9.3 Override Behaviour

When any input matches the sanctions list, Sigil applies a hard override:

```
IF address ∈ OFAC_LIST OR address ∈ LAZARUS_WALLETS:
  verdict = "DANGEROUS"
  riskScore = max(riskScore, 90)
  warnings.unshift({ type: "OFAC_SANCTION", severity: "critical" })
```

This override cannot be suppressed by other signals. A clean contract that happens to be on the OFAC list will always return DANGEROUS.

---

## 10. Contract Reputation System

### 10.1 Reputation Score Calculation

```
reputationScore = baseScore + ageBonus + activityBonus - exploitPenalty

Where:
  baseScore    = 50
  ageBonus     = min(25, daysOld / 14)     # Maxes at ~1 year
  agePenalty   = daysOld < 7 ? 30 : 0      # New contract penalty
  activityBonus = log10(txCount) * 5        # Diminishing returns
  exploitPenalty = knownExploit ? 100 : 0   # Hard zero for known attackers
```

### 10.2 Exploit Registry

The following addresses receive a hard zero reputation score regardless of age or activity:

| Protocol | Type | Loss |
|---|---|---|
| Euler Finance attacker | Known exploiter | $197M |
| Ronin Bridge | Compromised bridge | $625M |
| Poly Network attacker | Known exploiter | $611M |
| Wormhole exploiter | Known exploiter | $325M |
| Bybit drainer | Known drainer | $1.5B |

---

## 11. Multi-Chain Support

Sigil uses the **Etherscan V2 unified API** (`https://api.etherscan.io/v2/api?chainid={chainId}`), which provides a single API key and consistent endpoint schema across all supported networks:

| Network | Chain ID | Explorer |
|---|---|---|
| Ethereum Mainnet | 1 | Etherscan |
| Polygon | 137 | Polygonscan |
| Arbitrum One | 42161 | Arbiscan |
| Optimism | 10 | Optimistic Etherscan |
| Base | 8453 | Basescan |
| BNB Smart Chain | 56 | BscScan |
| Avalanche C-Chain | 43114 | Snowtrace |
| Fantom | 250 | FTMScan |
| Gnosis | 100 | Gnosisscan |
| zkSync Era | 324 | zkSync Explorer |

The network selector in the UI is chain-aware: contract lookups, transaction fetching, and token metadata all route through the correct chain ID.

---

## 12. Data Sources & Infrastructure

### 12.1 Etherscan V2

Used for:
- Contract source code retrieval (`getsourcecode`)
- ABI fetching (`getabi`)
- Transaction receipt and trace data
- Token metadata (name, symbol, decimals)
- Historical transaction count for reputation scoring

### 12.2 Public EVM RPC

Used for:
- Raw transaction data (`eth_getTransactionByHash`)
- Transaction receipt (`eth_getTransactionReceipt`)
- EIP-1967 proxy implementation slot reads (`eth_getStorageAt`)

Configured per chain via environment variables with fallback to public RPC endpoints.

### 12.3 CoinGecko Free API

Used for:
- Real-time token price fetching (USD value)
- Used specifically in the Approval Inspector to show the USD value of approved token amounts

### 12.4 PostgreSQL Database

Stores:
- Saved analysis results with private UUID links for non-curated results and configured retention; not a public cross-user history
- Hall of Shame entries (pre-seeded on startup)
- Approval records for the Approval Inspector's historical view

Schema managed via **Drizzle ORM** with TypeScript type safety throughout.

---

## 13. Privacy & Caching

### 13.1 Response Cache

Sigil uses an in-memory **LRU (Least Recently Used) cache** with a 30-minute TTL. Cache key format:

```
{network_lowercase}:{address_or_hash_lowercase}
```

Benefits:
- Reuses eligible analysis results while present in the process-local cache, reducing redundant upstream calls.
- Cache hits can avoid full recomputation; there is no response-time guarantee.
- This analysis cache is distinct from token-price fetching: `token-price.ts` has no CoinGecko TTL cache or request coalescing.

### 13.2 Privacy Model

- Sigil does not require wallet connection
- No private keys or seed phrases are needed; signature request payloads may be observed or intentionally submitted for advisory analysis.
- Relevant addresses and request data may be processed by the Sigil backend and configured AI/blockchain providers, including OpenRouter, Etherscan, public EVM RPC endpoints, and CoinGecko as applicable. Wallet and transaction data may be personal data.
- Public history exposes curated cases only. Non-curated saved results use private UUID bearer links and configured retention; possession of a link permits access and does not establish user identity.
- Extension check/session history remains local by default; optional Chrome Sync covers settings and trust lists, not analysis or session history.

---

## 14. Use Cases

### 14.1 Individual DeFi Users

**Scenario:** A user receives a message on Discord: "Claim your 500 USDC airdrop here." The link leads to a contract they've never heard of.

**With Sigil:** Paste the contract address. Sigil detects: unverified source code (+30), contract age < 7 days (+20), function name contains "Claim" and "Airdrop" (phishing pattern, +35). Risk score: 87. Verdict: DANGEROUS. User does not proceed.

### 14.2 DAO Governance Participants

**Scenario:** A governance proposal on a major DeFi protocol proposes upgrading the core vault contract. Voters need to understand what changed.

**With Sigil Contract Diff:** Enter the proxy address. Sigil reads the old and new implementation slots, fetches both ABIs, and produces a plain-English diff: "Two new admin functions were added — `emergencyWithdraw` and `setFeeRecipient` — neither of which has a timelock or multisig requirement. This is a significant centralisation risk."

### 14.3 NFT Collectors

**Scenario:** An NFT marketplace asks for `setApprovalForAll` before a trade.

**With Sigil:** The Approval Inspector decodes the call, identifies the spender as a known aggregator (or an unknown address), and shows the USD value of the entire collection at stake. If the spender is unknown, the approval is flagged as High Risk.

### 14.4 Security Researchers

**Scenario:** A researcher wants to quickly triage whether a suspicious transaction from yesterday's mempool was malicious.

**With Sigil:** Paste the transaction hash for pattern detection, AI explanation, and sanctions signals. A saved result can be referenced through its private UUID link while retained; it is not added to a public cross-user feed. Completion time varies.

### 14.5 Crypto Exchanges & Custodians

**Scenario:** An exchange needs to screen incoming deposits for OFAC compliance.

**Potential integration:** The `/api/sigil/analyze` endpoint provides advisory risk signals. An exchange would need to implement its own review and deposit-handling controls; Sigil does not quarantine funds or establish legal compliance.

### 14.6 Browser Extension Users

**Scenario:** A user clicks "Connect and Approve" on a website they've never used. MetaMask pops up.

**With the pending Sigil 1.0.3 extension:** The wallet request runs independently exactly once through the wrapped provider. Best-effort observation may lead to a local or API-backed advisory warning on the page, but analysis may arrive after the wallet prompt or confirmation. The user approves or rejects only in the wallet. A hostile page can suppress or forge observations, and Sigil cannot block a request or guarantee a warning.

---

## 15. Why Sigil?

### 15.1 Compared to Existing Tools

| Feature | Sigil | Etherscan | GoPlus | Wallet Warnings |
|---|---|---|---|---|
| Plain-English verdict | Yes | No | Partial | No |
| Streaming AI analysis | Yes | No | No | No |
| OFAC sanctions check | Yes | No | Partial | No |
| Contract diff (upgrade) | Yes | No | No | No |
| Transaction simulation | Yes | No | No | No |
| Chain-of-thought reasoning | Yes | No | No | No |
| Score with explanation | Yes | No | Partial | No |
| Browser extension | Yes | No | No | Partial |
| Multi-chain (10 chains) | Yes | Partial | Yes | No |
| Curated public case feed | Yes | No | No | No |

### 15.2 Core Differentiators

**1. Explainability over black boxes**
Sigil never shows a number without explaining it. Every risk score is accompanied by a factor-by-factor breakdown, a prose summary, and specific pattern matches.

**2. Chain-of-thought over single-pass**
The two-step AI pipeline produces verifiable reasoning. Users and auditors can inspect Step 1 evidence independently from the Step 2 verdict.

**3. Real-time over polling**
SSE streaming progressively delivers available results. Caching can reduce repeat work, but network and upstream processing vary; there is no guaranteed latency or delivery before wallet confirmation.

**4. Proactive over reactive**
Before-you-sign review is Sigil's core positioning, not a promise that every feature runs before signing. The extension is advisory-only and best-effort; transaction-hash analysis, approval reviews, and monitoring also support post-event understanding and risk reduction. Only the wallet authorizes or rejects a signing request.

**5. Neutral and non-custodial**
Sigil never asks for a wallet connection, never holds funds, and never requires accounts. It is a read-only intelligence layer.

---

## 16. Hall of Shame — Learning from History

The Hall of Shame serves two purposes:

1. **Education:** It shows users the scale of real-world losses and the attack vectors used
2. **Demonstration:** Each entry is a real address that can be analysed in Sigil, showing how the engine would have flagged it

For example, the Euler Finance exploit contract, when analysed in Sigil:
- Pattern detector finds: `selfdestruct` in ABI, flash loan function signatures
- Score factors: unverified exploiter address (+40), known exploit registry match (+100 penalty)
- AI summary: "This contract executed a flash loan-based donation attack against the Euler lending protocol, draining $197M across multiple assets."

The Hall of Shame is accessible directly from the homepage CTA and from the navigation feed.

---

## 17. Roadmap

### Product North Star

Sigil should become the lightweight security layer that follows a crypto user through ordinary daily activity: browsing dApps, approving swaps, signing messages, checking token contracts, reviewing past approvals, monitoring wallet exposure, and reacting to suspicious prompts before funds are at risk.

Core positioning:

> Understand wallet and transaction risk before you sign.

Sigil should stay centered on before-you-sign safety and wallet-risk awareness. The product should not become a broad Web3 chatbot, portfolio tracker, tax tool, trading assistant, or generic crypto education app.

Sigil should become the main S3ntryLabs security product: a long-term, high-upside security SaaS for individual crypto users first, then power users, teams, wallets, and dApps once the consumer workflow proves retention.

The browser extension is the primary product surface. The web app remains the deeper analysis console, wallet-risk dashboard, history feed, and public education layer. API and SDK work should support that daily-use loop first, not turn Sigil into a heavy enterprise platform before the consumer workflow is excellent.

### Product Pillars

Use these pillars to decide whether a new feature belongs in Sigil:

| Pillar | Purpose | Included surfaces |
| --- | --- | --- |
| Scan | Inspect one risky object before action | Transaction scanner, contract risk scanner, copy/paste analyzer |
| Inspect | Explain current exposure and recent activity | Approval inspector, site reputation, dApp session summaries |
| Monitor | Watch wallet risk over time | Wallet Risk Monitor, watched addresses, alerts, hygiene score |
| Decide | Help users make a security decision | Security Decision Assistant inside transaction, approval, contract, and wallet-risk results |

Features that do not improve one of these pillars should be deferred.

### Monetization Direction

Hosting prerequisite (operator decision, 2026-09-30): Sigil currently operates as a non-profit/non-commercial offering on Vercel Hobby. Retain Hobby during this stage. Before activating or commercially promoting paid features, subscriptions, checkout or paid API access, move the production deployment to an appropriate paid Vercel plan and verify applicable processing terms and operational limits. This future upgrade does not close current privacy/DPA evidence requirements.

Sigil's commercial direction is security SaaS, not ads, portfolio tracking, trading, or broad crypto content. Premium value should come from persistent monitoring, higher limits, better prioritization, alerts, decision support, and team/API access.

The product should keep a useful free safety loop so users can trust Sigil before paying. Paid tiers should deepen the same security workflow instead of hiding basic warnings behind a paywall.

Sigil Wallet Monitor is the natural premium upgrade inside Sigil. It should not become a separate app. The Security Decision Assistant is also premium-ready, but only when grounded in Sigil analysis and constrained to security decisions.

Target pricing hypothesis:

| Tier | Price | Intended value |
| --- | ---: | --- |
| Free | EUR 0 | Limited daily scans, browser extension protection, basic risky approval scanner, basic wallet-risk checks |
| Sigil Plus | EUR 9/month | Wallet Risk Monitor, saved monitored wallet, higher scan limits, wallet hygiene score, scam exposure history, fix-first checklist, security decision assistant allowance |
| Sigil Pro | EUR 29/month | Multiple monitored wallets, advanced alerts, deeper scam exposure history, exportable reports, richer assistant usage, power-user controls |
| API | From EUR 99/month later | Stable team/dApp access to Sigil risk signals, strict rate limits, API keys, usage reporting, and integration support after consumer pull is proven |

Commercial roadmap principles:

- Free must remain good enough for basic before-you-sign protection.
- Plus should be the best personal plan for one active crypto user who wants ongoing wallet-risk awareness.
- Pro should serve power users, multisig operators, creators, small funds, and users who manage multiple wallets.
- API should wait until Sigil has proven consumer demand, stable schemas, strong rate limiting, and repeatable signal quality.
- Paid plans should emphasize prevention: risky approvals, wallet hygiene, scam exposure history, alerts, and security decisions before signing.

### Assistant Boundaries

The Web3 Decision Assistant should exist only as a security decision assistant inside Sigil. It should answer questions such as:

- "Should I sign this transaction?"
- "Is this approval risky?"
- "What does this contract do?"
- "Is this wallet exposed?"
- "What should I revoke first?"

It should not answer investment, trading, tax, token-picking, or broad Web3 research questions. Sigil can explain risk signals and recommended safety steps, but it must avoid guarantees such as "100% safe" or "certified secure."

### Phase 1 — Foundation (Delivered)
- [x] Streaming AI analysis with two-step chain-of-thought
- [x] OFAC sanctions detection with verdict override
- [x] 50+ pattern detection signals
- [x] Contract reputation system
- [x] Multi-chain support (10 EVM networks)
- [x] Response cache with 30-min TTL
- [x] Contract diff (EIP-1967 proxy upgrades)
- [x] Transaction simulation
- [x] Approval Inspector
- [x] Curated public case feed; private UUID links for non-curated saved analyses implemented locally, with production verification pending
- [x] Hall of Shame
- [x] Browser Extension scaffold
- [x] Jargon tooltips
- [x] Share button
- [x] Hackathon pitch deck

### Phase 2 — Daily Advisory Extension (Local Update; Release Pending)

Goal: support before-you-sign risk awareness through best-effort advisory observations of compatible wallet requests. Version 1.0.3 is implemented locally but not published; checked implementation items do not establish production/manual QA completion.

- [x] Replace page-decision gating with advisory observation hooks for compatible EIP-1193 providers; original wallet provider executes independently exactly once per wrapped request
- [x] Add local advisory checks before deeper API analysis, without a rendering latency guarantee
- [x] Support `eth_sendTransaction`, `eth_signTransaction`, `eth_sign`, `personal_sign`, and `eth_signTypedData_*` with method-specific explanations
- [x] Provide an advisory overlay with risk information, dismiss/trust actions, and no wallet proceed/cancel controls
- [x] Add configurable alert sensitivity: Quiet, Standard, and Strict; no effect on wallet execution
- [x] Add trusted-site and trusted-contract allowlists with clear expiry controls
- [x] Remove Sigil authorization/second-confirmation gating; wallet approval and rejection remain solely in the wallet
- [x] Bound untrusted observations with size, depth, age, rate, queue, and deduplication limits; these do not authenticate observations
- [x] Store lightweight local history in the extension so users can review recent prompts without creating an account
- [x] Add a one-click "Open full analysis" handoff from extension overlay to the web app
- [x] Historical extension packaging for Chrome Web Store review, with a documented manual install path; not proof of 1.0.3 release readiness

### Phase 3 — Lightweight Daily Workflows (Delivered)

Goal: make Sigil fit natural crypto habits instead of asking users to visit another dashboard.

- [x] Approval Health Check: show outstanding unlimited approvals and revoke recommendations
- [x] Address Watchlist: let users monitor important wallets, vaults, and multisigs without custody or wallet connection
- [x] dApp Session Summary: after a user interacts with a site, summarize approvals, signatures, and risks from that session
- [x] Site Reputation Layer: flag known phishing domains, suspicious clones, and recently created dApp frontends
- [x] Copy/Paste Analyzer: detect addresses, tx hashes, calldata, URLs, and typed data intentionally pasted by the user and offer a lightweight scan

### Release Follow-Through Before Phase 4

Goal: finish the standalone web app and Chrome extension quality pass before starting premium wallet monitoring.

- [x] Historical Chrome Store publication and listing URL documented; this does not mean 1.0.3 is published
- [ ] Package, verify, submit, and publish advisory-only 1.0.3
- [ ] Complete production smoke tests and installed-build manual wallet QA for the update, including hostile observations, outages, and delayed analysis
- [x] Notification Policy: define Critical only, Critical + high risk, and Off settings without adding new Chrome permissions
- [x] Optional Settings Sync: sync preferences across browsers while keeping sensitive analysis history local by default
- [x] Short Onboarding Flow: teach approval risk, signatures, sanctions/risk verdicts, extension usage, and wallet monitoring in under two minutes
- [x] Standalone Web App Polish Pass: tighten navigation, empty states, scan flows, and extension handoff CTAs
- [x] Production QA Matrix: document historical live checks and outstanding update/installed-build manual QA; current production verification remains pending

### Phase 4 — Premium Wallet Monitor

Goal: turn one-off scans into ongoing wallet-risk awareness without custody, seed phrases, or mandatory wallet connection.

- [x] Sigil Wallet Monitor v1: let users paste public wallet addresses, save them locally, and refresh approval exposure
- [x] Show active risky approvals, approval-derived suspicious exposure, and wallet hygiene score
- [x] Add a prioritized "fix this first" checklist for high-risk approvals, unlimited approvals, unchecked wallets, and coverage issues
- [ ] Optional wallet connection for faster public-address selection without custody or signing permissions
- [ ] Add scam interaction history and suspicious contract exposure beyond approval-health data
- [ ] Add ongoing alerts for new critical exposure, watched-wallet risk changes, and unusual approval changes
- [ ] Add Free/Plus/Pro limits without blocking basic safety checks for free users
- [ ] Package Sigil Plus around one saved Wallet Risk Monitor, higher scan limits, hygiene score, scam exposure history, and fix-first checklist
- [ ] Support multiple monitored wallets, deeper history, advanced alerts, and exportable reports for Sigil Pro users
- [ ] Add upgrade CTAs in Wallet Monitor, risky approval scanner, and hygiene-score flows without making the product feel paywalled before value is shown

### Phase 5 — Security Decision Assistant

Goal: make Sigil's AI useful at the exact moment a user needs a security decision, without becoming a generic Web3 chatbot.

- [ ] Add a scoped Security Decision Assistant to transaction, approval, contract, pasted-payload, and wallet-monitor results
- [ ] Ground assistant answers in the current Sigil analysis, risk signals, wallet exposure, and known threat context
- [ ] Add preset questions: "Should I sign?", "What does this approval allow?", "What are the red flags?", "What should I fix first?"
- [ ] Add refusal boundaries for trading, investment, tax, legal, and general Web3 questions outside Sigil's safety scope
- [ ] Add answer quality tests using known exploit, approval-drainer, phishing, safe-protocol, and ambiguous-risk scenarios
- [ ] Make premium assistant usage part of Sigil Plus and Sigil Pro after the free safety flow is polished
- [ ] Keep free assistant usage limited to a small number of context-grounded security questions so users can evaluate quality before upgrading
- [ ] Add assistant upgrade paths from transaction, contract, approval, pasted-payload, and Wallet Monitor results

### Phase 6 — Integration Surface

Goal: let wallets, dApps, and teams adopt Sigil signals after the consumer app and extension prove daily utility.

- [ ] Public read-only analysis endpoint with strict rate limits and stable response schemas
- [ ] Lightweight JavaScript SDK for dApps that want to show Sigil verdicts inline before wallet prompts
- [ ] Wallet adapter examples for common dApp stacks
- [ ] Signed threat-signal feed for extension and SDK consumers
- [ ] Partner mode for wallets: embed Sigil risk summaries directly into wallet confirmation screens
- [ ] Exportable analysis receipts for users who want to share a security explanation with a team or community
- [ ] API monetization package from EUR 99/month: API keys, usage tiers, clear quotas, logs/receipts, and documented abuse limits
- [ ] Publish API only after consumer retention, pricing, schema stability, and operational rate limiting are ready

### Phase 7 — Intelligence Expansion

Goal: improve detection quality without bloating the user experience.

- [ ] Extended malicious-address registry covering Lazarus Group, OFAC sanctions, drainers, exploiters, phishing kits, and compromised deployers
- [ ] Cross-chain support expansion driven by extension usage data, not chain count vanity metrics
- [ ] Contract upgrade monitoring for watched protocols and proxy contracts
- [ ] Historical exploit replay dataset for regression testing the scoring engine
- [ ] Community-submitted threat reports with internal review before any signal affects user verdicts
- [ ] Optional webhook alerts for advanced users, teams, and small funds after the core consumer extension is stable

### Deferred Until Pull Is Proven

These ideas remain valuable, but they should wait until the extension has strong retention and daily usage:

- Native mobile app
- Hardware wallet plugins
- DAO-governed threat intelligence
- Full mempool monitoring product
- Compliance dashboard for exchanges

---

## Appendix: Risk Scoring Factors

Complete list of deterministic score factors applied during analysis:

```
OFAC_SANCTION          +45   Address on OFAC sanctions list
WALLET_DRAINER         +40   Drainer method selector detected
KNOWN_EXPLOITER        +40   Address in exploit registry
HONEYPOT_PATTERN       +35   Hidden blacklist or transfer restriction found
UNVERIFIED_SOURCE      +30   No source code on Etherscan
RUG_PULL_PATTERN       +30   Unrestricted mint or selfdestruct found
PHISHING_PATTERN       +25   Contract name contains social engineering keywords
UNLIMITED_APPROVAL     +25   uint256.max approval detected
NEW_CONTRACT           +20   Deployed < 7 days ago
FAILED_TRANSACTION     +10   Transaction reverted or failed
KNOWN_PROTOCOL         −25   Address in verified protocol whitelist
VERIFIED_CLEAN         −15   Verified source + no warnings
BATTLE_TESTED          −10   Contract age > 365 days
HIGH_ACTIVITY          −5    Transaction count > 10,000
```

Score is clamped to [0, 100] after all factors are applied.

---

*Sigil — The Trust Layer of Web3*
*Built for the Replit Agent 4 Hackathon · April 2026*
*All analysis is informational only and does not constitute financial or legal advice.*
