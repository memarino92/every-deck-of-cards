---
title: Fix /how horizontal overflow on mobile
status: active
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Make `/how` fit a 320–390 px viewport with no horizontal overflow, matching how `/why` already behaves.

# Non-Goals

- Reworking the stepper or table components' desktop design or pedagogy.
- Touching `/why` (already fine).

# Context

- `/how` and `/why` share the `.why` column (`width: min(100%, 44rem)`), and `/why` looks good on mobile — so the overflow on `/how` must come from its unique content: `UnrankStepper`'s control row (`input` with fixed `6.5rem` width plus buttons in a non-wrapping context) and `PermutationTable`'s fixed max-width monospace rows don't shrink below content width.
- Fix is scoped to those components' mobile CSS: wrap controls, let the table scroll horizontally inside its container or shrink type/padding.

# Dependencies

None.

# Proposed Changes

- `styles.css` (and only it, if possible): make `.stepper-controls` wrap cleanly at narrow widths; give `.permutation-table` a `max-width: 100%` overflow strategy (`overflow-x: auto` on a wrapper, or smaller padding/font under a media query).
- Verify no horizontal scrollbar on `/how` at 320 px and 390 px; desktop rendering unchanged.

# Test Plan

- Playwright: viewport-scaled spec asserting `document.documentElement.scrollWidth <= innerWidth` on `/how` at 320 px and 390 px (and `/why` as a control).
- Manual spot-check of the stepper interaction at mobile width.

# Benchmark Plan

None.

# Security Considerations

None.

# Documentation Changes

None.

# Tasks

- [ ] Identify the exact overflowing elements (stepper controls vs. table) in devtools.
- [ ] Apply scoped CSS fix.
- [ ] Add mobile-overflow e2e spec; run quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

None yet.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
