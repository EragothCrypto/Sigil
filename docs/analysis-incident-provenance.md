# Historical Incident Provenance

Reviewed: 2026-09-30. Scope: section 1 of
`docs/superpowers/specs/2026-09-30-analysis-quality-six-step-design.md`.
The catalog is offline and is not a destination registry. The implementation worktree now integrates exact lookup into findings-v2; deployment and live validation remain separate gates.

## Primary Publication Verification

[Euler Labs' official publication](https://www.euler.finance/blog/war-peace-behind-the-scenes-of-eulers-240m-exploit-recovery)
is dated January 10, 2024. Its title and general incident narrative alone are
insufficient evidence for any transaction. The actual hyperlinks were inspected
in the rendered official page on the review date, including their complete hrefs
and surrounding statements. The three linked Ethereum explorer pages were then
read independently in the browser, without signing in or using an API key.

Web-tool explorer opens returned errors/403s; browser access succeeded. Explorer
search results were discovery aids, not substitutes for this direct review.
An attempted Omniscia publication open failed and is not used as evidence.
No third-party incident list or explorer address label establishes a role here.

## Exact Reviewed Entries

All entries use `network: mainnet` (Ethereum chain ID 1). Dates describe the
individual transaction in UTC, not the publication date or the whole incident.

| Hash / Source-Linked On-Chain Evidence | Role | Verified Transaction Identity |
| --- | --- | --- |
| [0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d](https://etherscan.io/tx/0xc310a0affe2169d1f6feec1c63dbc7f7c62a887fa48795d327d4d2da2d6b111d) | `exploit_execution` | Success; block 16817996; 2023-03-13 08:50:59 UTC |
| [0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17](https://etherscan.io/tx/0xbe21a9719a4f89f7dc98419f60b247d69780b569cd8869c0031aae000f98cf17) | `victim` | Success; block 16833383; 2023-03-15 12:46:47 UTC |
| [0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f](https://etherscan.io/tx/0xb0308ee113c541e7c6f4623e833417524d68fd6267d23f43d9041f583c14343f) | `recovery` | Success; block 16905269; 2023-03-25 15:08:23 UTC |

The publication's **The exploit in real-time** section directly links the first
row as the first execution removing approximately $8.8M. The explorer independently
shows the exact sender `0x5f259d0b76665c337c6104145894f4d1d2758b8c`, destination
`0xebc29199c817dc47ba12e3f86102564d640cbf99`, and DAI transfers including a
30,000,000 loan and 30,027,000 repayment. This is a transaction-specific attribution,
not merely an inference from the destination's label. It is not an attribution of
the entire incident loss to this transaction or proof of the sender's intent.

The publication's **Community messages** section links the second row as an
affected user's plea. The explorer displays its matching message, zero ETH,
sender `0x2af24e5575045a582d9c53febd48724473e67407`, and recipient
`0xb66cd966670d962c227b3eaba30a872dbfb995db`. The victim role describes communication,
not proof that this transaction incurred a loss or that its claimed deposit size
was independently established.

The publication's **March 25th** section links the third row as a funds return.
The explorer confirms 51,000 ETH from `0xb66cd966670d962c227b3eaba30a872dbfb995db`
to `0xee009faf00cf54c1b4387829af7a8dc5f0c8c8c5`. This return is not exploit execution.

## Catalog Contract And Limits

- `lookupIncident(hash, network)` returns a typed, deeply frozen entry or `undefined`.
  Hex letter case is equivalent; no trimming, chain aliases, prefixes, fuzzy hash
  matching, destination matching, or cross-chain inheritance is allowed.
- Entries expose `name`, `date`, `role`, `sources[{url,title,claim}]`, `reviewedAt`,
  `network`, and `hash`. No score, live acquisition, model, database, or account is used.
- The validator caps the catalog at three entries, sources at four per entry,
  names at 160 characters, titles at 200, claims at 600, and URLs at 2048.
  It checks exact fields, roles, valid calendar dates, review chronology, unique
  chain/hash identities, and absolute HTTP(S) links without credentials,
  whitespace, backslashes, or control characters. Current entries are HTTPS.
- Validation checks structure and link safety, not truth or incident semantics.
  Source review must establish each role before adding an entry. The validator
  does not ingest URLs, perform network requests, or accept caller catalog entries
  into lookup. Future UI rendering must treat claims as plain text.
- `victim`, `recovery`, and `association` are historical observations, not execution
  findings. Unknown hashes return `undefined`; this does not mean the transaction
  is safe. No entry asserts current exploitability or loss by the analyzing user.

## Benchmark Gate

The exact requested Euler hash and execution role are **confirmed**, so there is
no unresolved attribution blocker for that catalog entry. No unconfirmed entry
has been admitted. If source review cannot establish a future exact hash/chain/role,
record it here as **unconfirmed and excluded**, with an explicit **benchmark
blocker**, never an accepted risk or fabricated role. Do not borrow another
transaction's proof to satisfy a desired benchmark.

The 2026-10-07 implementation worktree integrates exact matches into findings-v2,
both analysis routes and source-linked report rendering. Reviewed
`exploit_execution` matches receive the generic historical-risk floor of 80,
with visible provenance and a mandatory finding. Victim, recovery and association
matches do not receive that floor. Deployment and a fresh operator live report
benchmark remain pending; this is not a claim that production now scores 80.

## Verification

Test-first run: all seven tests failed with the API/catalog absent, including the
explicit assertion that the lookup export was missing. After implementation the
same seven tests passed. Coverage includes wrong chains, near/malformed hashes,
destination-only inputs, case equivalence, victim/recovery role preservation,
association validation, unsafe URLs, bounded metadata, invalid dates, duplicate
identities, forbidden score fields, deep immutability, and offline lookup.

```powershell
node --disable-warning=ExperimentalWarning --test artifacts/api-server/src/routes/sigil/incident-catalog.test.cjs
```

These deterministic tests check the curated snapshot and contract, not source
availability, a live provider trace, current exploit detection, or integrated
benchmark scoring. No paid API, inference call, production mutation, or account
was required.

Final focused regression run: **39/39 passed**, covering the catalog,
`transaction-evidence.test.cjs`, `validated-findings.test.cjs`, and
`validated-pipeline.test.cjs`. Standalone strict TypeScript checking passed with
`--noEmit --strict --skipLibCheck --target es2022 --module nodenext --lib es2022,dom`
and an empty type-root path to avoid unavailable workspace Node typings.

The broad `sigil/*.test.cjs` run was **not green**: it encountered missing
`viem`/TypeScript dependencies and failures in concurrent execution/simulation
workstreams. Other files changed during this task; they were not edited or
reverted here. The focused result is not a claim that the whole workspace passes.
