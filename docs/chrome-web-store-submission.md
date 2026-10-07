# Sigil Chrome Web Store Submission Pack

Last updated: October 7, 2026

Status: Historical build published in the Chrome Web Store. Advisory-only version 1.0.4 is packaged locally, pending release, and not yet published. It includes discriminated read-only execution checks, not full transaction simulation. The listing and historical submission checks below do not verify the pending update.

Live listing:

https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg

## Store Listing

### Extension name

Sigil - Web3 Trust Layer

### Category

Productivity

Alternative category if Google suggests a security-focused placement: Developer Tools.

### Short description

Understand wallet requests, approvals, and contract risk before you sign. Best-effort advisory alerts for compatible wallets.

### Detailed description

Sigil helps Web3 users understand wallet risk before you sign through manual analysis and best-effort advisory observation of compatible wallet requests.

The pending 1.0.4 extension observes compatible wallet signing methods such as transactions, typed-data signatures, raw signatures, and token approvals on a best-effort basis. The original wallet provider runs independently exactly once per wrapped request, without waiting for Sigil observations, UI, or network analysis. Sigil may show a local advisory panel or a bounded read-only call check, with a link to full analysis when available. A call check is not full simulation or signing clearance and does not establish balance changes or granted permissions. Analysis may finish after the wallet prompt or confirmation; there is no timing guarantee.

Sigil has no blocking, proceed, or cancel authority: the wallet remains the only place that approves or rejects a request. Dismissing an alert or trusting a site only affects Sigil alerts. A hostile page may suppress or forge observations; an observation or missing warning is not proof of wallet activity or safety.

Core features:

- Reviews compatible wallet requests through best-effort advisory observations.
- Flags unlimited token approvals and high-risk permission grants.
- Reviews typed-data signatures, transaction calldata, contract addresses, and transaction hashes.
- Presents qualified heuristic analysis decisions and coverage limits; read-only call checks have no invented safety score or asset effects.
- Offers Quiet, Standard, and Strict alert sensitivity settings; these affect alerts, not wallet execution.
- Lets users manage trusted sites, trusted contracts, optional settings sync, and local recent-check history.
- Connects to the Sigil backend at https://sigil.s3ntrylabs.com for deeper analysis.

Sigil is a security assistant, not a wallet, broker, exchange, custodian, or investment adviser. It provides technical risk analysis and educational context. You remain responsible for every transaction you sign.

### Support URL

https://www.s3ntrylabs.com

### Privacy policy URL

https://sigil.s3ntrylabs.com/privacy

### Legal notice URL

https://sigil.s3ntrylabs.com/impressum

### Terms URL

https://sigil.s3ntrylabs.com/terms

## Release Package

Historical release ZIP (not the pending 1.0.4 update):

`artifacts/release/sigil-chrome-extension-v1.0.2.zip`

SHA-256:

`4827DEE1AAF5A2A328A1E87290069846B54CC2BEE34DDCBF72335B2AECCC3DFF`

Current local update package: `artifacts/release/sigil-chrome-extension-v1.0.4.zip`.

SHA-256: `7D0765CBFFEAD475CC78AB95094029E2A3B99ECA66D40EA85D8BD318F9363170`.

Generated twice with `scripts/package-extension.ps1`; identical hashes. The web download ZIP matches this package. Submission, publication, and installed-build production/manual QA remain pending. The historical checksum above applies only to 1.0.2.

Packaged files:

- `manifest.json`
- `background.js`
- `core.js`
- `content.js`
- `inject.js`
- `popup.html`
- `popup.js`
- `icons/icon16.png`
- `icons/icon32.png`
- `icons/icon48.png`
- `icons/icon128.png`

## Permission Justification

### `storage`

Required to save user-controlled extension settings, alert sensitivity, notification policy, trusted sites, trusted contracts, optional Chrome settings sync state, and recent local check history.

### Content scripts on `<all_urls>`

Required because wallet signing prompts can be initiated from any dApp domain. Sigil uses page-context hooks to observe compatible Ethereum provider signing methods on a best-effort basis and presents advisory alerts separately. It does not control wallet execution. The extension does not request broad host permissions for arbitrary network access.

### Host permission: `https://sigil.s3ntrylabs.com/*`

Required to call the Sigil backend for transaction, contract, and signing-risk analysis.

## Chrome Privacy Disclosure Draft

### Data usage summary

Sigil processes wallet signing request observations to provide advisory security analysis and user-requested alert features. Page observations are untrusted and may not reflect genuine wallet activity.

### Data types collected or processed

- Website content: the extension observes compatible wallet provider signing requests on the current dApp page on a best-effort basis.
- User activity: observed method type, dApp hostname, transaction calldata, typed-data payloads, contract addresses, transaction hashes, alert interactions, and local recent-check history. Alert interactions are not wallet approval or rejection records.
- Authentication information: not collected by the extension.
- Personally identifiable information: not intentionally collected. Wallet addresses and transaction data may be submitted if they are part of a signing request.
- Financial and payment information: not collected as payment data. On-chain transaction details may be analyzed when submitted by the user flow.

### Data transfer

When deeper analysis is required, Sigil sends the relevant signing request, transaction hash, contract address, calldata, typed-data payload, selected network, and technical request metadata to https://sigil.s3ntrylabs.com.

### Local storage

The extension stores settings, trusted sites, trusted contracts, and recent check history locally in Chrome extension storage by default. If the user enables Settings Sync, alert sensitivity, notification policy, trusted sites, trusted contracts, API endpoint, and history limit may sync through Chrome extension sync storage. Analysis history and dApp session history remain local by default and are not synced. Users can clear recent history from the extension popup.

### Data sale

Sigil does not sell user data.

### Advertising

Sigil does not use extension data for advertising or retargeting.

### Human review / AI processing

Submitted analysis requests may be processed by the Sigil backend and configured AI/blockchain infrastructure to generate risk summaries, warnings, and verdicts.

## Policy Review Notes

- Manifest V3 extension.
- Permission list is limited to `storage`.
- Host permissions are limited to the Sigil production API domain.
- No remote scripts, external fonts, CDN scripts, `eval`, or `new Function`.
- Popup scripts are local extension files.
- Backend API responses are treated as data and rendered with escaping in the content overlay.
- The extension does not inject third-party executable code.
- The broad content script match is needed for best-effort compatible wallet request observation across Web3 sites.

## Final Submission Checklist

Checked entries record the historical published build only, not current production verification or publication of 1.0.3.

- [x] Confirm the production app health endpoint is ready: https://sigil.s3ntrylabs.com/api/readyz
- [x] Confirm Privacy Policy, Impressum, Terms, and Cookie pages are live.
- [x] Prepare Chrome Web Store listing copy and privacy disclosure.
- [x] Upload the final ZIP.
- [x] Submit for review.
- [x] Chrome Web Store listing is live.
- [ ] Package and verify advisory-only 1.0.3, submit the update, and confirm publication.
- [ ] Recheck production readiness, legal routes, listing copy, privacy disclosures, and download version for the update.
- [ ] Run installed Store-build wallet signing QA from a real Chrome profile.
- [ ] Test a safe transfer flow.
- [ ] Test an unlimited approval flow.
- [ ] Test a typed-data signing flow.
- [ ] Test trusted site bypass.
- [ ] Test trusted contract bypass.
- [ ] Test API outage fallback behavior.
