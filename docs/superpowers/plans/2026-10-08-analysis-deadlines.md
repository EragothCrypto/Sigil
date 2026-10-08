# Analysis Deadline Implementation Plan

**Approved scope:** Operator approved bounded analysis lifetime, AI cancellation, no fallback after timeout, stage diagnostics and a fail-closed error before the Vercel runtime limit.

**Design:** Streaming requests have a 120-second application deadline including schema, acquisition, AI and save. Validated AI selection has a shared 60-second deadline across its calls and stream fallback; SDK retries disabled for these calls. Caller disconnect cancels AI. Promise waiting is deadline-aware even if a dependency ignores cancellation. SQL work already submitted cannot be claimed cancelled; late completion must not emit success or populate the verdict cache. Existing evidence validation is unchanged.

- [x] Add failing tests for deadlines, ignored cancellation, no timeout fallback and no result event after expiry.
- [x] Implement shared deadline utility and apply it to AI and streaming lifecycle with stage logging. SDK timeout errors are normalized in either phase; no SDK retries and no fallback after timeout.
- [x] Verify tests, typechecks, API build/smoke and independently review scoped change. Final: 275 affected tests pass. Reviewer blocker on real SDK timeout class reproduced and fixed; follow-up review approved with 27 scoped tests.
- [x] Update QA and prepare publication; exact commit/synchronization result recorded in the project phase after push. Overall compliance NO_GO and live success remain unconfirmed.
- [ ] Retest Scanner / Ethereum Mainnet `0x431294ff0238c1b66a8e85bf08210825606cbf3bde284345ed2a02cf950145ac`; expect a complete validated result or explicit deadline error, not a five-minute stream termination.
