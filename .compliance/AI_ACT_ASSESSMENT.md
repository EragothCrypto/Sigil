# EU AI Act Assessment

## Classification

Sigil uses a third-party general-purpose model through OpenRouter to generate transaction/contract explanations and risk output. The current use is a cybersecurity decision-support tool for voluntary crypto activity. It does not match an Annex I safety component or Annex III high-risk use case on the audited facts. Status: `AI_SYSTEM_PRESENT`, `NOT_HIGH_RISK_ON_CURRENT_FACTS`, with legal review required if the product becomes a regulated wallet/financial service or makes automated decisions with legal or similarly significant effects.

## Current Controls

- The UI identifies analysis as AI-assisted and explains that final scores can be AI-determined.
- Terms state that outputs may be incomplete, delayed or wrong and remain user decision support.
- Deterministic checks and external blockchain data supplement model output.
- Model output is parsed and bounded before rendering; no transaction is broadcast by the server.

## Gaps and Actions

1. Maintain a model/system record: model identifier, provider endpoint, prompt versions, intended purpose, known limitations, evaluation results, and change history.
2. Establish AI literacy training for anyone operating, reviewing or marketing Sigil, as required by Article 4.
3. Add regression/evaluation datasets for false-safe and false-dangerous verdicts, especially approvals, permits, typed data, proxy upgrades and adversarial metadata.
4. Record human oversight: the user decides; dangerous actions must not be represented as technically impossible while the extension event-channel bypass remains.
5. Monitor model/provider changes. A `:free` alias can change routing/data practices without a code change.
6. Keep Article 50 transparency visible at the point of analysis and preserve the AI-assistance notice in result views.
7. Create an incident path for materially unsafe model behavior and provider changes.

Primary source: https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng.
