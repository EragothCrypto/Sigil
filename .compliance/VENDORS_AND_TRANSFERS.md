# Vendors and International Transfers

| Vendor/service | Role/use | Data observed | Transfer/contract action |
| --- | --- | --- | --- |
| Vercel | Hosting, edge/serverless delivery, logs | IP, request metadata, API bodies in transit | Confirm Pro/Enterprise DPA coverage, subprocessors, regions, log retention and SCCs. Vercel's current DPA states coverage for Pro/Enterprise plans. |
| Neon | PostgreSQL database | Stored analysis records and timestamps | Confirm DPA, selected region, backups, deletion/restore behavior, subprocessors and SCCs. |
| OpenRouter | AI routing | Prompts containing transaction, contract, wallet or signing data; outputs | Release blocker until account training/privacy settings, routed-provider policy, DPA/role, retention and Chapter V safeguards are documented. OpenRouter states provider practices vary and EU in-region routing is enterprise-only. |
| DeepSeek/actual routed model provider | Model inference | Prompt and output content | Identify the actual endpoint/provider used for `deepseek/deepseek-v4-flash:free`; verify whether free routing permits training/logging and prohibit training-capable routes for personal data. |
| Etherscan | Explorer/API lookups | Transaction hashes, contract/wallet addresses, network/query parameters | Record privacy terms, role, location and retention. API key remains server-side. |
| Public RPC operators | EVM JSON-RPC lookup | Transaction hashes, addresses and RPC metadata | Maintain endpoint inventory; review operators/regions and replace with contracted privacy-controlled RPC for higher-assurance use. |
| CoinGecko | Token price lookup | Contract address and network/platform | Record privacy terms and retention; no user IP is sent directly because calls are server-side. |
| Google Chrome Sync | Optional settings sync | Preferences and trusted site/contract lists | Keep opt-in; do not sync analysis/session history; link Chrome/Google privacy information. |

## Required Evidence

- Executed DPAs or accepted processor terms for Vercel, Neon and any processor-class AI service.
- Current subprocessor lists, chosen hosting/database regions, SCC/adequacy mechanism and transfer-risk assessment.
- Screenshots/export of OpenRouter privacy settings showing training-disabled routing for both free and paid models, or migration to a suitable contracted provider.
- Documented retention for Vercel logs, Neon backups and AI/provider logs.

Sources reviewed: https://vercel.com/legal/dpa, https://neon.com/pdf/DPA.pdf, https://openrouter.ai/privacy, and https://openrouter.ai/docs/guides/privacy/provider-logging.
