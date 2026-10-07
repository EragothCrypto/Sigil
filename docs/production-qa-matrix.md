# Sigil Production QA Matrix

Last updated: October 7, 2026

Status: Advisory-only version 1.0.4 is packaged locally, pending release, and not yet published. The historical published Store build is not evidence that this update is deployed. Production and installed-build manual QA remain pending. Synthetic desktop/mobile checks passed locally; see `.compliance/ANALYSIS_QUALITY_2026-10-07.md`.

## Next Operator Round After Vercel Ready

Run fresh analyses in a private window and preserve the full hash, network, result URL and any provider error. Do not reuse older cached/history results as release evidence.

1. Re-test the previously used WETH, Aave supply and Uniswap swap examples on their correct network. Expect bounded observations and current-ABI uncertainty, not an unconditional safety claim.
2. Test exact Euler exploit hash `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d` on Ethereum. Confirm the historical incident role and source links; exploit attribution has an evidence-risk floor of 80, not proof of current exploitability.
3. Test wrong-network and unknown/malformed inputs. Missing evidence must never produce signing clearance or fabricated effects.
4. Test structured JSON in the execution check, then plain calldata/prose. Check explicit call-check/advisory/unavailable states, no balance-delta or safety-score claims.
5. Install the packaged 1.0.4 update in a separate test profile. Check popup and content-script handoff, local history, unavailable API behavior and original wallet behavior; do not sign a real risky transaction for QA.

Record all outcomes before changing the rollout gate. These operator checks have not been performed by this implementation session.

Current contract: Sigil reviews compatible wallet requests through best-effort observations. The original wallet provider runs independently exactly once per wrapped request, without waiting for Sigil UI or analysis. Sigil has no blocking, proceed, or cancel authority; the wallet remains the only place that approves or rejects a request. A hostile page may suppress or forge observations. Analysis may finish after the wallet prompt or confirmation, with no latency guarantee. Before-you-sign positioning is a review goal, not guaranteed pre-prompt coverage.

Chrome Web Store listing:

https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg

## Historical Verification (May 26, 2026)

These recorded checks have not been rerun for the pending release. They do not establish current production health, download version, or advisory behavior.

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
- Best-effort compatible transaction request observation.
- Best-effort compatible signature request observation.
- Copy/Paste Analyzer from the installed Store build.
- dApp Session Summary after real dApp interactions.
- Site Reputation from popup and sign-time overlay.
- Approval Monitor handoff from live app to API.
- API outage fallback behavior in the installed extension.

## Manual Installed-Store QA Script

Run this against the identified 1.0.3 candidate in a test profile, then repeat against the installed Store update after publication. Record the version, wallet, dApp, and network; do not report the historical Store build as verification of the pending update.

1. Install the identified candidate or published update and confirm its version is 1.0.3.
2. Open the popup and confirm the API endpoint is `https://sigil.s3ntrylabs.com`.
3. Switch Alert Sensitivity between Quiet, Standard, and Strict; confirm settings persist and affect alerts only.
4. Set Notification Policy to Critical only, then Critical + high risk; confirm settings persist.
5. Use Copy/Paste Analyzer with an address, transaction hash, approval calldata, suspicious URL, and typed-data JSON.
6. Visit a known trusted dApp and confirm the Site Reputation checker shows a local result.
7. Trigger a safe transfer request from a test wallet.
8. Trigger an unlimited approval request from a test wallet.
9. Trigger a typed-data signing request.
10. Confirm Recent Checks and dApp Sessions update locally.
11. Test API outage with the production endpoint unavailable. Confirm an advisory analysis-failure/caution state where an observation is accepted, while the wallet request runs independently exactly once and retains its original result or error. Unsupported API URLs must be rejected rather than used to bypass endpoint restrictions.
12. Restore API URL to `https://sigil.s3ntrylabs.com`.
13. Confirm dismissing alerts and trusting sites/contracts cannot approve, reject, cancel, or replay wallet requests.
14. Test delayed analysis, disabled alerts, absent UI, and suppressed observations; wallet behavior must remain independent. Record whether analysis arrives after the prompt or confirmation, without asserting a fixed latency.
15. Test forged, malformed, oversized, stale, and repeated observations. Confirm intake limits and no wallet authority; forged observations must not be treated as authenticated wallet activity.
16. Confirm session states describe observations, reviews, dismissals, or analysis failures, not inferred wallet approvals/rejections; keep legacy extension actions separate.
