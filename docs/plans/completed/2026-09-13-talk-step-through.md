---
title: Presenter steps and four-card algorithm debugger
status: completed
created: 2026-09-13
---

# Goal

Build a dependency-free slide/step layer and exercise it with unranking indices
0 and 14, followed by ranking [4, 3, 2, A] to index 23. Preserve existing talk
content. Code, watched values, and fixed card trays must describe the same step.

# Decisions and discoveries

- The worktree was clean. Work is on `feat/talk-step-through`.
- Interpret #14 as zero-based index 14; visibly distinguish indices from public deck numbers.
- Existing unrank traces are pure and tested. Add equivalent rank tracing.
- Steps are complete snapshots, not mutations replayed from the beginning.
- Visuals are ordinary Solid components. Persistent card elements move between
  fixed slots with native Web Animations; no scene framework or timeline engine.
- Source holes remain empty. Remaining-pool indices update without compacting
  the visual slots. Ranking consumes the given permutation into a processed tray.

# Work

- [x] Add step navigation and reusable step-slide authoring.
- [x] Add trace-backed debugger frames, highlighted code, watches, and card trays.
- [x] Verify backward navigation, interruption, restart, and reduced motion in Chromium.
- [x] Run formatting, lint, typecheck, unit tests, build, and the complete e2e suite.
- [x] Record the decision and verification, then complete this plan.

# Verification

- `vp check`: formatting and lint passed without warnings.
- `pnpm typecheck`: passed.
- `pnpm test`: 174 tests passed across 21 files.
- `pnpm build`: passed; presentation remains lazy-loaded and client rendered.
- Desktop (1280×720) and mobile (390px wide) screenshots visually inspected.
  The desktop walkthrough fits without page scrolling.
- Solid 2 requires a tracked compute phase for per-step motion and returned
  cleanup from `onSettled`. The browser tests exposed both lifecycle concerns;
  they are fixed, and the preview has no reactive diagnostics.
- Slot geometry assertions compare relative to the tray surface so normal page
  scrolling cannot masquerade as card-slot movement.
- `pnpm test:e2e`: all 66 Chromium tests passed, including all five new
  presentation tests and existing lazy-route, embedded-control, Arrange,
  explorer, and mobile-layout tests.

# Outcome

Slides 5–7 now contain the requested demonstrations. Reusable step authoring and
native layout transitions are documented in `docs/presentation.md` and decision 0017. No dependencies were added. Changes remain uncommitted on the feature
branch. Full-talk storyboarding remains in the earlier talk-motion plan.

## Final presentation refinements

- Split history into locally attributed Laisant and Lehmer portrait slides.
- Show actual card arrangements beside the two- and three-card tables.
- Remove the five-card slide and compact remaining cards into fixed index slots,
  superseding the original empty-hole behavior above.
- Final formatting/lint, TypeScript, 176 unit tests, and production build passed.
- The user requested opening a PR and leaving browser verification to CI. The
  latest full Chromium run was stopped after 22 passing tests; earlier focused
  presentation runs passed before the final compaction change.
