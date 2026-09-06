---
title: Fix /how horizontal overflow on mobile
status: completed
created: 2026-08-30
updated: 2026-09-06
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

- [x] Identify the exact overflowing elements (stepper controls vs. table) in devtools.
- [x] Apply scoped CSS fix.
- [x] Add mobile-overflow e2e spec; run quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

None yet.

# Deviations

- Browser inspection disproved the original control/table diagnosis: controls already wrap. The long deck-count text forced intrinsic grid sizing. The fix makes the /how grid shrinkable and permits long text to wrap.
- The user expanded this slice to include Arrange mobile vertical spacing. No architectural change was needed.

# Verification Evidence

- `vp check`: all 116 files formatted; no lint warnings or errors.
- `pnpm typecheck`: passed.
- `pnpm test`: 157 tests across 13 files passed.
- `pnpm build`: passed.
- `pnpm test:e2e`: all 48 Chromium tests passed, including eight new mobile layout cases.
- Browser screenshots visually reviewed at 320 x 568: /how stepper controls and content remain readable; Arrange shows the complete card height with the longest deck number.
- Before: /how document width was 731 px at both 320 and 390 px. After: document width matches each viewport. Arrange number-to-card gap is about 42 px; both initial and longest deck numbers fit without page scrolling at 320 x 568 and 390 x 844.

# Outcome

/how fits narrow viewports and its steppers work. Arrange uses compact mobile spacing, instructions above its buttons, and a bounded spread row with room for card lift animations. Desktop Arrange layout is unchanged. The plan is verified and complete.

# Related Commits

Pending.

## 2026-09-06 investigation

- Chromium at 320 and 390 px reproduces a 731 px document width. The full deck-count text forces intrinsic grid sizing; controls already use flex-wrap. Apply a shrinkable /how grid and allow long text to wrap.
- User added Arrange mobile spacing to this slice. At 390 px the stretched spread places cards about 288 px below the number. At 320 px the instructions shrink beside the buttons and push cards below the viewport. Use a content-aligned mobile grid with a 12.5rem spread row and a full-width instruction line above the buttons.
- Add browser regressions for both routes, long deck numbers, and stepper interaction; run all quality gates and the full e2e suite.
