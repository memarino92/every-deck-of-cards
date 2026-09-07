---
title: Tighten Explorer mobile spacing and group navigation actions
status: completed
created: 2026-09-07
---

# Goal

Reduce the mobile gaps below navigation and around the large deck count. Keep two rows of actions in reading order: Jump / Random, then Go to start / Go to end, across viewport sizes.

# Changes

Replace viewport-height hero padding and count/prose margins on mobile with consistent 1.5rem spacing. Group buttons in a two-column grid. Preserve the previously reviewed local Arrange centering changes.

# Verification

Use a 412 x 915 mobile viewport for the Pixel 8 review, plus existing mobile and desktop browser coverage. Verify spacing, button geometry/order, and the full browser suite because header dimensions affect the virtual scrolling surface. Passed: vp check, typecheck, and all 49 Chromium browser tests on the final run. A cancellation test failed once on the initial run, then passed three focused repetitions without code changes and the final full run. Visually reviewed at 412 x 915 with mobile/touch emulation. Browser regression confirms 24 px from nav to eyebrow and matching 24 px visible gaps above/below the count, plus ordered two-row button geometry. Changes remain local for user review.

## Medium-width follow-up

At the user's request, place the title and introductory description side by side above the existing 760 px mobile breakpoint. Vertically center the description; keep the eyebrow and count spanning both columns. Verified geometry at 768, 1024, and 1440 px, visually reviewed at 768 px, and preserved the stacked mobile layout. Formatting/lint and typecheck pass; all 52 browser tests pass. Changes remain local for review.

## Final spacing review

Removed the larger-screen hero minimum height and viewport-based padding. Nav-to-eyebrow spacing is now 24 px, matching eyebrow-to-title spacing; the count-to-Explorer boundary is tightened to 16 px across sizes. Visually reviewed at 1024 px. All 52 browser tests passed after tightening; after the final nav-gap adjustment, all 16 focused layout/home browser tests and format/lint checks passed.

## How and Why heading follow-up

Tighten the shared article padding and grid gaps to 24 px and remove the extra eyebrow margin. Visually reviewed both pages at 412 x 915; all 12 focused layout browser tests passed.

## Commit verification

Final combined visual-styling changes passed vp check, typecheck, all 157 unit tests, production build, and all 52 Chromium browser tests on 2026-09-07.
