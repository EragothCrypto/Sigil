# EU/DE Applicability Matrix

Audit date: 2026-09-28. This is a technical compliance assessment, not a substitute for advice from qualified German counsel or a data-protection professional.

| Regime | Status | Reason and action |
| --- | --- | --- |
| GDPR | `APPLIES` | Wallet addresses, transaction/signing data, IP addresses, logs, and query history can be personal data. Articles 5, 6, 12-14, 25, 28, 30, 32-35 and Chapter V are relevant. Confirm controller identity, processors, transfer safeguards, retention, data-subject handling, and breach process. |
| TDDDG Section 25 | `APPLIES` | Web local storage, sidebar cookie, extension local storage, and optional Chrome Sync access terminal equipment. Current storage is feature-requested or necessary; add consent before any non-essential analytics/marketing storage. |
| DDG Section 5 | `APPLIES` | A business-operated public website/app requires a complete, directly accessible legal notice. The current legal name/legal form and representation details must be confirmed. |
| EU AI Act | `APPLIES` | Sigil integrates an AI model into a user-facing risk system. It is not presently an Annex I/III high-risk use case, but AI literacy, transparency, documentation, human oversight, accuracy and monitoring remain relevant. Article 50/general application is in force as of this audit. |
| Cyber Resilience Act | `APPLIES` | The downloadable Chrome extension is software placed on the EU market. Article 14 reporting obligations apply from 2026-09-11; broader manufacturer obligations apply from 2027-12-11. Establish vulnerability handling, reporting, support period, update and SBOM processes. |
| BFSG/BFSGV | `POSSIBLY_APPLIES` | The current free scanner has no checkout. A future consumer subscription/online contract is an e-commerce service. Confirm whether the operator qualifies for the microenterprise service exemption; continue WCAG-oriented remediation regardless. |
| German/EU consumer and digital-product law | `POSSIBLY_APPLIES` | No paid plan is live. Before Plus/Pro launch, implement pre-contract information, total price/term, cancellation and withdrawal flows, confirmation, digital-product conformity/update duties, and an electronic withdrawal function where required. |
| VSBG | `POSSIBLY_APPLIES` | The current declaration is present, but its truth and any duty to participate must be confirmed against actual business status and consumer contracts. |
| NIS2 / German implementation | `LEGAL_REVIEW_REQUIRED` | Applicability depends on entity size, establishment and sector classification not evidenced in the repository. Reassess when team/entity facts or B2B security services change. |
| MiCA / financial-services law | `LIKELY_DOES_NOT_APPLY` | Sigil does not custody assets, hold keys, execute/broadcast transactions, exchange crypto-assets, or market itself as investment advice. Reassess before personalized recommendations, wallet integration, transaction routing, or regulated partner services. |
| Digital Services Act intermediary duties | `LIKELY_DOES_NOT_APPLY` | Sigil does not host user-generated public content or provide conduit/caching/hosting for third parties. Curated threat intelligence is operator content. |
| Platform-to-Business Regulation | `DOES_NOT_APPLY` | No marketplace or business-user intermediation was found. |
| UWG / marketing law | `APPLIES` | Security and performance claims must be evidence-backed. Unverified “50+ patterns”, live OFAC cross-reference and sub-two-second claims were removed in this audit. |

## Primary Sources

- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- AI Act consolidated 2026 text: https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng
- Cyber Resilience Act: https://eur-lex.europa.eu/eli/reg/2024/2847/oj
- DDG Section 5: https://www.gesetze-im-internet.de/ddg/__5.html
- TDDDG Section 25: https://www.gesetze-im-internet.de/ttdsg/__25.html
- BFSG and BFSGV: https://www.gesetze-im-internet.de/bfsg/ and https://www.gesetze-im-internet.de/bfsgv/__19.html
- BGB: https://www.gesetze-im-internet.de/bgb/
