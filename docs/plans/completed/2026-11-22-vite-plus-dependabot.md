---
title: Replace the Vite+ Dependabot update
status: completed
created: 2026-11-22
updated: 2026-11-22
---

# Goal

Replace the conflicting Vite+ 1.3.0 Dependabot update (#63) with a compatible upgrade from current main.

# Findings

- The bot updated Vite+ while the catalog still pinned its Vite alias to 1.0.0. CI reported incompatible Vite plugin types.
- Vite+ 1.7.0 supersedes 1.3.0 and declares vite-plus-core 8.3.8000. Align the two pins and refresh the pnpm lockfile.
- Closed #63 after confirming that its head conflicted with main and that 1.7.0 superseded its target.
- Squash-merged #57, #69, and #70 after verifying their GitHub Actions and Cloudflare checks.
- The November 20 npm Dependabot run hit the minimum release age for Solid 2.0.3.

# Verification

- Node 24.20.0 passed the frozen pnpm install, formatting and lint, typecheck, all 176 unit tests, and the production build.
- Chromium passed all 85 Playwright tests with the local Vite+ 1.7.0 dev server on Windows. The dev server logged Solid effect relay diagnostics during explorer tests.

# Outcome

The paired Vite+ upgrade and regenerated lockfile are based on main with all three GitHub Actions updates applied.
