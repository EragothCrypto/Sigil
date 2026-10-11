# Sigil: World's Fair Submission Draft

Status: honest working draft, not submitted. Kevin confirmed registration as a Solo Founder on 2026-10-11 and authorized commit, push and Vercel preview only. Selected ecosystem track, founder biography and video URLs require Kevin's completion. Verified candidate link and scope are supplied below. Production deployments, deployed migrations and paid services are excluded.

## Headline

Sigil: wallet security decisions backed by evidence.

## One-Liner

Sigil helps crypto users investigate EVM transactions and review Solana token-account delegation, with visible evidence and explicit coverage limits instead of unsupported safety guarantees.

## Product and Current Integration

Crypto users encounter confusing approvals, contract calls and wallet permissions. Sigil's hypothesis is that understandable evidence and concrete review steps can reduce decision friction without asking users to trust an opaque score.

The current candidate preserves EVM transaction/contract investigation, bounded ABI and receipt observations, curated historical incident attribution and manual EVM tools. The new Solana integration reads public token accounts through bounded finalized RPC queries, validates the cluster and official account layouts, and surfaces ordinary legacy SPL delegation. Accounts with unknown delegates prompt review, not a fabricated attack claim. Partial/unavailable data is kept distinct from a successful scoped absence result.

Implemented during the current sprint: Solana SDK/decoder integration, bounded read transport, deterministic delegate observations, manual API/OpenAPI/generated validators, response identity checks, integrated UI and live desktop/mobile tests. Existing EVM features and previous work must be disclosed; Sigil was not entirely built during this final 24-hour sprint. Use repository history to substantiate the actual September14-October12 work rather than presenting all historical code as new.

The Solana check requires no account, wallet connection, transaction signature or AI call. No cloud background monitoring, production Solana threat feed, universal Token-2022 analysis, prepared revoke, billing or asset-loss prediction is shipped in this scope. The public RPC demonstration has no production SLA.

Final differentiation slice: the Solana report is now action-first. It identifies the exact token account, mint, delegate and allowance/balance upper bound, explains ordinary transfer/non-native burn authority and what was not verified, and offers manual owner-reviewed next steps. Live and synthetic provenance are separated on each account card. Incident Exposure Checker was not shipped: reviewed incidents lack a supported current effective exposure predicate in these pipelines. Do not market historical attribution as Am I Affected.

## Presentation Script: 2-3 Minutes

0:00-0:25: Introduce the user problem: wallet permissions and transaction prompts are difficult to interpret. Sigil separates what is observed from what remains unknown.

0:25-1:05: Explain the product through one EVM investigation and one current Solana permission view. Show a clear review reason plus evidence, not just a score.

1:05-1:35: Explain cross-chain composition: EVM investigation retained; official Solana token-program account decoding and finalized reads added. Manual and noncustodial today; continuous monitoring is future work.

1:35-2:10: Target hypothesis: active DeFi users and wallet support teams who need understandable permission evidence. Initial distribution plan: open developer demos, wallet-community testing and focused interviews. Actual traction/demand figures are not established; Kevin should add only verified feedback or users.

2:10-2:40: Explain what was built during the competition, current boundaries and next milestones: broader supported permissions, source-backed correlation and optional opt-in monitoring after validation.

## Product Demo Script: At Most 3 Minutes

0:00-0:25: Open the verified candidate. State manual read-only scope.

0:25-1:00: Open /solana, Load Mainnet address, Check wallet. Show real finalized slots, account coverage and next action. The public protocol token-account authority is an acquisition control, not a manufactured attack victim or protocol-position check.

1:00-1:30: Click Review example. Explicitly say synthetic. Answer what the permission can do, show account/delegate/mint and balance500/allowance250/bound250 raw units, then explain the manual next action. Briefly show Incomplete/Unavailable examples: missing data never becomes safe. See the differentiation handoff for frozen/zero and scoped-negative controls.

1:30-2:15: Use the verified Euler hash in EVM scanner or its clearly recorded result if live latency is unpredictable. Show primary attribution and historical limitation. Do not describe a recorded result as a fresh scan.

2:15-2:50: Show Aave qualified intent/evidence, explain no signing/custody or hidden automatic fix. Finish with the product's monitoring direction, clearly future work.

## Business and Distribution: Hypotheses to Validate

Initial audience: self-custodial DeFi users needing permission review. Potential partner users: wallet support/security teams. Possible future revenue: paid convenience for opt-in monitored wallets or scoped partner integrations, not selling safety guarantees. No active billing or commercial launch is claimed.

Next validation: interview ten target users, test comprehension of review versus unavailable, measure time to evidence and collect consented qualitative feedback. These are planned experiments, not completed traction. No market-size, revenue, waitlist or retention figures should be added without evidence.

## Before Submission

Newest verified application is `dad30cdc4c2b7dbe7f00dd2063aed8e48c1724f5`, [Preview](https://sigil-nanlyi0g2-s3ntrylabs.vercel.app/solana). All five [CI jobs](https://github.com/EragothCrypto/Sigil/actions/runs/38144968268) passed. Fresh Aave/Euler analyses and remote desktop/mobile Solana Mainnet checks passed on2026-10-11; runtime schema DDL has been removed. Current evidence and jury inputs: [live-test checklist](colosseum-demo-checklist.md). Use Kevin's separate authorized branch share link for jury access, never persist its access capability here.

Repository branch: `codex/vnext-p00-baseline` at [Sigil](https://github.com/EragothCrypto/Sigil) (private; actual reviewer access must be arranged by Kevin). Older previews are historical; do not use `sigil-68fs50830` for recording. The recorded live controls are reproducible, not guarantees of future provider availability. No production deployment or deployed database migration was performed.

- Registration confirmed by Kevin: Solo Founder. Choose track in the actual portal.
- Identify the exact candidate SHA and repo access. Public repo encouraged; if private, grant requested reviewer access through Kevin's account.
- Preview deployment authorized; verify and record its final URL, or accurately document local reproduction/recorded demo. Do not deploy production.
- Record/upload presentation and product demo within the stated limits.
- Include logo, founder background/location and verified demand information.
- Disclose pre-existing development, dependencies and actual competition-period additions.
- Submit early; confirm actual receipt. No prize/eligibility or legal clearance claim.
