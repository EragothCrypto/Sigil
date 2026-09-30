# Validated Analysis Findings Implementation Plan

**Goal:** Only server-owned evidenced statements reach new analysis reports; invalid AI selections produce no verdict or score.

**Architecture:** A pure finding module builds a request-local inventory and deterministic report. Existing two-stage model calls select finding IDs only. Both routes persist the versioned report and omit legacy pattern/reputation/score-factor enrichments from validated results. Web renders the typed categories with guarded parsing and labels older reports as legacy.

**Tech Stack:** Existing TypeScript, OpenAI-compatible client, Node tests, React; no new dependency, provider or DB column.

## Claim And Score Policy v1

The score is a product heuristic, not a probability or audit result. Use the maximum applicable floor, not the sum of correlated limits. These weights require later calibration and never prescribe a score for an example.

| Facts | Category / mandatory output | Score floor |
| --- | --- | --- |
| Valid acquired data, no material uncertainty floor | Observations and coverage limits; no safety guarantee | 5 |
| Unknown/unverified deployed-contract source | Limitation: cannot inspect source; no malicious intent claim | 35 / 40 |
| Nonempty unknown local selector | Limitation: local registry cannot decode intent | 35 |
| Missing/partial/reverted receipt, pending/unknown outcome | Limitation: effect assessment incomplete | 35 |
| NFT/ERC20-ambiguous large approval or other approval intent without checked allowance | Observation plus semantic/state limitation, not confirmed permissions | 40 |
| Missing traces, raw amounts without decimals, mint/burn-shaped events | Neutral limits/observations; not independent risks or positives | No increment |
| Mainnet destination matches an Exploiter entry flagged dangerous in the existing local registry | Risk: curated registry flag, not verified current exploit or legal sanctions | 90 |

Verified source yields inspectability only and no negative score credit. Known protocol identity is an observation only. Success and zero ETH never reduce the score. Registry match is re-derived from exact destination address and mainnet; model-supplied entity/description is not authority. Category Sanctioned does not establish a currently applicable sanctions listing and is excluded from the registry-risk rule.

## Tasks

- [x] Write failing pure inventory/selection tests: forged refs/text/properties, stage omissions, chain binding, mint/burn and unknown units, ambiguous approval, source state and score floors, receipt coverage, registry risk.
- [x] Implement bounded server findings and rendering. All mandatory facts/limits/risks remain present regardless of valid AI omission; extra or unsupported selection rejects.
- [x] Write pipeline tests then integrate ID-only calls in transaction/contract wrappers, validate both stages, stream progress only, preserve budgets/usage/no-retry and sanitized errors. Remove production free-prose path.
- [x] Route tests then persist validated report in details; disable free-text enrichments for this version, handle invalid input without AI/score, rotate cache. Preserve old records and show legacy notice.
- [x] Add guarded shared client report parser and four-category web presentation, bounded safe label, score-policy note, no unvalidated preview. Test desktop/mobile rendering with synthetic local reports, not paid inference.
- [x] Independent scoped review and selected regressions; API/web typechecks and builds.
- [x] Update dashboard/audit and publish only verified implementation; live model/control tests remain separate.

## Verification Checkpoint

2026-09-30: 113 selected Node regression tests passed; API/web TypeScript checks and production builds passed. Existing tooltip sourcemap and large-bundle warnings remain. Independent scoped reviews identified and resolved cache/version, chain-binding, extension-limit compatibility, persisted references, legacy UI bypasses, invalid-report fallback and evidence-display gaps. Last own-path inspection removed the home page's synthesized score50 and all legacy preview rendering; unexpected SSE EOF now produces a no-verdict error.

Local headless installed Chrome via Playwright passed desktop1440x1000/mobile390x844 tests using the real server finding renderer and synthetic acquisition, with intercepted API responses: four report categories, expanded emitter/from/to/raw-unit evidence, no horizontal overflow, malformed versioned report without verdict/score, legacy notice, ignored unvalidated metadata/prose and error on nonterminal EOF. Existing navigation overflow was corrected with a bounded scrollable nav and accessible icon names. Local QA screenshots/script are ignored under tmp/validated-qa, not production evidence.

Runtime output intentionally narrows: the AI cannot invent exploit classes, narratives, amounts or scores. The current catalog supports destination metadata, local selector hints, receipt-shaped observations, coverage limits and curated Ethereum registry flags only. Unsupported economic/routing/supply claims are absent, not verified safe. Dedicated evidence adapters and score calibration remain future work. No paid inference, new model/provider, privacy relaxation, production DB action or installed-extension QA was performed. New Vercel Ready and fresh live controls remain required after publication.

## Acceptance Limits

Publication: runtime commit `a8dfc01808874b1ffa30eea620ba7a9259a38af0` pushed to GitHub main; independently queried remote SHA matches local. Phase dashboard updated and remains in progress. This completes the local implementation/publication checklist, not the Vercel/live-model, installed Chrome or EU/DE release gate.

The pipeline constrains expression, not exploit completeness. New unsupported exploit classes cannot be invented by AI and require later evidence adapters. Legacy reports are not rewritten. No paid production calls, TLS relaxation, account/budget changes or compliance GO inferred.
