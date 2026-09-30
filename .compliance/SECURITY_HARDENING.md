# Security Hardening Review

## Validated Findings

### P0: Extension decisions are forgeable by the page

`artifacts/sigil-extension/inject.js` publishes a request ID in `sigil:intercept` and trusts any later `sigil:decision` event carrying that ID. Both events live in the hostile page's MAIN world. An executable proof of concept captured the ID, queued `action: "proceed"`, and caused the original provider to execute without an extension decision.

Required remediation: replace DOM `CustomEvent` authorization with a browser-authenticated boundary whose response source/origin cannot be forged by the dApp. An extension-origin iframe/UI with strict source/origin verification or direct wallet integration are plausible designs. Until fixed and re-reviewed, the extension must be treated as advisory and may not claim reliable blocking against malicious pages.

### P1: Submitted analyses were publicly enumerable

The audited revision exposed recent records and predictable numeric detail IDs without authentication. The working tree now removes the global feed, assigns UUID bearer-link IDs to new records, permits numeric IDs only for curated Hall of Shame rows, and leaves legacy private rows unreachable. Deployment and API regression tests remain required.

### P2: Sensitive values in logs

The audited revision logged wallet/hash/address values and malformed model output. The working tree removes these values. Provider log retention still requires configuration.

## Existing Positive Controls

- Helmet headers, allowlisted CORS, HTTPS production endpoint and bounded request schemas.
- No hardcoded production API keys; missing Etherscan key fails explicitly.
- IP-based rate limiting and bounded in-memory cache.
- Manifest V3, local packaged code, minimal `storage` permission, and host permission limited to the Sigil origin.
- DOM output escaping/text-node rendering for extension results.
- Server-side API credentials; no key is shipped to the extension or web bundle.

## Additional Hardening Backlog

- Move expensive AI endpoints to a distributed limiter/quota store; the current in-memory limiter is instance-local on serverless infrastructure.
- Add request-cost classes, abuse alerts and upstream budget caps before public API monetization.
- Add CI for typecheck, tests, build, dependency audit, secret scanning, extension package checks and generated-code drift.
- Create reproducible SBOM and signed release provenance for extension packages.
- Remove the user-editable extension API URL unless supported as an advanced self-hosting feature; validate HTTPS and explicit hosts if retained.
- Add content-security-policy verification to deployment checks and maintain a dependency update cadence.
- Add a tested production data-deletion procedure keyed by the opaque analysis ID.

The canonical Codex Security report is generated separately by the app-backed Standard scan.
