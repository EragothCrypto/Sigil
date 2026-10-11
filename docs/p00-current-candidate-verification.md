# P00 Current Local Candidate Verification

Date: 2026-10-10, Europe/Berlin. P00 remains NO_GO; P01 has not started.

## Latest Watchlist Import Candidate

Current web index SHA256:0c5840a3d9e7a8cc0eb5b62813a31b1b61288a98608da0da810d9096877678a8. The157-scan consolidation below belongs to the previous706503 build and is historical, not acceptance of this changed candidate. API/extension/source dependency trees were not changed by this import slice.

The importer now validates complete safe-integer/nonnegative event summaries, health range and count consistency; drops unsupported extra summary fields; treats missing/invalid coverage as unchecked and unavailable markers as unavailable; and derives supported event status from validated counts rather than an unrelated saved label. Invalid address types are skipped without aborting later valid entries. Unique IDs are enforced within an import and across existing/incoming entries, with existing identity/address priority and previous prepend ordering retained. Functional state update avoids overwriting concurrent state after asynchronous file reading. Saved-summary/unavailable fallback text no longer says Not checked yet for recorded data; it disclaims verified scans/current allowances. Valid export/storage keys remain compatible. These validations do not authenticate imported observations or establish effective rights.

Seven actual-source parser regressions first failed for missing coverage, invalid summary, conflicting status, unavailable/unchecked promotion, malformed address, duplicate IDs and unchecked extra fields; then passed. Static review found the first uniqueness fix did not protect merging with existing entries; corrected with merge/update/remove/persistence regression and browser controls. Nine runtime parser/merge controls plus one fallback-copy contract pass. Additional assertions cover multi-entry ordering, fallback suffix collision and the supplied manual demo. Scoped corrective re-review found no remaining concrete parser/merge bug; reviewer did not execute tests/browser and preceded the final fallback-copy change.

Fresh final workspace typecheck/web build and full baseline448 Node tests plus four TS scripts exit0, no failures/skips. Final --events exits0 on the current hash:30 scans/22 manual synthetic GETs/7038 passing check-node occurrences/zero detected violations/217 incomplete contrast occurrences OPEN. Actual Import JSON button/file chooser loads malformed-address and four contradictory-summary/coverage cases into a list containing a colliding existing ID. Watchlist/monitor reload assertions require exact statuses, masked numbers, unique persisted IDs, unchanged existing identity and no automatic requests. Actual remove then manual refresh verifies the original wallet byte-exact and four remaining unique records. Both desktop/mobile pass; final mobile import screenshot inspected for broad layout only. Prior24-view706503 and intermediate30-viewe4f39 reports are preserved as hash-bound archives. Script syntax and diff check pass; build/experimental TS warnings remain.

Manual test example: import docs/fixtures/p00-watchlist-import.json through Watchlist > Import JSON. This file contains synthetic saved observations only, not actual explorer data. Expected rows: Unchecked, Unavailable, High risk, with three unique internal IDs. Monitor aggregate remains -- / Coverage incomplete; the third row explicitly says it is a saved summary, not a verified scan/current allowance assessment. Remove one TEST row; other rows must remain. No Check action, wallet connection, signing or provider request is necessary for this demo. Address/network duplicates already saved are intentionally preserved instead of replaced; remove earlier TEST entries before repeating if desired.

Next local task: validate full manual-refresh HTTP200 payload/context boundaries in Approvals, Watchlist and Monitor; current consumers still use TS assertions rather than complete runtime response validation. Broader/current-candidate browser consolidation, actual-background/non-text contrast, real fonts/zoom/AT, installed/deployed/remote/vendor/legal/operational/provenance acceptance remain OPEN. P00 NO_GO/P01 not started. No commit, push, deployment, production access/deletion, signing or external notification occurred.

## Latest Event-Claims Candidate

### Common-Candidate Rerun Completed

All six declared browser modes now bind the current web hash706503eaee61a09ad4bef31958c5ea85f16cd2eae0ddc3565b6b7e8919b8a352. Each command completed with exit0; an independent structured aggregation compared all report fingerprints with the actual index and required zero detected violating nodes. This supersedes the next-rerun action below for these declared fixtures only.

| Mode | Scans | Passing check/node occurrences | Detected violating nodes | Incomplete node occurrences |
| --- | ---: | ---: | ---: | ---: |
| --wcag | 26 | 4552 | 0 | 127 |
| --states | 10 | 1742 | 0 | 43 |
| --results | 30 | 7466 | 0 | 341 |
| --variants | 37 | 7075 | 0 | 376 |
| --history | 30 | 6680 | 0 | 205 |
| --events | 24 | 5065 | 0 | 161 |
| Total declared local scope | 157 | 32580 | 0 | 1253 |

All incomplete rules are color-contrast. These are repeated observations, not unique defects, separate requirements or passing checks. Grouping by viewport/route/target/HTML produces541 distinct observations, still not unique defects: state and rendered backgrounds can differ. The initial-route report retains diagnostic reasons:18 background overlaps,2 short-text cases,5 empty values,28 partially obscuring,68 partially obscured and6 gradient cases. These totals describe the initial127 only; state-mode compact reports do not retain the detailed check reasons, so this reason distribution must not be extrapolated to all1253. Sixty-six distinct initial-route selectors can refer to different content on different routes/viewports and are not a defect count.

Fresh actual isolated codegen/tree/export drift and generated-package typechecks exit0; committed generated trees unchanged. Previous five reports were preserved byte-exact as tmp/p00/web-{mode}-d0af50e160fdc81f24b2a7e4104738222b87c6a2ea8624dac0696591236339f4-report.json before replacement. Current reports remain tmp/p00/web-{wcag,states,results,variants,history,events}-report.json. Current mobile homepage and desktop privacy screenshots inspected for broad layout; this is not manual contrast/real-font certification. All required browser sessions are terminal.

Next local acceptance work: test inconsistent imported/persisted status-summary-coverage combinations, wider optional/interactive branches and targeted actual-background/non-text contrast. Concrete manual examples: home numeral5 and input placeholder (emptyValue is not pass), /simulate and /extension gradient headings, extension install-button gradient, focused control outlines. Record rendered background, actual text/font state, ratio and reviewer decision per case; preserve unresolved cases. Real fonts, physical touch, screen reader, actual200% browser zoom and deployed acceptance remain OPEN. G01-G12/P00 NO_GO unchanged; no deployment or privileged release action.

This supersedes the candidate identity below for current production source. The earlier five-mode/133-scan consolidation is retained as historical evidence, not acceptance of this changed build.

| Current artifact | SHA256 |
| --- | --- |
| Web dist/public/index.html | 706503eaee61a09ad4bef31958c5ea85f16cd2eae0ddc3565b6b7e8919b8a352 |
| API dist/app.mjs | 0f480150c0e786f635a595e04f72f973c04c37e8ef9f2d81a24b8c9897935ff6 |
| API dist/index.mjs | 6f2af43c44acce643562c095ad72eea1ae6ae43027ffd62fc31f86415e1a94ae |

Approval Health now exposes exact raw event integers, not guessed 18-decimal amounts or effective unlimited permissions. Approval, watchlist and monitor copy names event candidates and local heuristics; manual refresh discloses the selected address/network API and explorer flow. Unavailable row coverage is masked, and a monitor aggregate requires usable coverage for every saved entry. Unavailable/unchecked retained summaries are excluded from aggregation, score inputs and event checklist items. Internal response/storage keys remain compatible.

Fresh full baseline exits0:438 Node tests plus four TS scripts, no failures/skips. Fourteen focused event-claims/fixture tests and verifier syntax pass. Workspace typecheck, web build, API build and built Express/both-wrapper isolated smoke all exit0. Actual API amount tests reject the former MAX-value Unlimited label; unavailable monitor score regression first fails3 versus null, then passes. Existing source-map/chunk, experimental TS stripping and wrapper module-type warnings remain; DEP0169 was not reproduced in the mock smoke.

Final node scripts/verify-web-contrast.mjs --events exits0 on the web hash above:24 scans,5065 passing check/node occurrences,zero detected violations,161 incomplete contrast node occurrences retained OPEN. Twenty manual synthetic address/network GETs; external requests blocked. Both viewports cover empty, 77-digit raw and unavailable responses across three routes, initial unchecked monitor, large-success then HTTP503 failure, and mixed available/unavailable saved wallets. Assertions include exact raw values, own-row labels/counts, storage-compatible statuses, no pre-click scan, neutral aggregate score/counts and no stale checklist after failure. Mobile large-value and unavailable screenshots inspected. This verifies the renderer and actual local report helper, not live explorer parsing, current allowances or wallet safety.

Initial verifier failures were a missing mode-dispatch guard (zero of18 scans) and an ambiguous duplicate coverage-text locator. Both were corrected before final acceptance. A scoped static reviewer found aggregate zero/stale-summary and unsupported Low claims; corrected with red/green regressions and browser checks. Follow-up review found no remaining concrete corrective-path bugs, but did not execute tests/browser. Its aggregate-score and mixed-coverage browser blind spots were subsequently covered. Inconsistent imported status/summary combinations, full interactive workflows, manual contrast, assistive technology and deployed/installed acceptance remain outside this proof.

Report: tmp/p00/web-events-report.json. Test example: use the bundled Playwright NODE_PATH and run node scripts/verify-web-contrast.mjs --events. Fixtures are synthetic and do not seed ordinary preview or production. Unchecked/unavailable/mixed monitor aggregates must show -- and Coverage incomplete; a failed refresh must not keep prior event fixes presented as current.

Next safe local task: rerun the other five declared browser modes against this new stable candidate and continue manual contrast triage. Do not add the old133 scans to these24 as one-build acceptance. G01-G12 remain OPEN/NO_GO, with no commit, push, deployment, real wallet/provider/DB action or release approval.

## Historical Consolidated Candidate

This consolidates the declared local engineering checks on the current candidate. It is not a complete accessibility audit, installed extension test, production verification, signed provenance or release approval. Base HEAD is 7d6f53a5cbb5da8bdb1865b5e299ea90c9430994 on codex/vnext-p00-baseline with intentional uncommitted and untracked work. A base SHA is not the source identity of these local changes.

## Candidate Fingerprints

| Artifact | SHA256 |
| --- | --- |
| Web dist/public/index.html | d0af50e160fdc81f24b2a7e4104738222b87c6a2ea8624dac0696591236339f4 |
| API dist/app.mjs | c2567d4fe7d1147e3515914a7ce3fd4b22e52a658293263d75bae101f741393a |
| API dist/index.mjs | 6cb71eb55b480406c9ff8958333c65568881accae57e0e93d7d535b6156f973d |
| Extension v1.0.4 ZIP, both temporary packages | 0a0a4f0980958cf2960c76b3db518213c6bbce9ae86438d3abe02bd56876547c |
| Fresh supplied license inventory | 133434bc28100f3af7a8da0cfe3d595fb65cc679d38bf69eba03dcd6fd78df3e |
| Generated component-inventory SBOM | 592bd2996b178551deb142565edc0c3202cc7761d2e57614f306c1a0339f3f5e |
| Canonical LF pnpm lockfile, as bound by SBOM | 8ef488ee1fe0c04e980bc4e3826e5900e295ea888a93f6fecd0650f5430217ad |

Fingerprints identify these artifacts only; they do not authenticate a deployed or signed release. All five browser reports bind the same web index fingerprint, and each run checks it again at completion. The browser aggregation also compared every report to the actual current index.

## Common Web Build

Bundled Playwright/Chrome and pinned axe-core4.14.0. Desktop1440x1000/mobile390x844. External requests blocked; synthetic intercepted APIs. Each command completed with exit0.

| Command suffix for node scripts/verify-web-contrast.mjs | Scans | Passing checks | Detected violations | Incomplete node occurrences |
| --- | ---: | ---: | ---: | ---: |
| --wcag | 26 | 4556 | 0 | 133 |
| --states | 10 | 1742 | 0 | 43 |
| --results | 30 | 7466 | 0 | 341 |
| --variants | 37 | 7075 | 0 | 376 |
| --history | 30 | 6680 | 0 | 205 |
| Total declared local scope | 133 | 27519 | 0 | 1098 |

These are repeated check/node occurrences across viewports and states, not counts of unique defects or separate WCAG requirements. All incomplete occurrences are color-contrast checks that require manual review; none is treated as a pass. Fallback fonts, gradient/background uncertainty, full keyboard workflows, assistive technology, actual browser zoom, physical touch and deployed acceptance remain outside this automated proof.

The initial-route suite covers thirteen routes in both viewports. State checks cover loading/error/invalid read-only reports. Results cover current disclosures, contextual nested calls, exact permission/token qualifiers, clipboard failure/success, intercepted sharing and read-only completed/advisory/unavailable/reset states. Variants cover current score-derived reports, validated/unvalidated legacy, invalid evidence and bounded/large/zero legacy approvals with native Tab/mobile autoscroll/Enter/Escape, hover and emulated touch. History covers bounded retrieval/failure/retry, malformed HTTP200 bodies, new record navigation, late responses, unmount and A-B-A generation protection. These are the declared fixtures, not every possible producer payload or UI branch.

Current reports: tmp/p00/web-{wcag,states,results,variants,history}-report.json. Previous results/history/states reports were preserved with their old index SHA in filenames; the older initial-route report lacked a hash and is preserved as web-wcag-pre-hash-report.json, not an identified candidate. Mobile current read-only-unavailable screenshot inspected; exact status/limits remain readable. Prior native-Tab screenshot review belongs to this same web fingerprint.

## Engineering Checks

- Current candidate's preceding final baseline:431 Node tests plus four TS scripts, zero failures/skips, exit0. Forty focused tooltip/fixture/layout/interception/accessibility regressions also pass. These were recorded at the final keyboard correction; no production source changed during the consolidated reruns.
- Fresh pnpm run typecheck passes across the workspace.
- Fresh pnpm --filter @workspace/api-server build passes. Web typecheck/build passed for the unchanged web artifact above at the final keyboard correction.
- Fresh node scripts/check-codegen.mjs passes actual isolated generation, both generated-package typechecks and complete tree/export comparison; committed generated files unchanged.
- Fresh node --trace-deprecation scripts/verify-api-build.mjs passes built API and both Vercel wrappers: health200, unauthenticated retention401, legacy422, invalid-v2 400, advisory-v2 200 without invented effects/score. DB/AI destinations are explicitly unreachable loopback placeholders. First sandbox attempt failed local socket EACCES; approved rerun passed. This is not a production or real-provider test; DEP0169 was not reproduced. Wrapper module-type warning remains.
- Two fresh evidence-mode extension packages under tmp/p00/candidate-d0af50-extension-{a,b} have identical hashes. ZIP allowlist/order and all eleven payloads were compared byte-exact to current source. Public/release packages were not overwritten; no extension was installed or submitted.
- Fresh pnpm licenses list --json succeeded with approved read access to the actual pnpm store. Initial sandbox store lookup failed with ERR_PNPM_MISSING_PACKAGE_INDEX_FILE, retained in candidate-d0af50-licenses-sandbox-error.json. No reinstall. Generated temporary SBOM has469 distinct package versions; this is not a full dependency graph, package authenticity, original-license/asset clearance, installed notices or a fresh vulnerability audit.
- git diff --check exits0; checkout line-ending warnings remain. Vite source-map/chunk and experimental TS stripping warnings remain separately recorded.

## Remaining Acceptance

G01-G12 and their owners remain authoritative in ../.compliance/VNEXT_P00_BASELINE.md. In particular: installed wallet/extension controls; approved production privacy/migration/retention and restore evidence; actual remote CI and final maintainer-reviewed source/provenance; accepted vendor/log/transfer arrangements; operational incident exercise; asset/original-license/support clearance; manual accessibility and qualified publication/claims review. Deployed SHA supplied by Kevin is the older base, not these dirty local artifacts. No commit, push, deployment, real record access, DB change/deletion, provider activation, signing or external notification occurred.

Local test example: run the existing --variants procedure with documented bundled Playwright prerequisites. Native mobile Tab reaches approve() without pre-scrolling; its description must survive automatic focus scrolling, Escape closes with retained focus, Enter reopens and a second Escape clears the description. Synthetic fixtures are injected by the verifier, not seeded into ordinary preview or production.
