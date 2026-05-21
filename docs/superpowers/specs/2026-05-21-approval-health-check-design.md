# Approval Health Check Design

## Goal

Build Phase 3's first daily workflow: a lightweight Approval Health Check that lets a user paste a wallet address, select an EVM network, and see a prioritized report of risky token approvals.

## Product Context

Sigil's north star is to become the lightweight security layer for ordinary crypto activity. The Chrome extension now protects signing flows, while the web app remains the deeper analysis console. Approval Health Check extends that loop from "review this prompt before signing" to "review the permissions I already have outstanding."

The first version is a web-app workflow. Users manually paste a wallet address. Extension wallet detection comes later after the scanner is reliable.

## Users And Jobs

Primary user: a daily crypto user who has used multiple dApps and wants to know which token permissions are still risky.

Jobs:

- Find unlimited approvals that could still move funds.
- Understand which spender contracts look trusted, unknown, or dangerous.
- Decide which approvals deserve revocation first.
- Avoid false confidence when a network has limited data coverage.

## Scope

### In Scope

- New web app page at `/approvals`.
- Wallet address input with existing network selector style.
- Backend endpoint for approval health scans.
- Explorer-first data source using Etherscan-style APIs already present in Sigil.
- Provider interface so a dedicated allowance provider can be added later.
- Risk scoring for approval records.
- Clear limited-coverage and failed-scan states.
- External explorer/revoke links where possible.

### Out Of Scope For V1

- Wallet connection.
- Extension wallet detection.
- Automatic background monitoring.
- Push/browser notifications.
- Paid or enterprise alerting.
- Guaranteed complete allowance state across all chains.

## Recommended Approach

Use an explorer-first scanner with a provider abstraction.

The first provider fetches approval-like events through Etherscan-style APIs and normalizes them into Sigil's internal approval shape. The UI and scoring logic depend only on the normalized shape, not the provider implementation. This keeps v1 shippable while leaving room for a dedicated allowance API later.

## Architecture

### Backend

Add an API route:

`GET /api/sigil/approvals/health?address=<wallet>&network=<network>`

Responsibilities:

- Validate wallet address and supported network.
- Call an `ApprovalProvider` implementation.
- Normalize approval records.
- Enrich spender/token context with known-entity lookup where possible.
- Score each approval.
- Return a summary plus itemized approvals.

Proposed response shape:

```ts
interface ApprovalHealthResponse {
  address: string;
  network: string;
  generatedAt: string;
  coverage: {
    status: "complete" | "limited" | "unavailable";
    message?: string;
  };
  summary: {
    healthScore: number;
    totalApprovals: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    unlimitedCount: number;
  };
  approvals: ApprovalHealthItem[];
}

interface ApprovalHealthItem {
  tokenAddress: string;
  tokenSymbol?: string;
  spender: string;
  spenderLabel?: string;
  allowanceLabel: string;
  isUnlimited: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  warnings: string[];
  recommendation: string;
  explorerUrl?: string;
  revokeUrl?: string;
  lastSeenAt?: string;
}
```

### Provider Interface

```ts
interface ApprovalProvider {
  scanApprovals(input: {
    address: string;
    network: string;
  }): Promise<ApprovalProviderResult>;
}

interface ApprovalProviderResult {
  coverage: ApprovalHealthResponse["coverage"];
  approvals: RawApprovalRecord[];
}
```

The initial Etherscan-style provider should be isolated in its own file. A future provider can be added without changing the page or scoring interface.

### Scoring

Risk scoring should be deterministic and explainable:

- Unlimited approval to unknown spender: critical.
- Unlimited approval to trusted spender: medium or high depending on token and context.
- Exact approval to unknown spender: medium.
- Revoke or zero approval: low, or omitted if it no longer represents active risk.
- Known dangerous entity: critical.
- Known trusted protocol: reduce risk, but do not hide unlimited approvals.
- Missing data: mark coverage as limited and avoid saying the wallet is clean.

### Frontend

Add `/approvals` to the web app navigation.

Layout:

- Header: "Approval Health Check"
- Network selector using existing Sigil network options.
- Wallet address input.
- Primary action: "Check Approvals"
- Summary band with health score and counts.
- Grouped approval list sorted by risk.
- Empty state that distinguishes "no approvals found" from "limited coverage."
- Error state with retry.

Approval cards should show:

- Token symbol/address.
- Spender label/address.
- Allowance label.
- Risk level and score.
- Warnings.
- Recommendation.
- Explorer/revoke links.

## Data Flow

1. User opens `/approvals`.
2. User selects network and enters wallet address.
3. Frontend calls `/api/sigil/approvals/health`.
4. Backend validates input.
5. Provider fetches approval data.
6. Backend normalizes and scores results.
7. Frontend renders summary and approval cards.
8. User follows external revoke/explorer link if needed.

## Error Handling

- Invalid address: frontend and backend validation with a clear message.
- Unsupported network: return validation error.
- Explorer API rate limit/failure: return coverage `unavailable` or an error with retry.
- Partial data: return coverage `limited` and explain that Sigil cannot guarantee the wallet is clean.
- Empty data with complete coverage: show "No risky approvals found."

## Testing

Backend tests:

- Address validation rejects invalid values.
- Network validation rejects unsupported values.
- Scoring marks unlimited unknown approvals as critical.
- Scoring keeps trusted unlimited approvals visible.
- Limited coverage response is preserved.
- Response shape remains stable.

Frontend checks:

- Page typechecks.
- Invalid address prevents scan.
- Loading, empty, limited, error, and populated states render.

Existing verification:

- `node artifacts/sigil-extension/core.test.cjs`
- `node artifacts/sigil-extension/store-readiness.test.cjs`
- `node artifacts/sigil-extension/vercel-routing.test.cjs`
- `pnpm run typecheck`
- `pnpm run build`

## Open Questions

- Which revoke destination should be used first: explorer token approval pages, Revoke.cash, or a neutral explorer link?
- Should zero/revoke approval events be shown as historical context or excluded from active risk in v1?
- Should the scan default to Ethereum mainnet or remember the last selected network?

## Acceptance Criteria

- A user can paste a wallet address and scan approvals from `/approvals`.
- Results are prioritized by risk and explain why each approval matters.
- The UI does not imply full safety when the data provider has limited coverage.
- Backend and frontend pass typecheck and build.
- The provider abstraction allows a later dedicated allowance provider without replacing the UI.
