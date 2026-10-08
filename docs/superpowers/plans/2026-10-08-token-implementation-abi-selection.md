# Implementation ABI Selection Correction

Production provenance now confirms USDC -> 0x43506849d7c04f9138d1a2050bbf3a0c054402dd -> 0x800c32eaa2a6c93cf4cb51794450ed77fbfbb172; selected final ABI lacks all three required functions. Scan completed in 10012ms, AI stage began at 7690ms and save at 9960ms. This establishes this scan's timing, not general provider latency.

Primary public reference: Blockscout's verified FiatTokenV2_2 ABI passes the existing detector. Sourcify API v2 exact-match metadata for 0x800c32... identifies SignatureChecker with only isValidSignatureNow(address,bytes32,bytes). The old assumption that every reported implementation link must lead to the token interface is invalid for this observed library link. References: https://eth.blockscout.com/api/v2/smart-contracts/0x43506849d7c04f9138d1a2050bbf3a0c054402dd and https://sourcify.dev/server/v2/contract/1/0x800C32EaA2a6c93cF4CB51794450ED77fBfbB172?fields=abi,metadata . No runtime provider changes.

Approved autonomous scope: keep the first verified implementation ABI that passes the unchanged bounded ERC20 candidate/NFT checks, even when explorer metadata flags that implementation as proxy. This is only current response-shape evidence; not proof of a proxy's final implementation, historical effects, economic authenticity or rights. Initial proxy wrapper still cannot shortcut traversal. Unknown proxy status still rejects. If no suitable implementation ABI exists, retain bounded two-link traversal, identity/cycle/depth checks and precise failures. No address whitelist or raw-source heuristic.

Original-token recorded-block code/decimals/balance calls and canonical word validation remain mandatory; proxy permissions remain disabled. Qualifier current_proxy_abi_only and historical limits unchanged. Intermediate ABI test fixtures that previously implied ERC20-bearing proxy nodes now use wrapper ABIs when testing traversal-only failures; this reflects the intentional selection change, not removal of rejection coverage.

- [x] Red test reproduces concrete USDC/SignatureChecker selection error.
- [x] Prefer matching verified implementation ABI without replacing it with a library ABI.
- [x] Workspace typechecks, API build/import smoke and independent review pass (no blockers, 23 focused tests). Follow-up dedicated shortcut tests cover unknown status, unverified source, NFT/duplicate ambiguity and malformed RPC; final total recorded in project phase.
- [x] Prepare publication; exact SHA and local/remote synchronization recorded in project phase after push.
- [ ] Fresh live Aave and Euler control after deployment Ready.

Aave / Scanner / Ethereum Mainnet: `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`. Expected: USDC may return qualified decimals/balance only if real current implementation metadata and original-token RPC checks pass; otherwise precise upstream/interface/RPC reason with no guessed values. Euler: `0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d`, retain historical exploit finding. No signing required. Live success and overall compliance GO are not established by local tests.
