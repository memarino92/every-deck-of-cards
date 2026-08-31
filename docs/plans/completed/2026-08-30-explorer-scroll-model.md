---
title: Explorer page-scroll model and fling-scroll fix
status: completed
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Replace the explorer's nested scroll pane with a page-scale feed and remove the recenter-on-input wall, so wheel sequences advance the logical position directly and the scrollbar can navigate end-to-end.

# Non-Goals

- Moving the explorer to `/` and the chrome redesign (separate plan: `2026-08-30-explorer-first-home.md`) — the scroll model is correct wherever the explorer lives; the two plans are independent and whichever lands second rebases.
- Domain changes: permutation math, worker batching, and the `?deck=` contract are unchanged (decision 0009 supersedes decision 0007's complete anchor/window/recentering virtualization model).

# Context

- Today `.explorer-scroll` is a nested `overflow-y: auto` pane holding `PHYSICAL_ROWS = 24` rows. Every scroll event recenters a `bigint` anchor, shifts `scrollTop`, rebuilds rows, and issues another worker request; fast wheel sequences lag behind this repeated churn.
- The nested pane also produces the "window in a window" feel: the page itself never scrolls.
- Design reference — everyuuid.com (mutable production bundle observed 2026-08-30): apparent `bigint` virtual-position state, a percent-mapped custom rail, and requestAnimationFrame jump interpolation. This motivated the prototype but is not durable implementation evidence.
- The choice between (a) virtual position + custom rail and (b) native page scroll + recentering window is governed by decision 0009 and made with a reproducible comparison during this plan.
- Emergent scroll behavior is verified end-to-end per decision 0008 — Playwright is the oracle; no pure-TypeScript scroll simulation.

# Dependencies

- Decision 0009 — accepted with this plan; comparison evidence attached.

# Proposed Changes

- Prototype both approaches from decision 0009 far enough to compare fling behavior and scrollbar-grab behavior; record the measurements and pick one.
- Implement the winner as either native page content or a full-viewport virtual feed, keeping exact `bigint` addressability.
- Animated navigation for Jump/Random/Go-to-start/end: rAF interpolation to the requested position (the final deck pins visibly to the bottom row); `prefers-reduced-motion` jumps instantly; any new interaction cancels a running animation deterministically.
- Data-path tuning as needed (window size, overscan, prefetch ahead of fling velocity), without coupling logical position updates to worker completion.

# Test Plan

- Pure window/position math stays unit-tested (`src/virtualization/`), extended for whatever model wins.
- Playwright: scripted fling (mouse wheel / CDP input) asserting the anchor keeps up and rows resolve; scrollbar-drag-to-end asserting the last deck is reachable; existing end-of-space specs keep passing; animated-jump specs cover exact landing, reduced-motion instant path, and mid-animation cancellation.

# Benchmark Plan

- Before/after observational capture of the same awaited Playwright wheel sequence. Functional e2e assertions are the hard gate; no generalized timing claim is made without controlled benchmark repetitions.

# Security Considerations

- No new runtime dependencies; the custom scrollbar is dependency-free.

# Documentation Changes

- Decision 0009 marked accepted with the comparison evidence attached; decision 0007's status and historical virtualization section point to 0009.
- `docs/architecture.md` updated: the virtualization boundary now describes the virtual-position model.

# Tasks

- [x] Prototype and compare both scroll models; record measurements in decision 0009. (See Deviations.)
- [x] Implement the chosen model as a full-viewport virtual feed: `src/virtualization/position.ts` (pure `FeedPosition` math) + `src/ExplorerPage.tsx` rewrite; `src/virtualization/window.ts` removed.
- [x] Implement rAF animated navigation with reduced-motion and cancellation (300ms ease-in-out cubic; `data-animating` exposes animation state).
- [x] Tune overscan and worker backpressure against wheel input — overscan is 8 rows; the worker yields between chunks, stops stale work, and coalesces pending messages to one latest request.
- [x] Playwright fling and scrollbar-drag specs; existing scroll specs kept green (retargeted from `.explorer-scroll` to `.explorer-feed`).
- [x] Run all quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

- **Virtual position + custom rail** won over native page scroll + recentering window. The native scrollbar can only span the physical window, so it cannot meet the end-to-end navigation requirement; the functional wheel-sequence comparison also favored applying deltas directly.
- The position is `{ topIndex: bigint, offsetPx: number }` — the deck under the viewport's top edge plus a sub-row pixel offset — so wheel/trackpad input is lossless and deck numbers render synchronously during scroll.
- End-of-space semantics: the last deck pins to the bottom visible row (`maxTopIndex`); scrolling past the end is clamped there, never to void.
- The rail maps percent-of-space to an exact position at 1e9 fixed-point granularity; the thumb keeps the pointer's grab offset within its travel range so both extremes are exactly reachable.
- Direct input (wheel over the feed, keyboard, touch drag, rail drag) updates position without awaiting worker completion; only programmatic navigation animates.
- Card buffers are cached by deck index (bounded to the current strip) instead of physical window offset, so rows survive sub-row strip shifts and gentle scrolls don't refetch.

# Deviations

- **Approach comparison without a tuned-A prototype.** The shipped model represented approach A. Its bounded native scrollbar cannot satisfy end-to-end navigation regardless of tuning, so implementation effort went to the virtual-position prototype. The wheel harness remains observational rather than supporting a generalized timing claim.
- **No native page scrolling.** The result is a full-viewport virtual-position surface: both document and feed have native overflow disabled while the explorer is mounted. It occupies the page but does not use browser page-scroll mechanics.
- **Keyboard alternatives added** (arrows/PageUp/PageDown/Home/End on the focused feed): replacing the nested pane removed keyboard scrolling that native overflow gave for free. The rail itself is `aria-hidden`; no screen-reader scrollbar semantics are claimed.
- **Touch is a one-to-one drag without momentum.** Wheel/trackpad fling cadence is the tested fling path; touch momentum is future work.
- **`data-animating` test hook**: an observable attribute for "a jump animation is running", so the cancellation spec needs no timing guesses (protocol round-trips in a busy page can outlast the 300ms animation).
- **Solid 2 RC lifecycle discoveries** (decision 0010 line): `onSettled` is the mount-with-cleanup hook (the returned function fires on disposal); `createEffect` requires the `createEffect(compute, effectFn)` pair — there is no single-function form.
- The request effect keys on primitive `stripStart`/`stripCount` memos so sub-row (`offsetPx`-only) scrolls don't fire worker requests.

# Verification Evidence

- `vp check` (Oxfmt + Oxlint): clean.
- `pnpm typecheck` (`tsc --noEmit`): clean.
- `vp test run`: passing; `position.test.ts` covers position/fraction/interpolation/strip math, `ExplorerPage.ui.test.tsx` covers initial strip loading, and the superseded `window.test.ts` was removed with its module.
- `vp build`: clean.
- `pnpm test:e2e`: passing — visible end-of-space guards, exact wheel-sequence distance and eventual row resolution, rail drag to both visible ends, proportional mid-rail landing, jump landing, reduced motion, cancellation, resize re-clamping, modified-wheel preservation, and keyboard controls.
- `node e2e/fling-capture.mjs --project <worktree> --runs 5`: reproducible observational harness; reports raw repetitions plus revision/runtime/browser/OS/CPU. Results are diagnostic, not a generalized performance claim.

# Outcome

The explorer is a full-viewport virtual feed driven by a `bigint` position. Wheel deltas over the feed update logical position without awaiting worker completion; deck numbers derive immediately while the worker fills card faces. The custom rail navigates end-to-end, with the final deck visibly pinned to the bottom row. Jump, Random, and Go-to-start/end glide over 300ms, re-clamp through resizes, respect reduced motion, and cancel on new feed input. Decision 0009 and `docs/architecture.md` describe the resulting model without claiming native page scroll or generalized timing results.

# Related Commits

- `2b0fa32` — initial virtual-position implementation.
- Review-hardening follow-up — branch history before pull request.
