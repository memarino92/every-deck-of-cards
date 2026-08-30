---
title: Fix explorer dead end above the last deck
status: completed
created: 2026-08-29
updated: 2026-08-29
owners:
  - human
  - opencode
---

# Goal

Make it possible to scroll the explorer all the way to deck `52!` and back out. Today scrolling stalls short of the end; scrolling up from the end also sticks.

# Outcome

Fixed and verified end to end. Both `e2e/explorer-end.spec.ts` tests pass: jumping to the last deck via the search box renders it, and scrolling down reaches it / scrolling up escapes. Manual browser check confirmed the last reachable deck is now `…000000` (52!), not `…988`.

# Actual root cause (verified in a real browser via Playwright)

The first session's "deadband freezes the anchor ~1449 decks short" framing was **wrong**. Instrumenting the live browser (a temporary `__explorerDebug` hook in `handleScroll`) showed the anchor advancing on essentially every wheel tick — it was never frozen mid-space. There were **two distinct bugs**:

## Bug 1 — boundary pinning (the "12 decks short" dead end)

`clampAnchor` capped the anchor at `maxAnchor = LAST_INDEX - (physicalRowCount - 1)` (= `LAST_INDEX - 23`), so the anchor could never name the last deck. Then `windowStart` subtracted `halfWindow` (12) from that clamped anchor, so the final window ended at `LAST_INDEX - 12` — exactly the `…988` the user hit. The last 12 decks were unreachable no matter how long you scrolled. The start of the space did not have this problem because `windowStart` clamps to `0` there, letting the anchor ride at the window's top edge; the end was not symmetric.

**Fix:** let the anchor range over the full `[0, LAST_INDEX]` (so it can be the last deck), and make `windowStart` clamp the _window_ into `[0, maxStart]`. Now `windowStart(LAST_INDEX) = maxStart`, so the final window covers exactly the last `physicalRowCount` decks. This alone made the last deck reachable by jump and removed the hard 12-short dead zone.

## Bug 2 — the crawl (scroll throughput)

The overscan **deadband** in `recenteredAnchor` ("don't recenter until the viewport drifts `> overscan` rows from window center") interacted with the browser clamping `scrollTop` at the content boundary: each wheel gesture pushed `scrollRow` toward the boundary, the browser clamped it, and the window re-anchored by only ~3 rows per tick. Reaching the end from a few thousand decks out needed hundreds of ticks, so the 60-tick regression test appeared frozen even though it was merely slow.

**Fix:** remove the deadband. `recenteredAnchor` now moves the anchor to the logical row under the viewport's center on _every_ scroll event, so the window chases the viewport instead of lagging. This is monotone (no oscillation) and made per-tick advance continuous in both directions.

# Changes

- `src/virtualization/window.ts`
  - `clampAnchor` clamps to `[0, LAST_INDEX]` (anchor may be the last deck) and no longer takes a `geometry` argument.
  - `windowStart` clamps the window into `[0, maxStart]`, pinning the final window so its last row is the last deck.
  - `recenteredAnchor` drops the deadband; anchors to the viewport-centered row each event.
  - Removed the now-unused `WindowGeometry.overscan` field and its validation; `createWindowGeometry(physicalRowCount)` takes one argument.
- `src/virtualization/window.test.ts` — updated to the new contract (anchor reaches `LAST_INDEX`; window pins at both ends; chase behavior; last deck is the final row of the pinned end window; overscan validation removed). All 129 vitest tests pass.
- `e2e/explorer-end.spec.ts` — added a search-box acceptance test (type the last deck number, see it on screen) and tuned the scroll test to start ~120 decks out with a realistic attempt budget and an escape threshold that proves the window retreats from the pinned end window.
- `docs/decisions/0008-verify-emergent-scroll-behavior-end-to-end.md` — new decision record for the Playwright e2e harness.
- `e2e/zz-debug.spec.ts` (instrumented probe) and the temporary `__explorerDebug` hook were removed after verification.

# Notes / follow-ups

- The scroll e2e is the oracle for emergent scroll behavior; do not replace it with pure-math simulation.
- `test-results/` and `playwright-report/` are gitignored Playwright output.

# Verification

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (129/129), `pnpm build` — all pass.
- `pnpm test:e2e` — both explorer end-of-space specs pass (jump + scroll down + escape up).
- Manual browser check: last reachable deck is `…000000` (52!).
