# Non-Reasoning Selection Follow-Up

Approved scope: preserve DeepSeek V4 Flash, disable optional reasoning, request short JSON selections, retain all validation and the shared 60-second AI deadline. No model switch, provider lock, privacy change or larger limits.

Evidence: operator logs locate the bounded failure at ai_transaction (66.6s total; acquisition completed by 6.6s). An older OpenRouter generation reached 4096 output tokens with finish reason length and total 261.8s. No matching latest generation ID or reasoning usage is available; reasoning is a hypothesis, not a proven cause.

Public OpenRouter model metadata checked on 2026-10-08: reasoning.mandatory=false, default_effort=high; reasoning and response_format supported. Endpoint metadata generally advertises max_tokens. Request policy for the exact configured slug uses reasoning.enabled=false, response_format=json_object, provider.require_parameters=true and max_tokens with the existing 4096/12288 ceilings. Other model requests remain unchanged. JSON mode does not replace semantic validation.

References: https://openrouter.ai/docs/guides/best-practices/reasoning-tokens and https://openrouter.ai/docs/guides/routing/provider-selection . No I/O logging or production credentials needed for metadata checks.

- [x] Reproduce missing request policy with failing tests.
- [x] Apply shared policy to both phases, streaming and bounded transport fallback.
- [x] Verify: 279 affected tests, workspace typechecks, API build and built API/Vercel-handler import smoke pass. Real SDK JSON serialization smoke uses mocked HTTP. Independent review found no blockers; live streaming provider behavior remains unverified.
- [x] Prepare publication; exact published commit and local/remote synchronization are recorded in the project phase after push.
- [ ] Operator live retest after deployment Ready.

Retest Scanner / Ethereum Mainnet: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Start a fresh scan rather than loading history. Expected: complete validated report, or precise fail-closed error with no score. Expand both token-state records separately; completion does not prove token availability. No signing required. A live paid generation has not been run locally; local SDK smoke uses a mocked HTTP transport. Compliance remains NO_GO pending its separate gates.
