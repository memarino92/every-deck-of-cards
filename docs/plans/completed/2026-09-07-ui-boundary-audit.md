---
title: UI duplication and boundary audit
status: completed
created: 2026-09-07
updated: 2026-09-07
owners:
  - human
  - codex
---

# Goal

Audit the UI for duplicated implementations, leaking responsibilities, and opportunities to compose pages from discrete components and logical modules.

# Scope

Inspect route components, shared presentation, styles, domain/worker/virtualization boundaries, relevant architecture decisions, and existing verification. Produce prioritized findings with source references and an incremental extraction proposal. Implementation is outside this audit.

# Tasks

- [x] Inspect the worktree and project guidance; baseline is clean at `58ae999`.
- [x] Trace responsibilities and duplication across the UI and adjacent modules.
- [x] Check findings against decisions and existing test coverage.
- [x] Record findings, proposed boundaries, and verification in an audit report.
- [x] Verify documentation and complete this audit plan.

# Discoveries

- Explorer and Arrange concentrate state, browser input, motion, URL handling, and rendering in route modules.
- Momentum implementations share constants and integration logic; deck-query parsing is shared from the virtualization directory.
- Chromium confirms controlled-stepper input and replay defects, Talk keyboard interception, incorrect factorial notation, missing keyboard table selection, CSS specificity leakage, and missing worker-error presentation.
- Shared presentation and pure domain/virtualization modules already have useful boundaries; unnecessary component fragmentation should be avoided.

# Decisions Made

- Audit findings will distinguish logical/module extractions from rendering components; a shorter page file alone is not the objective.
- Proposed boundaries are recommendations, not adopted architectural decisions; no new decision record is warranted until implementation is selected.

# Deviations

- The fallback pnpm runner attempted dependency maintenance and aborted. The installed local Vite+ CLI served the application successfully; the newly created local store was removed and no dependency or lockfile changes were retained.
- Chromium's initial sandbox launch returned EPERM; targeted probes succeeded through approved execution outside the sandbox.

# Verification Evidence

- Initial `git status --short` is empty. Recent history and architecture guidance inspected.
- No application code changed and no commit, push, or deployment requested.
- Source references were checked against the audited revision and relevant architecture decisions/test coverage.
- Targeted installed Playwright/Chromium probes verified the concrete findings; the worker failure was deliberately injected.
- Audit documents formatted with the installed Vite+ formatter. Full application gates are reserved for implementation; no application behavior was changed.
- The local audit dev server was stopped after verification.

# Outcome

Completed [the UI boundary audit](../../audits/2026-09-07-ui-boundaries.md), including ten prioritized structural findings, additional shared-example correctness findings, proposed component/logical owners, incremental implementation order, and verification limits. Recommendations remain proposals for subsequent work.

# Related Commits

None; audit only.
