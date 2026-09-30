# Vendors and International Transfers

| Vendor/service | Role/use | Data observed | Transfer/contract action |
| --- | --- | --- | --- |
| Vercel | Hosting, edge/serverless delivery, logs | IP, request metadata, API bodies in transit | Confirm Pro/Enterprise DPA coverage, subprocessors, regions, log retention and SCCs. Vercel's current DPA states coverage for Pro/Enterprise plans. |
| Neon | PostgreSQL database | Stored analysis records and timestamps | Confirm DPA, selected region, backups, deletion/restore behavior, subprocessors and SCCs. |
| OpenRouter | AI routing | Prompts containing transaction, contract, wallet or signing data; outputs | Release blocker until account training/privacy settings, routed-provider policy, DPA/role, retention and Chapter V safeguards are documented. Provider practices vary; current documentation offers EU in-region routing on Business and Enterprise plans, subject to eligible models. |
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

## Hobby Constraint Review - 2026-09-30

Operator instruction: retain Vercel Hobby. No upgrade, hosting migration, account-setting change or deployment was performed. This is a scoped vendor-evidence refresh of the existing STANDARD audit, not a new repository security scan.

### Vercel: Unresolved Release Gate

- Terms of Service section 4 limits Hobby to personal or non-commercial use. The Fair Use Guidelines also classify advertising a product/service for sale as commercial; merely having no checkout does not establish eligibility.
- Operator clarification: Sigil currently operates as a non-profit offering; paid plans are future roadmap items, not current revenue. Record this as an operator declaration, not independently verified Vercel approval or a legal charitable status. Future SaaS ambitions alone are not treated as proof of current commercial use. Hobby is retained for the declared non-commercial stage; reassess if actual deployment includes commercial promotion, sponsorship/advertising or other financial-gain activity under the Fair Use definition.
- Mandatory monetisation gate: move the Sigil production deployment to an appropriate paid Vercel plan BEFORE activating paid features, subscriptions, paid API access, checkout or advertising those paid offerings. Verify applicable processor terms and operational limits at that checkpoint; do not wait for the first payment. No upgrade is authorised now.
- Terms section 10.1 incorporates the DPA, but the published DPA introduction and section 4 explicitly scope processor coverage to Pro/Enterprise. Do not infer Hobby processor coverage from the general incorporation clause. Obtain written confirmation of an applicable Article 28 arrangement for this account and workload.
- Terms section 3 allows model training on Hobby content, with a Team-settings opt-out. Record the actual opt-out state and its scope; do not assume request bodies are either included or excluded without clarification. Opting out does not resolve plan eligibility or DPA scope.
- These are provider-contract and privacy-evidence blockers, not a finding that selecting a free tier is itself unlawful. A privacy-policy edit or moving only the database does not resolve them: Vercel still delivers the site and handles requests.
- Current path: retain Hobby during the declared non-commercial stage and resolve processor/privacy evidence separately. Seek Vercel clarification if actual use is ambiguous. The operator has authorised the roadmap prerequisite of a paid Vercel plan when commercial features are introduced, not an immediate account change.

### Neon: Contract and Operational Evidence

The published DPA describes processing on the customer's behalf and requires execution under its stated effective-date clause. A downloaded provider PDF is not proof that Kevin Kauper/S3ntryLabs has executed an applicable agreement. For the Vercel-integrated Neon instance, preserve the integration's actual contracting/acceptance record, account owner, region, subprocessor/transfer terms and backup/restore retention. Do not create a second database or expose connection credentials to gather evidence.

### OpenRouter: Routing and Retention Evidence

Current provider-logging documentation confirms separate training permissions for free and paid models. A no-training preference does not itself mean zero retention, EU residency, or an executed DPA. Provider policies and OpenRouter's own processing must be assessed separately. EU in-region routing is currently documented for Business/Enterprise and requires the regional endpoint and an eligible model; no account upgrade or endpoint switch was made.

Repository search found no explicit `data_collection` or `zdr` request restriction in the examined server/integration sources. Account settings may still restrict routing, but they are unverified. Preserve the actual model/provider endpoint and policies for the configured free model; do not silently substitute a paid model or impose routing constraints without testing availability and failure behavior.

### Consolidated Operator Evidence Needed

1. Vercel applicable processor-term evidence for the Hobby workload and screenshot of model-training opt-out (no secrets); seek eligibility clarification if actual use differs from the declared non-commercial stage.
2. Neon integration/account agreement evidence, database region and configured backup/restore retention (no `DATABASE_URL` or password).
3. OpenRouter privacy screenshots for free and paid training settings, prompt logging, actual provider/model and applicable processing/transfer agreement.

Until evidenced, vendor gate remains open and the overall release decision remains `NO_GO`. Continue unaffected local remediation; do not represent the existing deployment as newly approved.

Primary sources checked on 2026-09-30:

- [Vercel Terms, sections 3, 4 and 10.1](https://vercel.com/legal/terms) (updated June 1, 2026).
- [Vercel Fair Use, commercial usage](https://vercel.com/docs/limits/fair-use-guidelines) (updated September 14, 2026).
- [Vercel DPA, introduction and roles](https://vercel.com/legal/dpa) (effective March 31, 2026).
- [Neon DPA](https://neon.com/pdf/DPA.pdf), introductory effective-date/contract clauses.
- [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging), training settings, provider retention and regional routing.
