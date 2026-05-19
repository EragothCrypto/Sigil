# Sigil Chrome Web Store Submission Pack

Last updated: May 19, 2026

## Store Listing

### Extension name

Sigil - Web3 Trust Layer

### Category

Productivity

Alternative category if Google suggests a security-focused placement: Developer Tools.

### Short description

Real-time Web3 signing protection. Understand wallet requests, approvals, and contract risk before you sign.

### Detailed description

Sigil helps Web3 users review wallet signing requests before approving them.

The extension watches for wallet signing methods such as transactions, typed-data signatures, raw signatures, and token approvals. Before the wallet request continues, Sigil shows a clear risk panel with a plain-English verdict, risk score, warnings, and a link to the full Sigil analysis when available.

Core features:

- Detects risky signing requests before they reach your wallet.
- Flags unlimited token approvals and high-risk permission grants.
- Reviews typed-data signatures, transaction calldata, contract addresses, and transaction hashes.
- Provides Safe, Caution, or Dangerous verdicts with 0-100 risk scoring.
- Offers Quiet, Standard, and Strict protection modes for different daily-use preferences.
- Lets users manage trusted sites, trusted contracts, and local recent-check history.
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

Final ZIP:

`artifacts/release/sigil-chrome-extension-v1.0.0.zip`

SHA-256:

`90FFA7EF04D4703B72130B43831091F49258F09B58A8750C60B81A6A761815FC`

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

Required to save user-controlled extension settings, protection mode, trusted sites, trusted contracts, and recent local check history.

### Content scripts on `<all_urls>`

Required because wallet signing prompts can be initiated from any dApp domain. Sigil must be present on arbitrary Web3 pages to intercept supported Ethereum provider signing methods before the wallet request continues. The extension does not request broad host permissions for arbitrary network access.

### Host permission: `https://sigil.s3ntrylabs.com/*`

Required to call the Sigil backend for transaction, contract, and signing-risk analysis.

## Chrome Privacy Disclosure Draft

### Data usage summary

Sigil processes wallet signing request data only to provide security analysis and user-requested protection features.

### Data types collected or processed

- Website content: the extension observes supported wallet provider signing requests on the current dApp page.
- User activity: signing-request metadata such as method type, dApp hostname, transaction calldata, typed-data payloads, contract addresses, transaction hashes, selected protection decisions, and local recent-check history.
- Authentication information: not collected by the extension.
- Personally identifiable information: not intentionally collected. Wallet addresses and transaction data may be submitted if they are part of a signing request.
- Financial and payment information: not collected as payment data. On-chain transaction details may be analyzed when submitted by the user flow.

### Data transfer

When deeper analysis is required, Sigil sends the relevant signing request, transaction hash, contract address, calldata, typed-data payload, selected network, and technical request metadata to https://sigil.s3ntrylabs.com.

### Local storage

The extension stores settings, trusted sites, trusted contracts, and recent check history locally in Chrome extension storage. Users can clear recent history from the extension popup.

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
- The broad content script match is needed for wallet request interception across Web3 sites.

## Final Submission Checklist

- [ ] Confirm the production app health endpoint is ready: https://sigil.s3ntrylabs.com/api/readyz
- [ ] Confirm Privacy Policy, Impressum, Terms, and Cookie pages are live.
- [ ] Load the final ZIP as an unpacked extension and test the popup.
- [ ] Test a safe transfer flow.
- [ ] Test an unlimited approval flow.
- [ ] Test a typed-data signing flow.
- [ ] Test trusted site bypass.
- [ ] Test trusted contract bypass.
- [ ] Test API outage fallback behavior.
- [ ] Prepare 1280x800 or 640x400 screenshots for the Chrome Web Store listing.
- [ ] Prepare a 440x280 small promo tile if requested by the store dashboard.
- [ ] Confirm the Chrome Web Store privacy questionnaire matches the disclosure draft above.
- [ ] Upload the final ZIP.
- [ ] Submit for review.
