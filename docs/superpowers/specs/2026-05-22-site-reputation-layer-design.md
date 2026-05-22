# Site Reputation Layer Design

## Goal

Build Phase 3's Site Reputation Layer for the standalone web app and Chrome extension before any deeper wallet integration.

## Product Context

Sigil already analyzes contracts, transactions, approvals, and watched addresses. The next daily-use gap is the frontend itself: many wallet losses start from phishing domains, clone sites, and fake campaign pages before the transaction payload is even visible.

## Scope

### In Scope

- Local-first domain reputation rules shared conceptually across extension and web app.
- Known official dApp domain recognition.
- Local phishing blocklist for deterministic dangerous examples and future curated entries.
- Clone-like domain detection for domains that reference known brands but are not official.
- Suspicious campaign wording detection such as claim, verify, reward, support, and urgent.
- Extension local pre-screen integration before API calls.
- Manual Site Reputation checker in extension popup.
- Web app `/sites` page for standalone domain checks.
- Tests for trusted, dangerous, and clone-like behavior.

### Out Of Scope For V1

- External live domain-age API.
- Paid threat-intelligence feeds.
- Browser notification spam.
- Automatic clipboard monitoring.
- Wallet integration or wallet-account linking.

## Design

Use deterministic local rules first. This keeps the feature fast, reviewable for Chrome Store policy, and available even when the API is unreachable.

The extension owns the enforcement path through `core.localPreScreen()`. The web app owns the standalone checker page through `src/lib/site-reputation.ts` and `/sites`.

## Status Rules

- `safe`: official known dApp or Sigil domain.
- `dangerous`: local phishing blocklist match.
- `caution` high: clone-like use of a known brand outside official domains.
- `caution` medium: suspicious campaign wording, punycode, or multi-hyphen campaign pattern.
- `caution` medium: unknown but otherwise unflagged domain.

## Testing

- Extension core test: known phishing domain blocks locally.
- Extension core test: official and clone-like domains classify correctly.
- Web model test: same trusted/dangerous/clone-like cases.
- Existing extension store-readiness and Vercel routing tests.
- Workspace typecheck and build.
