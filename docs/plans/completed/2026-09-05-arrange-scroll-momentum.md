---
title: Arrange horizontal scroll momentum
status: completed
created: 2026-09-05
updated: 2026-09-05
owners:
  - human
  - opencode
---

# Goal

Continue a quick single-touch pan of the Arrange spread after release so its
horizontal interaction has the same natural deceleration as the explorer.

# Non-Goals

- Changing card ordering, long-press timing, drag insertion, or URL semantics.
- Redesigning the narrow-screen spread.
- Adding a drag, scrolling, or motion dependency.

# Context

Arrange sets `touch-action: none` on card buttons to arbitrate tap, panning, and
long-press drag itself. Its manual `scrollLeft` updates therefore cannot inherit
native touch momentum. Decision 0013 records inertia as deferred work.

# Dependencies

- The shipped Arrange pointer interaction and decision 0013.
- The explorer momentum behavior implemented on this feature branch.

# Proposed Changes

- Sample recent horizontal pointer movement during the existing pan session.
- Continue `scrollLeft` with bounded, time-based exponential decay after a
  quick release.
- Cancel continuation for new input and other Arrange actions, stop at native
  horizontal bounds, and suppress it for reduced motion.

# Test Plan

- Playwright: prove post-release continuation, cancellation, reduced motion,
  and both horizontal bounds using trusted touch input.
- Preserve the existing touch long-press drag and direct-pan coverage.
- Run all repository quality gates and the complete Playwright suite.

# Benchmark Plan

- Make no input-latency or frame-rate claim. The bounded frame loop receives a
  performance-focused review; a reproducible browser trace is required before
  any broader performance claim.

# Security Considerations

- No dependencies, remote assets, environment variables, or credentials.

# Documentation Changes

- Update decision 0013, the Arrange architecture summary, and stale shipped
  documentation that still calls momentum deferred.

# Tasks

- [x] Implement bounded horizontal momentum and deterministic cancellation.
- [x] Add browser coverage for continuation, reduced motion, and bounds.
- [x] Update durable documentation.
- [x] Run all verification gates and record evidence.

# Decisions Made

- Keep momentum in the Arrange rendering/input boundary; native `scrollLeft`
  remains the position and bounds authority.

# Deviations

- Velocity uses only actual pointer samples still inside the recent window. A
  real pointer-down sample supports quick one-move delivery but naturally
  expires during a hold, avoiding invented velocity at the long-press slop
  boundary.

# Verification Evidence

- `vp check`: all 115 files formatted; no lint warnings or errors in 54 files.
- `pnpm typecheck`: clean.
- `vp test run`: 157 tests passed across 13 files.
- `vp build`: client and server bundles built successfully.
- `pnpm test:e2e`: 40 Chromium tests passed, including five dedicated Arrange
  momentum scenarios and the existing long-press/direct-pan regression.
- Performance-focused review found no remaining actionable lifecycle, cadence,
  bounds, rendering-cost, test, or documentation issue. Physical-device and
  non-Chromium pointer cadence remains a residual platform risk.

# Outcome

Quick horizontal touch pans now continue after release with bounded exponential
decay. New pointer or wheel input, shuffle/reset/selection/history actions, and
component teardown cancel the frame loop. Reduced motion stays one-to-one,
native `scrollLeft` retains exact bound authority, and card ordering remains
unchanged during panning.

# Related Commits

- The Arrange momentum follow-up commit that contains this completed plan.
