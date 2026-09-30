# Data Processing Inventory

| Processing activity | Data | Purpose | Basis to confirm | Recipients/storage | Retention |
| --- | --- | --- | --- | --- | --- |
| Transaction/contract analysis | Transaction hash, contract address, network, fetched on-chain data, result | Requested security analysis | Art. 6(1)(b) GDPR; alternatively documented Art. 6(1)(f) balancing | Vercel, Neon, OpenRouter/model provider, Etherscan/public RPC, CoinGecko where relevant | Code now schedules ordinary DB records for deletion after 30 days; memory cache 30 minutes |
| Raw signing simulation | Calldata, JSON transaction, typed data or prompt text, optional public wallet address | Explain a proposed signing action | Art. 6(1)(b); minimize before transmission | Vercel and OpenRouter/model provider; result is not stored in the analyses table | Provider retention must be configured/verified; application does not persist this endpoint's body |
| Approval health scan | Public wallet address, network, approval logs | User-requested allowance-risk overview | Art. 6(1)(b) | Vercel and Etherscan | Not stored in application DB; infrastructure/provider logs apply |
| Wallet monitor/watchlist | Public wallet addresses, labels, selected networks, refresh state | User-managed local monitoring | User-requested local feature; TDDDG necessity | Browser local storage; address sent to API/Etherscan on refresh | Until user removes entry or clears site data |
| Extension advisory observation | Site URL/host, wallet method, transaction/signature payload, verdict, advisory lifecycle/dismissal, session history; legacy decision records retained locally | Best-effort risk context and session summary; wallet execution remains independent | Art. 6(1)(b); local storage necessity | Local Chrome extension storage; analysis payload to Sigil API/OpenRouter when needed | Configured local history limit/until cleared or extension removed |
| Optional settings sync | Protection mode, notification policy, API URL, trusted sites/contracts, history limit | Cross-device preference sync | User activation; document TDDDG/GDPR basis | Google Chrome Sync | Until sync disabled/removal, subject to Google account retention |
| Hosting/security logs | IP address, timestamp, route, status, error metadata | Delivery, abuse prevention, reliability and incident response | Art. 6(1)(f) balancing | Vercel and application logs | Confirm and configure provider retention; payload identifiers were removed from application error logs |
| Local UI state | Onboarding completion, sidebar cookie, locally watched wallets | Remember requested interface state | TDDDG Section 25(2) where strictly necessary/requested | User browser | Until site data is cleared; sidebar cookie maximum set by UI component |

## Data Minimisation Rules

- Never accept or request seed phrases, private keys, passwords, recovery codes, or exchange credentials.
- Treat typed-data messages and free-text wallet prompts as potentially confidential.
- Do not publish normal scans; result links use random UUIDs and must be treated as bearer links.
- Keep analysis history local by default in the extension.
- Do not log submitted wallet, transaction, contract, calldata, or model-response content.
- Reassess the DPIA threshold before continuous alerts, user accounts, wallet linking, behavioral profiling, or large-scale monitoring.
