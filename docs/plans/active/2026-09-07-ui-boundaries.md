---
title: Implement the UI boundary audit
status: active
created: 2026-09-07
updated: 2026-09-07
owners:
  - human
  - codex
---

# Goal

Implement the UI audit findings on `codex/ui-boundaries`, preserve the exact deck and interaction contracts, and open one PR against main with cohesive commits.

# Scope and sequence

1. Repair and share the interactive walkthroughs: explicit state ownership, replay, keyboard semantics, presentation navigation, and mathematical notation.
2. Separate Explorer presentation, exact position, browser input/measurement, worker row loading, and shared route/momentum adapters.
3. Separate Arrange editing transactions, spread geometry, gesture sessions, and shuffle animation; reuse the narrow shared adapters.
4. Establish shared geometry/styles and neutral article styling, document architectural ownership, and finish verification.

# Tasks

- [x] Inspect the clean application baseline and preserve the prior audit documents.
- [x] Create `codex/ui-boundaries` from main at `58ae999`.
- [x] Complete and verify the walkthrough changes.
- [ ] Complete and verify Explorer/data/shared adapter changes.
- [ ] Complete and verify Arrange changes.
- [ ] Complete shared CSS/geometry and architectural documentation.
- [ ] Run all quality gates and the full Playwright suite before commits.
- [ ] Review the complete diff and create cohesive Conventional Commits.
- [ ] Push the branch and open a PR against main.

# Decisions

- Keep the domain pure and all cross-space indices as bigint.
- Share momentum integration, not gesture arbitration or feature bounds.
- Keep URL commit timing in the feature coordinator.
- Keep selection state alive across Talk slide mounts where the current behavior does so.
- Use existing dependencies and native browser APIs; no generalized motion framework.

# Verification plan

Add focused behavior tests for walkthrough ownership/replay, keyboard controls, worker failures/retry/cancellation, query history, and extracted pure math. Preserve all existing browser interaction tests, adding targeted regressions for newly repaired contracts. Run Vite+ format/lint, TypeScript, unit tests, build, and Playwright before each implementation commit.

# Discoveries and deviations

- `.git` is read-only under the workspace sandbox; the requested branch was created through approved execution outside it.
- The audit's fallback pnpm runner attempted dependency maintenance. Prefer the installed Vite+ CLI and disable that runner behavior when invoking existing package scripts; preserve the lockfile.
- Port 5173 was occupied. Playwright now accepts `E2E_PORT` and starts its server with `--strictPort`; this run used 5182.

# Verification evidence

Walkthrough commit: Vite+ check passed, TypeScript passed, all 159 unit tests passed, production build passed, and all 54 Chromium browser tests passed (including two new walkthrough regressions). Query/table selection now shares one model, same-index replay resets progress, Talk retains embedded control keys and selection across navigation, and factorial notation is corrected.

# Related commits

Pending.
