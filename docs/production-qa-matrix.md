# Sigil Production QA Matrix

Last updated: October 7, 2026

Status: Advisory-only version 1.0.4 is packaged locally, pending release, and not yet published. The historical published Store build is not evidence that this update is deployed. Production and installed-build manual QA remain pending. Synthetic desktop/mobile checks passed locally; see `.compliance/ANALYSIS_QUALITY_2026-10-07.md`.

## Next Operator Round After Vercel Ready

Run fresh analyses in a private window and preserve the full hash, network, result URL and any provider error. Do not reuse older cached/history results as release evidence.

1. Run the contract-address controls below, then re-test the previously used WETH, Aave supply and Uniswap swap transaction hashes on Ethereum mainnet. Contract addresses are not substitutes for those transaction hashes. Expect bounded observations and current-ABI uncertainty, not an unconditional safety claim.
2. Test exact Euler exploit hash `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d` on Ethereum. Confirm the historical incident role and source links; exploit attribution has an evidence-risk floor of 80, not proof of current exploitability.
3. Test wrong-network and unknown/malformed inputs. Missing evidence must never produce signing clearance or fabricated effects.
4. Test structured JSON in the execution check, then plain calldata/prose. Check explicit call-check/advisory/unavailable states, no balance-delta or safety-score claims.
5. Install the packaged 1.0.4 update in a separate test profile. Check popup and content-script handoff, local history, unavailable API behavior and original wallet behavior; do not sign a real risky transaction for QA.

Record all outcomes before changing the rollout gate. These operator checks have not been performed by this implementation session.

### Konkrete Contract-Eingaben

Fuer alle folgenden Adressen im Sigil-Netzwerkselektor **Ethereum / Mainnet** waehlen (Chain-ID `1`, API-Netzwerk `mainnet`). Die Adresse im Scanner einfuegen und eine neue Contract-Analyse starten. Nur lesen/analysieren: keine Wallet verbinden, keine Freigabe erteilen und keine echte Transaktion senden.

| Contract | Vollstaendige Eingabe | Pruefziel |
| --- | --- | --- |
| WETH9 / Wrapped Ether | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | Bekannter Contract als Metadaten-Kontrolle; vorhandene Verifikation nachvollziehbar, keine erfundenen Transfers oder pauschale Sicherheitsgarantie. |
| Aave V3 Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` | Lending-/Proxy-Kontrolle; aktuelle Metadaten und Implementierungsunsicherheit korrekt abgrenzen. Eine Contract-Analyse beweist keine USDC-Einzahlung oder aToken-Mint. |
| Uniswap V3 SwapRouter | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | Router-Kontrolle passend zum bisherigen V3-Swap-Test; nicht mit SwapRouter02 oder Universal Router verwechseln. Keine Swap-Effekte aus der Adresse allein behaupten. |
| Destination des kuratierten Euler-Exploit-Beispiels | `0xebc29199c817dc47ba12e3f86102564d640cbf99` | Contract-Metadaten separat pruefen. Die Adresse allein darf nicht den exakten historischen Transaktionsnachweis oder dessen 80er-Risikofloor ersetzen. Keine Interaktion/signierte Transaktion! |

Adressquellen, geprueft am 2026-10-07: [Uniswap Ethereum Deployments (SwapRouter und WETH9)](https://developers.uniswap.org/docs/protocols/v3/deployments/v3-ethereum-deployments), [Aave Ethereum Address Book (POOL)](https://github.com/aave-dao/aave-address-book/blob/main/src/AaveV3Ethereum.sol). Die Euler-Destination wurde bereits mit dem exakten On-Chain-Beispiel in [Historical Incident Provenance](analysis-incident-provenance.md) dokumentiert; Primaerquelle ist [Eulers Incident-Bericht](https://www.euler.finance/blog/war-peace-behind-the-scenes-of-eulers-240m-exploit-recovery).

### Exakte Historische Transaktions-Eingaben

Diese **66 Zeichen langen Hashes**, nicht die 42 Zeichen langen Contract-Adressen, fuer die Transaktions-/Incident-Tests eingeben. Ebenfalls ausschliesslich Ethereum / Mainnet verwenden.

| Fall | Vollstaendiger Transaktions-Hash | Erwarteter Nachweis |
| --- | --- | --- |
| Euler: historische Exploit-Ausfuehrung | `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d` | Exakter Katalogtreffer, Rolle `exploit_execution`, sichtbare Quellen und akzeptierter historischer Risikofloor80. Kein Nachweis aktueller Exploitierbarkeit. |
| Euler: Nachricht eines betroffenen Nutzers | `0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17` | Rolle `victim`, kein Exploit-Ausfuehrungsfloor allein aus dieser Rolle. Andere unabhaengige Befunde bleiben moeglich. |
| Euler: historische Rueckgabe | `0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f` | Rolle `recovery`, nicht als Exploit-Ausfuehrung einstufen. Andere unabhaengige Befunde bleiben moeglich. |

Die drei Rollen sind in [Historical Incident Provenance](analysis-incident-provenance.md) einzeln belegt. Vollstaendige Hashes der zuvor getesteten WETH-/Aave-/Uniswap-Transaktionen sind hier noch nicht hinterlegt; gekuerzte Screenshot-Hashes duerfen nicht vervollstaendigt oder geraten werden. Fuer diese Effekt-/Intent-Regressionsfaelle die originalen Explorer-Links verwenden und den vollen Hash im Testprotokoll erfassen.

### Konkrete Read-only-Eingabe

Fuer Schritt4 kann im Execution Check auf Ethereum / Mainnet dieses JSON verwendet werden:

```json
{"to":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","data":"0xd0e30db0","value":"0x0"}
```

Das ist eine read-only `deposit()`-Call-Kontrolle mit Wert0, keine ETH-Einzahlung. Ohne `from` gilt der Provider-Default-Caller; das Ergebnis ist nicht an eine Wallet gebunden. Ein erfolgreicher Call darf weder Balance-Deltas noch Signing-Freigabe behaupten. Bei nicht verfuegbarer RPC-Evidenz muss der Status unavailable bleiben.

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
