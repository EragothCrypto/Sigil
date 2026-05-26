# Sigil Production QA Matrix

Last updated: May 26, 2026

Chrome Web Store listing:

https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg

## Verified From This Environment

| Area | Check | Result | Evidence |
| --- | --- | --- | --- |
| Chrome Web Store | Listing URL returns HTTP 200 | Pass | `curl --ssl-no-revoke -I` returned `HTTP/1.1 200 OK` |
| Production web app | Homepage returns HTTP 200 | Pass | `https://sigil.s3ntrylabs.com/` returned `200 OK` from Vercel |
| Extension page | `/extension` returns HTTP 200 | Pass | `https://sigil.s3ntrylabs.com/extension` returned `200 OK` |
| Legal pages | Privacy, Impressum, Terms return HTTP 200 | Pass | All returned `200 OK` |
| Extension ZIP | `/sigil-extension.zip` returns ZIP | Pass | `Content-Type: application/zip`, `Content-Length: 26541` |
| API readiness | `/api/readyz` returns ready JSON | Pass | `status=ready`, `missingEnv=[]`, database ready |
| Simulate API validation | Empty simulate POST rejects invalid body | Pass | `400 validation_error` |
| Approval Health API | `/api/sigil/approvals/health` live route | Pass | Post-deploy check returned `200 OK` JSON from Express with approval summary data |

## Cannot Verify From This Environment

The installed Chrome Web Store build cannot be installed and driven from this environment. These checks must be run manually in a real Chrome profile:

- Popup settings.
- API URL setting.
- Transaction interception.
- Signature interception.
- Copy/Paste Analyzer from the installed Store build.
- dApp Session Summary after real dApp interactions.
- Site Reputation from popup and sign-time overlay.
- Approval Monitor handoff from live app to API.
- API outage fallback behavior in the installed extension.

## Manual Installed-Store QA Script

1. Install Sigil from the Chrome Web Store listing.
2. Open the popup and confirm the API endpoint is `https://sigil.s3ntrylabs.com`.
3. Switch protection mode between Quiet, Standard, and Strict; confirm settings persist.
4. Set Notification Policy to Critical only, then Critical + high risk; confirm settings persist.
5. Use Copy/Paste Analyzer with an address, transaction hash, approval calldata, suspicious URL, and typed-data JSON.
6. Visit a known trusted dApp and confirm the Site Reputation checker shows a local result.
7. Trigger a safe transfer request from a test wallet.
8. Trigger an unlimited approval request from a test wallet.
9. Trigger a typed-data signing request.
10. Confirm Recent Checks and dApp Sessions update locally.
11. Temporarily point API URL to an invalid host and confirm the extension fails closed with a caution state.
12. Restore API URL to `https://sigil.s3ntrylabs.com`.
