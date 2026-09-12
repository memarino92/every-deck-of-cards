---
title: Resolve the September Dependabot compatibility set
status: active
created: 2026-09-11
updated: 2026-09-11
owners:
  - human
  - codex
---

# Goal

Resolve the open Dependabot updates while preserving one compatible Solid 2 and Vite+ toolchain set.

# Context

PRs 34 and 35 passed CI and were merged. The other requests update related packages independently: Solid's runtime, renderer, router, Vite plugin, and Vite+ core. Their individual CI failures demonstrate version skew rather than an application regression.

# Proposed Changes

- Update the dependent Solid packages together.
- Update the Vite+ catalog alias with the Vite+ migration tool.
- Regenerate the lockfile and verify formatting, linting, types, unit tests, build, and browser tests.
- Close superseded Dependabot requests after a verified consolidated update is available.

# Decisions Made

- The RC.7 Solid runtime is pinned to its matching `@solidjs/signals` release
  until a separately reviewed upgrade advances the whole Solid line.

# Verification Evidence

- `pnpm test`: 18 files and 165 tests passed.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` passed.

# Outcome

The five blocked Dependabot updates are represented by one compatible,
verified working-tree update. Their remote pull requests remain open because
landing this consolidated change requires an explicit commit and push.
