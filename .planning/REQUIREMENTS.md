# Sigil vNext Requirements Index

Source: operator-supplied 35-section transformation brief, 2026-10-08.
Status: planned, not implemented by this documentation change.

The canonical [traceability matrix](../docs/sigil-vnext-exposure-monitoring-roadmap.md#27-post-mvp-expansion) maps every brief section, including Solana A-E, to architecture and owning phases. The [gate ledger](../docs/sigil-vnext-exposure-monitoring-roadmap.md#23-compliance--release-gates) merges existing G01-G12 without duplicate findings or an audit decision change.

## MVP-A Must-Haves

- VN-01 (P01): explicit chain-qualified identities, versions and complete/partial/unavailable/unsupported check semantics.
- VN-02 (P02): curated sourced threats with affected entities, confidence, immutable revisions and lifecycle.
- VN-03 (P03): pure deterministic exposure/hygiene/negative-result policy; AI cannot decide truth.
- VN-04 (P04): bounded Solana RPC/codecs with actual context/genesis/finality provenance.
- VN-05 (P05): supported wallet/token-account/mint state, both token-program coverage, no fake completeness.
- VN-06 (P06): ordinary SPL delegate rules, current bounded amount and evidence-backed actionability.
- VN-07 (P08): usable local/manual monitor vertical slice; existing EVM/manual tools and local privacy retained.
- VN-08 (P00): applicable engineering/production/security/compliance gates evidenced before public launch.

Each requirement has exactly one owner phase; dependencies do not duplicate ownership. Per-phase acceptance/testing is authoritative in roadmap section 24. Additional continuous/cloud/authority/action/assistant/integration requirements follow P07/P09-P20, not implicit MVP-A functionality.
