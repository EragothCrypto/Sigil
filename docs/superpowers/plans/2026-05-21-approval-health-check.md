# Approval Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-app Approval Health Check that scans a pasted wallet address for risky token approval events across supported EVM networks.

**Architecture:** Add a focused approval scanner module to the API server, expose it through `/api/sigil/approvals/health`, and build a new `/approvals` page in the Sigil web app. The scanner uses an explorer-first provider abstraction so a dedicated allowance provider can be added later without changing the UI.

**Tech Stack:** Express 5, TypeScript, Etherscan V2-style APIs, React, Wouter, Vite, Tailwind, existing Sigil UI patterns.

---

## File Structure

- Create: `artifacts/api-server/src/routes/sigil/approvals.ts`
  - Owns approval provider types, Etherscan-style log scanning, risk scoring, response formatting, and Express route.
- Modify: `artifacts/api-server/src/routes/index.ts`
  - Mounts approval route under `/api/sigil`.
- Create: `artifacts/sigil/src/pages/approvals.tsx`
  - Owns the Approval Health Check UI and direct fetch to the backend endpoint.
- Modify: `artifacts/sigil/src/App.tsx`
  - Adds `/approvals` route.
- Modify: `artifacts/sigil/src/components/layout/Layout.tsx`
  - Adds the Approvals navigation item.
- Modify: `docs/superpowers/specs/2026-05-21-approval-health-check-design.md`
  - Resolve design open questions based on implementation decisions.

## Task 1: Backend Approval Scanner

**Files:**
- Create: `artifacts/api-server/src/routes/sigil/approvals.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Add route skeleton**

Create an Express router with `GET /approvals/health`.

Expected route behavior:

```ts
router.get("/approvals/health", async (req, res) => {
  // validate address and network
  // run scanner
  // return ApprovalHealthResponse
});
```

- [ ] **Step 2: Add validation helpers**

Support networks already recognized by Sigil:

```ts
const SUPPORTED_NETWORKS = new Set([
  "mainnet",
  "polygon",
  "arbitrum",
  "optimism",
  "base",
  "bsc",
  "sepolia",
]);
```

Reject invalid addresses with HTTP 400 and `{ error: "validation_error", message: "Invalid wallet address" }`.

- [ ] **Step 3: Add provider interface and Etherscan provider**

Create:

```ts
interface ApprovalProvider {
  scanApprovals(input: { address: string; network: string }): Promise<ApprovalProviderResult>;
}
```

Use Etherscan V2 logs endpoint with the ERC-20 Approval event topic:

`0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925`

Owner address is topic1, spender address is topic2, amount is log data.

- [ ] **Step 4: Normalize records**

For each approval log, produce:

```ts
interface RawApprovalRecord {
  tokenAddress: string;
  spender: string;
  amountDecimal: bigint;
  transactionHash?: string;
  blockNumber?: string;
  timeStamp?: string;
}
```

Only keep the latest approval per token/spender pair.

- [ ] **Step 5: Score approvals**

Rules:

- Zero amount: omit from active-risk list.
- Unlimited amount to unknown spender: critical, 90.
- Unlimited amount to trusted spender: medium, 52.
- Unlimited amount to caution/dangerous entity: high/critical.
- Non-zero exact approval to unknown spender: medium, 45.
- Non-zero exact approval to trusted spender: low, 18.

Use `lookupEntity(spender)` for labels and trust context.

- [ ] **Step 6: Build summary**

Compute:

- `healthScore`: `100 - maxRiskScore`, clamped 0-100.
- `totalApprovals`
- count by risk level
- `unlimitedCount`

- [ ] **Step 7: Mount router**

Modify `artifacts/api-server/src/routes/index.ts`:

```ts
import approvalsRouter from "./sigil/approvals.js";
router.use("/sigil", approvalsRouter);
```

- [ ] **Step 8: Run backend verification**

Run:

`pnpm --filter @workspace/api-server typecheck`

Expected: exit 0.

Run:

`pnpm --filter @workspace/api-server build`

Expected: exit 0.

## Task 2: Approval Health Check Page

**Files:**
- Create: `artifacts/sigil/src/pages/approvals.tsx`
- Modify: `artifacts/sigil/src/App.tsx`
- Modify: `artifacts/sigil/src/components/layout/Layout.tsx`

- [ ] **Step 1: Create page shell**

Add form state:

- address
- network
- loading
- error
- result

Use the existing supported network labels from the scanner/home page style.

- [ ] **Step 2: Add scan action**

Fetch:

`/api/sigil/approvals/health?address=${address}&network=${network}`

Handle:

- loading
- HTTP errors
- result with approvals
- limited/unavailable coverage

- [ ] **Step 3: Render summary**

Show:

- health score
- total approvals
- unlimited approvals
- critical/high count
- coverage status

- [ ] **Step 4: Render approval cards**

Sort by `riskScore` descending.

Each card shows:

- risk level
- token symbol or shortened token address
- spender label or shortened spender address
- allowance label
- recommendation
- warning list
- explorer/revoke links when present

- [ ] **Step 5: Add empty and limited states**

If coverage is limited or unavailable, explain that Sigil cannot guarantee no approvals exist.

If coverage is complete and approvals are empty, show a calm “No active risky approvals found” state.

- [ ] **Step 6: Add routes and nav**

Modify `App.tsx`:

```tsx
<Route path="/approvals" component={ApprovalsPage} />
```

Modify `Layout.tsx` nav:

```tsx
{ href: "/approvals", label: "Approvals", icon: ShieldCheck }
```

- [ ] **Step 7: Run frontend verification**

Run:

`pnpm --filter @workspace/sigil typecheck`

Expected: exit 0.

Run:

`pnpm --filter @workspace/sigil build`

Expected: exit 0.

## Task 3: Documentation And Final Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-21-approval-health-check-design.md`

- [ ] **Step 1: Resolve open questions in spec**

Document:

- Revoke destination starts with `https://revoke.cash/address/<wallet>?chainId=<chainId>`.
- Zero/revoke approvals are excluded from active risk in v1.
- Default network is Ethereum mainnet.

- [ ] **Step 2: Run extension regression tests**

Run:

`node artifacts/sigil-extension/core.test.cjs`

Expected: all `ok`.

Run:

`node artifacts/sigil-extension/store-readiness.test.cjs`

Expected: all `ok`.

Run:

`node artifacts/sigil-extension/vercel-routing.test.cjs`

Expected: all `ok`.

- [ ] **Step 3: Run full workspace verification**

Run:

`pnpm run typecheck`

Expected: exit 0.

Run:

`pnpm run build`

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/sigil/approvals.ts artifacts/api-server/src/routes/index.ts artifacts/sigil/src/pages/approvals.tsx artifacts/sigil/src/App.tsx artifacts/sigil/src/components/layout/Layout.tsx docs/superpowers/specs/2026-05-21-approval-health-check-design.md docs/superpowers/plans/2026-05-21-approval-health-check.md
git commit -m "Build approval health check"
```
