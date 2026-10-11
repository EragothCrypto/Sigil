# P00 Supply Chain Evidence

Checkpoint: 2026-10-09; repository `C:\Coding Projects\Sigil`; local HEAD `7d6f53a5cbb5da8bdb1865b5e299ea90c9430994`. Working-tree changes are uncommitted. Partial G08 evidence only; NO_GO unchanged.

## Secret History and Current Sources

Used official [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1). Windows x64 archive SHA256 matches the public release API digest: `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`. ZIP members validated before extraction; executable reports 8.30.1. This is download integrity evidence, not a signed Sigil build or release attestation.

Explicit `scripts/secret-scan.toml` extends upstream default rules, without repository rule exclusions. No baseline used; inline `gitleaks:allow` ignored and an empty separate ignore directory used. Upstream rule allowlists still apply. Redaction is 100%; decode/archive depth bounded at two, command timeout 300 seconds. No credential validity probes, provider calls, uploads, rotations or Git history rewriting.

- Repository is not shallow. `git rev-list --all --count` returned 147 and `--all --reflog --count` returned 159. Extended scanner invocation uses `--all --reflog --full-history --root -m`. Git numstat independently accounts for 151 commits with text additions, one text-deletion-only commit, one binary-only commit and six without diff stats. Gitleaks reports 151 scanned commits, matching text additions including merge patches/local reflog history. Coverage is local available text additions, not unknown remote/deleted/dangling objects or historical binary archive contents omitted by Git patches. This explains the count difference; it is not hidden by shortening the Git range.
- Canonical current-source snapshot at the scan checkpoint, before this evidence document was added, uses Git tracked plus nonignored untracked names, NUL-separated and deduplicated. Paths checked within source/output roots; non-files/symlinks rejected, missing tracked files recorded rather than silently following them. Snapshot: 556 files, 18,080,571 bytes, no missing files. Ignored local environment files were not copied into this snapshot. Directory scanner scanned about 3.34 MB of detectable text/archive content. Binary assets are not claimed fully secret-audited. Rerun against the final release candidate, including later source/document changes.
- Both final scans exit 1 for **two raw findings**. Do not label that scanner exit clean or suppress it. Source triage below identifies two non-credential values; no confirmed credential leak in these scanned inputs. Maintainer review and future reruns remain necessary.
- Synthetic GitHub-token-shaped random input is detected as `github-pat`, exit 1, and both secret/match are redacted in the report. Benign stdin control exits 0. Synthetic value was never printed or sent to GitHub.

| Raw finding | Source classification / evidence | Disposition |
| --- | --- | --- |
| `generic-api-key`, `artifacts/api-server/src/routes/sigil/analysis-adapters.test.cjs:128`, commit `763896ac10daa58ec283c7e494cf03f7bb82d34b` | `token` is a literal 40-hex-digit EVM address in the nested-proxy fixture. It feeds a mocked adapter/RPC; it is not an access token. Historical source and current-source metadata checked without exposing credentials. | Non-secret fixture; retain raw finding, no ignore added. |
| `generic-api-key`, historical `.env.example:14`, commit `dcbfe49fa9bf933b6be2372d5e398bd211297c22`; current line 24 | Example value matches a replacement-placeholder-only pattern, not a provider credential. Actual local `.env` values are not the basis of this classification. | Non-secret replacement instruction; retain raw finding, no ignore added. |

Temporary evidence, not historical compliance snapshot replacements:

- `tmp/p00/secrets-history-including-merges-redacted.json`, SHA256 `451e307ef942c1accca1a93fb4bf34047f2892308e70d59b2c91799b2989eea6`.
- `tmp/p00/secrets-current-redacted.json`, SHA256 `0541b58c59adf9302451fbb69d19015cd48db426f858e537b41de20f47d0320d`.
- `tmp/p00/secret-tree-manifest.json` and `tmp/p00/secrets-positive-control.json`.
- An earlier directory invocation ran before the snapshot manifest was ready and defaulted to the repository directory. Its ten findings were duplicate source/snapshot matches plus downloaded Gitleaks README/archive examples, not canonical source evidence. Preserved as `tmp/p00/secrets-directory-fallback-redacted.json`. Final invocation uses PowerShell Stop-on-error and an explicitly validated snapshot directory; no empty-target fallback.

Reproduce history scan after acquiring the same verified tool:

```powershell
$ErrorActionPreference = 'Stop'
& './tmp/p00/gitleaks-8.30.1/bin/gitleaks.exe' git . `
  --config scripts/secret-scan.toml `
  --log-opts='--all --reflog --full-history --root -m' `
  --ignore-gitleaks-allow --gitleaks-ignore-path tmp/p00/secret-scan-empty-ignore `
  --redact=100 --no-banner --no-color --report-format json `
  --report-path tmp/p00/secrets-history-including-merges-redacted.json `
  --max-decode-depth 2 --max-archive-depth 2 --timeout 300
```

The empty ignore directory must exist and contain no ignore file. Review nonzero scanner exit/report; never convert findings or transport/config errors into a passing scan. Secret-scanning GitHub CI and signed release provenance are not established by this local run.

## Dependency License Inventory

Current component inventory contains 469 installed versions, not a legal clearance or a runtime-only dependency graph. Metadata groups: MIT 413, Apache-2.0 9, Unknown 3, Python-2.0 1, CC-BY-4.0 1, ISC 29, BSD-3-Clause 6, BSD-2-Clause 1, MPL-2.0 2, 0BSD 1, `(MIT OR CC0-1.0)` 1, `MIT AND ISC` 1, Unlicense 1.

| Item needing explicit follow-through | Observed evidence | Next acceptance |
| --- | --- | --- |
| `@replit/vite-plugin-cartographer@0.5.1` | Installed package lacks license metadata and license/notice files; conditional Vite development import. | Obtain applicable rights or remove integration if operator confirms it is no longer used; do not invent MIT. |
| `@replit/vite-plugin-dev-banner@0.1.2` | Same missing metadata/files; conditional web development import. | Same rights/removal decision. |
| `@replit/vite-plugin-runtime-error-modal@0.0.6` | Same missing metadata/files; Vite configurations invoke plugin without the other two plugins' environment guard. | Check actual plugin applicability/distribution; missing rights cannot be waived by guessing production absence. |
| `caniuse-lite@1.0.30001813`, CC-BY-4.0 | Metadata observation only. | Review distribution/attribution obligations against applicable package text. |
| `lightningcss` and Windows native package 1.31.1, MPL-2.0 | Metadata observation only. | Review actual distribution/modifications and notices; no blanket incompatibility or clearance conclusion. |
| Remaining permissive/mixed metadata | Inventory labels only. | Preserve applicable license/copyright/NOTICE text and verify shipped artifacts; root MIT does not cover every dependency/asset. |

Historical `dependency-licenses.json` and SBOM are unchanged. Current temporary inventory is `tmp/p00/licenses-after-glob.json`. Actual third-party notices, asset clearance, remote CI, support/lifecycle and signed provenance remain open G08 deliverables.

## Original Package Text Collection

2026-10-09 local G08 evidence follow-through, not legal clearance or a published third-party notice bundle:

- Added `scripts/collect-license-texts.mjs` with explicit inventory and new output tree below repository `tmp`. It validates installed manifest name/version for every inventory version, hashes manifests and original files, rejects redirected stores/notice symlinks/output junctions, and never overwrites earlier evidence. Only ordinary package-root files named LICENSE/LICENCE, COPYING, NOTICE or COPYRIGHT (including suffix variants) are collected, bounded to 1 MiB each. Nested/bundled licenses and license sections in README are outside this collection.
- Fresh `pnpm licenses list --json` uses local pnpm 10.12.4 with the real installed store. Sandbox store lookup returned ERR_PNPM_MISSING_PACKAGE_INDEX_FILE; that is not an empty inventory or a passing scan. Retried with local store access, no install/download. **469 installed component versions; 424 original files across 423 versions; 46 versions have no collected root text.** A second isolated output produces an identical index. All 424 copied files were independently compared byte-for-byte to the installed originals and their recorded SHA256/size.
- Final index `tmp/p00/original-license-texts-v2/index.json`, SHA256 `c78f61bbe22bd3607aac3d431cffaa568725b90a2604fd778794ae8087db4158`. Repeated output `original-license-texts-v3` matches. Inventory SHA256 `133434bc28100f3af7a8da0cfe3d595fb65cc679d38bf69eba03dcd6fd78df3e`; canonical LF lock SHA256 remains `8ef488ee1fe0c04e980bc4e3826e5900e295ea888a93f6fecd0650f5430217ad`. Initial v1 collection is retained; final v2 additionally binds manifest hashes/reported labels and rejects store redirection.
- Exact texts are now present for React, TypeScript, caniuse-lite and both installed lightningcss packages. This establishes what text was installed, not its authenticity, applicable distribution obligations, attribution completeness or compatibility. No generic license boilerplate was substituted for a missing copyright/notice.
- Missing-root-text cases include all three Replit plugins, 14 Orval-family versions, 12 Radix-family versions, native esbuild/rollup, drizzle packages, embla packages, wouter and others. The complete 46-item list is in the index with `original-text-not-found`; absence in this bounded root scan does not prove no license exists elsewhere. Retrieve applicable exact-version upstream/bundled texts and map actual shipped artifacts before acceptance. Unknown Replit rights and asset-origin operator questions remain unanswered.
- Seven collector regressions plus six CI-policy controls pass. A store-junction bypass was reproduced by a failing negative test and corrected. Full baseline **349 Node tests plus four TS scripts**, no skips/failures, exit 0 outside the sandbox for Windows link fixtures. CI now invokes the collector after its fresh inventory; configuration is tested, but the remote job has not run. Missing root texts remain explicit gaps even though a successful collection command exits 0; do not treat that exit or `texts-collected-review-required` as G08 approval. Targeted local boundary review only; no independent/hosted review result for this collector.

Reproduce without overwriting the earlier output:

```powershell
pnpm licenses list --json > tmp/p00/licenses-for-notices-next.json
if ($LASTEXITCODE -ne 0) { throw 'License inventory failed' }
node scripts/collect-license-texts.mjs --inventory tmp/p00/licenses-for-notices-next.json --output tmp/p00/original-license-texts-next
if ($LASTEXITCODE -ne 0) { throw 'Original text collection failed' }
```

Use a new output directory each time. Inspect index scope/gaps and exact source files; this is a review draft, not material already included in a web/extension release. Historical compliance snapshots, release ZIPs, root-license assertions and NO_GO are unchanged.

## Local and Remote Visual Assets

Generated exact-path/SHA256/size inventory: `tmp/p00/asset-rights-inventory.json`, 24 current local image/icon files, SHA256 `aee1bed6c11224f432dcd2baa659836b20154f04d0e0a4ed8abaabd02bba0517`. No origin, creator or usage permission is inferred from presence, names, root license, similarity or a generated-looking image.

| Asset group | Files in current repository | Rights evidence required |
| --- | --- | --- |
| Brand logo | Web/pitch `sigil-logo.png`, web `images/sigil-logo.png`, attached original | Creator/source, license or applicable generated-image terms, rights to any input material; derived variants traced. Identical SHA on pitch/web/original proves duplication, not ownership. |
| Icons/favicon | Four extension PNG sizes; web/pitch `favicon.svg` | Creator/source and redistribution rights for original plus derivatives. |
| Hero/OpenGraph | Web `images/hero-bg.png`, pitch `hero-bg.png`, web `opengraph.jpg` | Source/creator/tool and applicable publication rights; both hero files differ. |
| Pitch thumbnails | Ten `.slide-thumbnails/*.jpg` files | Underlying slide/image sources and publication rights, including third-party marks if applicable. |
| Attached reference screenshot | `attached_assets/Screenshot_2026-03-29_135214_1774785198850.jpg` | Establish whether retained as private reference or distributed; source and any applicable permission. |
| Remote fonts | Google Fonts Inter, JetBrains Mono, Space Grotesk referenced in web HTML/CSS | Font-license/attribution evidence and external-request privacy review; not included in local image inventory. |

Operator questions sent asynchronously: asset origin/rights and whether Replit is still used. No answer has been assumed. No asset removal, hosting upgrade, paid-provider activation, commit, push or deployment performed.
