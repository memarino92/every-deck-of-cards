---
title: Upgrade Vite+ and grouped dependencies
status: completed
created: 2026-09-30
updated: 2026-09-30
owners:
  - human
  - codex
---

# Goal

Upgrade the application to Vite+ 1.0, advance the Solid 2 RC dependency set,
and include the remaining compatible Dependabot updates.

# Context

The project currently uses Vite+ 0.3.1, Solid 2 RC.7 and Solid Vite plugin
next.40. Open remote refs include Solid RC.8, router next.24, Vite+ 0.3.2,
and a grouped development dependency update.

# Proposed Changes

- Run the official Vite+ 1.0 project migrator and preserve its config changes.
- Advance the Solid runtime, renderer, router and Vite plugin together.
- Include the grouped development dependency updates.
- Advance the setup-vp GitHub Action to the latest pending Dependabot pin.
- Regenerate the pnpm lockfile and resolve migration incompatibilities.

# Test Plan

- Run formatting, lint, typecheck, unit tests, and production build.
- Run browser tests if migration changes affect emergent browser behavior.

# Tasks

- [x] Migrate Vite+ and dependency versions.
- [x] Verify the complete quality gate.

# Decisions Made

- Keep project dependency management on pnpm and retain the existing workspace
  layout.

# Deviations

# Verification Evidence

- Vite+ 1.0.0 with Vite 8.3.1; Vitest 5.0.1.
- Solid runtime, renderer, router, and signals aligned to RC.11/next.31;
  Solid Vite plugin next.46.
- `voidzero-dev/setup-vp` advanced to the pending Dependabot SHA.
- `vp check`: formatting and lint passed.
- `tsc --noEmit`: passed.
- `vp test run`: 22 files and 176 tests passed.
- `vp test bench --run`: 2 files and 10 benchmarks passed.
- `vp build`: client and server bundles built successfully.

# Outcome

Upgraded Vite+ to 1.0 and consolidated the current Solid prerelease set with
the pending grouped Dependabot development updates. The Vitest 5 benchmark API
was migrated, and compatibility settings preserve the existing test behavior.
No commit was created.

# Related Commits
