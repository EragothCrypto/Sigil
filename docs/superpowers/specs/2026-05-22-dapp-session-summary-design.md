# dApp Session Summary Design

## Goal

Build Phase 3's dApp Session Summary for the Chrome extension: after a user interacts with a site, Sigil summarizes approvals, signatures, transaction attempts, risk results, and final decisions.

## Scope

### In Scope

- Local-only session capture in the extension.
- One session per site/page lifecycle.
- Event records for intercepted wallet requests.
- Event classification into approvals, signatures, transactions, and other requests.
- Capture verdict, risk score, method, input kind, final decision, and warnings.
- Popup summary for recent dApp sessions.
- Clear sessions when local history is cleared.
- Tests for event classification and summary aggregation.

### Out Of Scope For V1

- Wallet connection.
- Account identity.
- Server-side session storage.
- Cross-browser sync.
- Notifications.
- Full web app session viewer.

## Design

The content script creates a `sessionId` when loaded. Every intercepted request is turned into a session event after Sigil has a local/API result and a final user decision. The event is stored in `chrome.storage.local.sessions` through a pure core helper that groups events by session ID and keeps the newest sessions.

The popup shows a compact "dApp Sessions" section with the latest sessions, site, total events, approval/signature/transaction counts, max risk, and proceed/cancel decision counts.

## Data Shape

Session event:

- `id`
- `sessionId`
- `site`
- `method`
- `methodLabel`
- `category`
- `decision`
- `verdict`
- `riskScore`
- `riskLevel`
- `summary`
- `warnings`
- `timestamp`

Session summary:

- `eventCount`
- `approvals`
- `signatures`
- `transactions`
- `proceeded`
- `cancelled`
- `maxRiskScore`
- `highestVerdict`
- `warnings`

## Testing

- Approval calldata becomes `approval`.
- Signature methods become `signature`.
- Plain send transactions become `transaction`.
- Session aggregation counts categories and decisions.
- Existing extension, store-readiness, Vercel routing, typecheck, and build checks pass.
