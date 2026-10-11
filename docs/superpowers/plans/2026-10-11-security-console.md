# Sigil Security Console Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Kevin explicitly approved implementation; do not add another design approval delay.

**Goal:** Make Sigil's main checks and reports a coherent, decision-first security console without changing security behavior.

**Architecture:** Existing React/Wouter routes, existing report validators and action helpers. Scoped presentation changes with native accessible disclosures; shared tokens retain component compatibility.

**Tech Stack:** Existing React, Tailwind, Wouter, Lucide; no dependencies added.

## Tasks

- [ ] Review spec/plan against approved brief, checking release and data boundaries.
- [ ] Add failing frontend regression tests for task navigation, immediate main entry, example labels and progressive evidence disclosure. Run with `node --test artifacts/sigil/console-ui.test.cjs`.
- [ ] Update `artifacts/sigil/src/pages/home.tsx`: preserve stream handler, render compact task-first scanner, prominent wallet-permission entry and secondary tool links; replace marketing sections and emoji toast copy. Worker owns only home and home-specific test changes.
- [ ] Update `artifacts/sigil/src/components/sigil/AnalysisResultView.tsx`, `ShareButton.tsx` and `pages/analysis.tsx`: preserve validators and thresholds, flatten verdict/summary, subordinate share/scores, full input accessible, all recorded evidence retained. Worker owns only these components and EVM presentation tests.
- [ ] Update `artifacts/sigil/src/index.css`, `components/layout/Layout.tsx`, `pages/solana-monitor.tsx`: opaque graphite, purposeful focus/hover, named task nav, contextual cluster choices, clear report action/explanation/evidence hierarchy, explicit examples and coverage states. Parent owns these files.
- [ ] Run focused tests after each slice. Fix regressions without weakening safety assertions. Run `pnpm test:baseline`, `pnpm typecheck`, `pnpm -r --if-present run build` and existing built-wrapper/security gates applicable to frontend changes.
- [ ] Start local server on a free port, inspect before/after desktop/mobile screenshots using in-app browser; test all six synthetic examples, malformed input, keyboard disclosures, nav, EVM saved report and overflow/contrast. Synthetic examples must not make provider calls or claim actual exposure.
- [ ] Independent scoped code review for unchanged trust boundaries and UX regressions, resolve blockers.
- [ ] Update Colosseum roadmap/quality ledger with shipped scope, 20-pattern review, exact verification and residual issues. Commit/push and verify CI plus jury Preview only. Production remains untouched.
