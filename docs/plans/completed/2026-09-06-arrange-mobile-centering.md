---
title: Center mobile Arrange cards in the remaining screen height
status: completed
created: 2026-09-06
---

# Goal

Keep the compact mobile heading and number, grow the deck area to fill remaining height, and center cards vertically in that area as requested during local review.

# Implementation

Use the existing grid with a flexible final row and a 12.5rem minimum for card clearance. Center cards with the independent CSS translate property so hover, drag, and shuffle transforms retain their existing behavior. Update mobile browser regressions to assert vertical centering and available-height use instead of a fixed number-to-card gap.

# Verification

Formatting/lint and typecheck passed. All 48 Chromium browser tests passed, covering layout, drag, momentum, shuffle, and reduced motion. Centering and full-height use verified with first and last deck numbers at 320 x 568 and 390 x 844; screenshot visually reviewed at 390 x 844. No architectural change or performance claim. Changes remain local for user review.
