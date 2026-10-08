# Token Interface Provenance Diagnosis

User authorizes autonomous implementation/build/verification/publication without unnecessary approval waits. Live Aave report after two-hop support shows USDC token_erc20_interface_not_established while aToken remains available. This identifies candidate rejection, not its exact ABI source or defect.

Investigation: public Blockscout FiatTokenV2_2 ABI at 0x43506849d7c04f9138d1a2050bbf3a0c054402dd passes the existing real inspectTokenInterface (erc20Candidate=true, allowance=true, no ownerOf). Retrieved via public API without keys; not authenticated production Etherscan metadata and not evidence of the ABI selected by Sigil. Therefore no ERC20 acceptance rule is weakened and no concrete production chain is guessed.

Implementation: bounded server-only failure diagnostic records original token, selected leaf ABI address, at most three visited addresses, recorded block, counts of accepted-shape transfer/balanceOf/decimals entries and NFT ambiguity. Both analysis routes forward it to request logs as Token ABI interface rejected. No raw ABI, function names from upstream, provider messages, URL/key, balances, calldata or signatures are logged. Diagnostic callback failures do not change evidence rejection. No UI/report schema or model inputs change. Existing chain/RPC acceptance and deadlines remain unchanged.

- [x] Reproduce missing provenance diagnostic in a failing test.
- [x] Add bounded diagnostic and both-route log wiring.
- [x] Verify workspace typechecks, API build/import smoke and independent review (no blockers; 32 focused tests plus reviewer typecheck). Final affected test total recorded in QA/project phase.
- [x] Prepare publication; exact SHA and synchronization recorded in project phase after push.
- [ ] Live production source diagnosis; token coverage remains open.

After deployment Ready: fresh Scanner / Ethereum Mainnet `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. If USDC still rejects, find its matching Token ABI interface rejected entry in Vercel logs. Inspect abiAddress/proxyPath and bounded counts; do not loosen checks from a generic error. A repeated UI error alone is expected because this change fixes diagnostic observability, not token coverage. No signing or I/O logging required. Overall compliance NO_GO unchanged.
