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

Operator confirms Neon Free, a 6-hour project History Window and AWS US East 1 (N. Virginia), `us-east-1`, USA, on 2026-09-30. Record these actual settings rather than generic defaults. DPA acceptance, applicable transfer mechanism/contracting entity, branch/snapshot/export inventory and physical-deletion terms remain pending. The US database location is a concrete input to the existing Chapter V assessment; do not infer either compliance or unlawfulness from the region alone, or assume a public provider DPA proves the operator's accepted agreement. No migration authorised or performed.

Contract-chain refresh: the operator-supplied `https://neon.tech/dpa` currently redirects to Neon's Product Specific Schedule (updated August 5, 2026). That schedule incorporates the Databricks Master Cloud Services Agreement; its Data Protection clause incorporates the DPA for the described personal-data processing. The schedule also modifies DPA audit provisions and the security/subprocessor terms. This supersedes the earlier inference from the standalone legacy Neon PDF that a separate signature necessarily has to be obtained. An applicable accepted contract may already incorporate the DPA; do not require a duplicate signature merely because no signed PDF is available.

Source provenance confirmed by operator screenshot `Screenshot 2026-09-30 141500.jpg`: the public Neon Trust Center at `trust.neon.com`, Legal panel, labels `https://neon.tech/dpa` as Data Processing Agreement. This establishes an official provider publication, not an authenticated Vercel integration's accepted contract. Screenshot reviewed as supplied; the personal Downloads file is not copied into the repository because it includes unrelated browser information. The panel also exposes a Master Services Agreement access request and the overview lists `privacy@neon.tech` for privacy questions. A targeted provider coverage confirmation is the next evidence step if the integration does not expose its applicable terms.

The Databricks DPA landing page separately offers electronic signing and states that a newly signed DPA replaces an existing DPA. Do not sign a replacement without checking the existing arrangement. Published terms establish the available contractual framework, not which terms Kevin Kauper accepted for this specific Vercel-integrated instance. Preserve the actual integration/account contracting record or linked terms and acceptance context, account owner, region, subprocessor/transfer terms and backup/restore retention. Seek provider clarification only if coverage remains unclear; do not create a second database or expose connection credentials to gather evidence.

The linked sample Databricks DPA includes SCCs for restricted transfers. Record the mechanism applicable to this integration and its recipients; the public sample is not evidence of an account-specific executed agreement or a completed transfer assessment. No signature, account change or migration was performed.

### OpenRouter: Routing and Retention Evidence

Post-ZDR Activity evidence 2026-09-30: operator supplies `Screenshot 2026-09-30 152704.jpg` for the subsequent Euler example. The visible rows show DeepSeek V4 Flash 0423 via Open Inference at 03:22 PM (2342/1701 tokens, USD 0.000282) and Relace at 03:21 PM (805/2253 tokens, USD 0.00289), both stop and labelled Sigil. Displayed combined cost USD 0.003172. Column headings/request IDs are not supplied; do not definitively map phases or infer the meaning of Unknown. Combined with the operator-reported setting change and rendered result, this supports functional compatibility with the requested All other models ZDR restriction. Activity rows alone do not expose effective ZDR flags or prove provider compliance/contract acceptance. No provider was pinned; future routing can differ. OpenRouter's own processing, applicable processor/subprocessor arrangement, US-transfer safeguards, metadata retention and configured spending cap remain open. No runtime or account change performed by the assistant; raw screenshot not copied into repository.

Actual route/cost evidence 2026-09-30: operator Activity screenshot `Screenshot 2026-09-30 151536.jpg` shows two Sigil-key requests at Sep 30 03:09 PM, model DeepSeek V4 Flash 0423. Open Inference row displays 2514/1695 tokens, USD 0.000282 and stop; Relace row displays 923/2216 tokens, USD 0.00284 and stop. Combined displayed cost USD 0.003122. Column headings are cropped; token-direction labels and the meaning of Unknown are not independently verified. The two rows are compatible with the two-step analysis, but request IDs/phase correlation are not shown. This confirms those provider labels for these requests, not DeepInfra routing, a fixed route for future calls, a configured budget or content-retention settings. No raw screenshot stored.

Open Inference primary-source review: OpenRouter links to https://www.openinference.ai/terms (June 8, 2026), identifying Open Research, Inc. dba Open Inference. Its linked Privacy Policy https://www.openinference.ai/privacy/index.html claims transient prompt/output processing, no content retention/training, US hosting and SCC safeguards; usage/account metadata is retained separately. Terms sections 8/18 contain broader content-use/training-opt-out and US-transfer language. Preserve this contractual tension and verify the arrangement applicable to OpenRouter-routed requests rather than assuming the public privacy claim proves accepted processor terms or complete GDPR compliance.

Relace primary-source review: OpenRouter's provider-page Terms link https://www.relace.ai/terms-of-use returned 404 in this check; guessed privacy URL also unavailable. No finding that Relace is unsafe or retains prompts follows from an unavailable page. Model-specific ZDR copy for Relace Apply does not establish DeepSeek endpoint coverage. Current OpenRouter ZDR guide https://openrouter.ai/docs/guides/features/zdr describes account/request endpoint restrictions; propose enabling All other models ZDR and testing eligible paid-DeepSeek availability while training remains disabled. No account toggle, routing pin or request policy changed. Obtain applicable OpenRouter/subprocessor terms and transfer evidence; ZDR alone does not close the vendor gate.

Production log supplied by operator on 2026-09-30 validates that the configured free model slug is unavailable: OpenRouter returns 404 and suggests paid slug `deepseek/deepseek-v4-flash`. This supersedes the initial hypothesis of training-policy route exclusion; the supplied error does not establish such exclusion. Select and verify an available model subject to the retained privacy restrictions before declaring AI operational. A paid substitution needs explicit operator approval; none was performed. Successful routing would still not close provider contract, retention or transfer evidence.

Current provider-logging documentation confirms separate training permissions for free and paid models. A no-training preference does not itself mean zero retention, EU residency, or an executed DPA. Provider policies and OpenRouter's own processing must be assessed separately. EU in-region routing is currently documented for Business/Enterprise and requires the regional endpoint and an eligible model; no account upgrade or endpoint switch was made.

Repository search found no explicit `data_collection` or `zdr` request restriction in the examined server/integration sources. Account settings may still restrict routing, but they are unverified. Preserve the actual model/provider endpoint and policies for the configured free model; do not silently substitute a paid model or impose routing constraints without testing availability and failure behavior.

Operator-supplied OpenRouter Privacy screenshot `Screenshot 2026-09-30 141908.jpg` reviewed on 2026-09-30: all displayed ZDR switches are OFF; paid-endpoint training is OFF; free-endpoint training is ON; free-endpoint prompt publication is OFF; workspace 1% data discount is OFF. This records the displayed account settings, not independent proof of the production API key/account mapping or actual historical provider behavior. Training-capable free routing is currently permitted, not evidence that every request was trained on. The earlier unknown account-setting state is superseded for these visible controls only.

Subsequent operator confirmation on 2026-09-30: free-endpoint training has been disabled as requested. This setting substep is complete on operator attestation, not a fresh screenshot or independent production-key verification. The requested post-change Sigil analysis test has not been reported; do not infer model availability or successful no-training production routing from "erledigt". Retain the other training/publication/discount switches OFF. Requiring ZDR for All other models is a stronger retention-routing control, but may leave the configured free DeepSeek model without an eligible endpoint. Confirm model availability and safe error handling before representing that stricter route as operational. No model, code or production request was changed by the assistant. Training opt-out and provider ZDR do not independently resolve OpenRouter's own processing, DPA, recipient identity or international-transfer evidence. Raw screenshot is not copied into the repository.

### Consolidated Operator Evidence Needed

1. Vercel applicable processor-term evidence for the Hobby workload and screenshot of model-training opt-out (no secrets); seek eligibility clarification if actual use differs from the declared non-commercial stage.
2. Neon integration/account agreement evidence, database region and configured backup/restore retention (no `DATABASE_URL` or password).
3. OpenRouter privacy screenshots for free and paid training settings, prompt logging, actual provider/model and applicable processing/transfer agreement.

Until evidenced, vendor gate remains open and the overall release decision remains `NO_GO`. Continue unaffected local remediation; do not represent the existing deployment as newly approved.

Primary sources checked on 2026-09-30:

- [Vercel Terms, sections 3, 4 and 10.1](https://vercel.com/legal/terms) (updated June 1, 2026).
- [Vercel Fair Use, commercial usage](https://vercel.com/docs/limits/fair-use-guidelines) (updated September 14, 2026).
- [Vercel DPA, introduction and roles](https://vercel.com/legal/dpa) (effective March 31, 2026).
- [Neon Platform Terms](https://neon.com/platform-terms), current destination of the operator-supplied Neon DPA link; incorporates the MCSA with Neon-specific amendments.
- [Databricks MCSA](https://www.databricks.com/legal/mcsa), Data Protection clause incorporating the DPA.
- [Databricks DPA landing page](https://www.databricks.com/legal/databricks-data-processing-addendum) and [linked sample DPA](https://www.databricks.com/legal/dpa); replacement-signature notice and restricted-transfer SCC provisions.
- [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging), training settings, provider retention and regional routing.
