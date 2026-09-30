# Analysis Evidence Integrity

Approved scope: existing RPC receipt logs and Etherscan metadata, no new paid data provider or wallet integration.

Transaction ingestion will preserve a bounded, conservatively decoded transfer summary and explicit coverage. Native ETH value is not total asset movement; receipt events are not internal traces or proof of wallet balance changes. Three-topic Transfer events with one uint256 data word are ERC-20-shaped evidence, not token-standard certification. Four-topic events are NFT-shaped; do not mix token IDs and fungible amounts. Missing, malformed, reverted or truncated receipts must not imply no transfers.

Explorer responses must have successful status, array/object shape and usable ABI before declaring verified. Explicit unverified markers differ from unavailable/error evidence. Token metadata requires actual usable fields, not truthy result[0]. Destination metadata is fetched before transaction AI analysis.

AI context lists available evidence, unperformed checks and bounded coverage. It must not claim public selector lookup, confirmed compiler bugs or safety from zero ETH/ordinary gas. Historical exploit cases are exact chain/hash matches, labelled curated hindsight; no synthetic predictive detection or arbitrary exact risk score. General unknown transactions remain uncertain.

Persistence includes bounded evidence summaries in existing details JSON; no schema migration, raw trace storage or global history. Tests use mocked RPC/explorer responses and fixed public examples, no billable inference. Production generation still requires a separate live test and quality review.
