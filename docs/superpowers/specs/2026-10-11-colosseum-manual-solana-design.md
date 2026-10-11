# Colosseum Manual Solana Design

Kevin approved on 2026-10-11: preserve EVM tools; add narrow real manual Solana wallet/delegate check; no accounts or always-on monitoring. Delivery priorities: docs/colosseum-24h-roadmap.md.

## Options and Decision

EVM-only stabilization is lowest risk but adds little of the vNext direction. Full continuous Solana service is incompatible with this deadline. Selected: additive manual Solana slice, no broad rebuild.

## Architecture

Add small chain-native modules under artifacts/api-server/src/monitoring/chains/solana and a manual endpoint under /api/sigil/monitor/v2/solana/scan. Use official Solana public-key and SPL account decoder libraries; never hand-roll binary account layouts. Backend validates requested cluster/address, configured endpoint, genesis and finite response/time/account budgets. Both canonical token programs are queried with finalized commitment; each returned context slot is retained. Official account decoding establishes only the supported legacy SPL account/delegate shape. Token-2022 semantics are explicitly unsupported in this slice. No universal negative, USD valuation or execution simulation.

Results have reportVersion, requested wallet/cluster, generatedAt, status, coverage, observations and delegate review entries with account/mint/program/slot/raw amount. Raw values are decimal strings. Unknown delegates indicate review, not proven maliciousness. Frozen/empty accounts and unsupported state do not get ordinary executable-transfer claims. Genesis or transport failures produce unavailable reasons, not an empty successful report. No AI, DB persistence, wallet connection, keys or signing are required.

UI is additive in the existing app, accessible from monitor/navigation. It offers explicit scan, validates/binds returned report context, shows loading/errors/partial scope, evidence links and read-only review guidance. Live and synthetic examples are separate, clearly labeled; fixtures exercise the same decision function. No automatically uploaded local watchlist.

## Verification

Red/green unit tests for malformed keys, exact u64 amounts, normal/unknown delegates, zero/frozen accounts, wrong owner/program/layout, Token-2022 limits, account caps and failed queries. RPC tests enforce method allowlist, genesis/response IDs, bytes/deadline/cancellation and no SSRF input. Mounted HTTP/wrapper and UI desktop/mobile smoke before calling integration ready. Record exact live wallet/cluster/genesis/slots only after successful read; no risky QA signing. Existing Aave/Euler expectations preserved. Honest unavailable state is mandatory.

Deployment and submission are separate external actions requiring Kevin's authorization/account. Full audit is not closed by this design.
