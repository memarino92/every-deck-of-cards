---
title: Align How page with the revised talk
status: completed
created: 2026-09-13
---

# Goal

Replace the older interactive How-page examples with the revised talk's
progression: prose and complete tables for one, two, and three cards; an
auto-playing four-card unrank of index 14; an auto-playing rank of the reversed
four-card permutation to index 23; then the existing 52-card conclusion.

# Decisions and discoveries

- The worktree was clean on `main` before edits.
- Reuse the talk's trace-derived debugger frames and card layout rather than
  duplicating arithmetic or presentation state.
- Keep a pause/play control on each autoplay for accessibility. Autoplay only
  runs while its walkthrough is visible; reduced-motion visitors start paused
  and can opt in, while native card movement remains disabled by the existing
  reduced-motion boundary.
- Extend the shared small permutation table to the one-card base case.

# Work

- [x] Replace the How-page 2/3/4/5-card flow and remove its old stepper models.
- [x] Add the visible, pausable autoplay wrapper around computed debugger frames.
- [x] Adapt article layout and debugger styling for desktop and mobile embedding.
- [x] Update browser coverage for the new page structure and autoplay behavior.
- [x] Run focused checks, all quality gates, and the Chromium end-to-end suite.
- [x] Record verification and move this plan to completed.

# Verification

- `vp check`: formatting and lint passed without warnings.
- `tsc --noEmit`: passed.
- `vp test run`: 176 tests passed across 22 files.
- `vp build`: production client and server builds passed; the How page and
  debugger CSS remain lazy chunks.
- Focused How/mobile/boundary browser coverage: 23 tests passed.
- `playwright test`: all 85 Chromium tests passed.
- Full-page How screenshot inspected at 1280×900. Both expanded debugger panels
  align with the prose column and return to it cleanly; 320px and 390px browser
  checks confirm no horizontal page overflow.

# Outcome

The How page now follows the revised talk's progression. Complete one-, two-,
and three-card tables lead into trace-backed, viewport-aware autoplay demos for
unranking index 14 and ranking the reversed four-card permutation to index 23,
then into the existing 52-card conclusion. The former manual four- and five-card
widgets are no longer rendered.

## Card-table follow-up

- Added the talk's computed playing-card arrangements beside the numeric tables
  for the one-, two-, and three-card sections.
- Moved the arrangement-list styling beside its shared component so both How and
  Talk load it without coupling How to the full presentation stylesheet.
- The paired tables stack on narrow viewports. Per user direction, this follow-up
  received a static review only; tests were left to CI.
