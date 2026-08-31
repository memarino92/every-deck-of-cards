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

Replace the explorer's nested scroll pane with whole-page scrolling and eliminate the fling-scroll wall, so a fast fling — or grabbing the scrollbar and cranking it to the end — never stalls beyond what the worker data path allows.

# Non-Goals

- Moving the explorer to `/` and the chrome redesign (separate plan: `2026-08-30-explorer-first-home.md`) — the scroll model is correct wherever the explorer lives; the two plans are independent and whichever lands second rebases.
- Domain changes: permutation math, worker batching, and the `?deck=` contract are unchanged (decision 0007 stands except for its scroll container choice, superseded by decision 0009).

# Context

- Today `.explorer-scroll` is a nested `overflow-y: auto` pane holding `PHYSICAL_ROWS = 24` rows. Every scroll event recenters a `bigint` anchor and shifts `scrollTop` to compensate. A fast fling recenters many times per gesture, each recenter waiting on a worker round-trip, so the feed fills with "Shuffling…" and the gesture hits a wall.
- The nested pane also produces the "window in a window" feel: the page itself never scrolls.
- Reference implementation — everyuuid.com (bundle inspected 2026-08-30): virtualization over `2^122` UUIDs driven by a **`bigint` virtual position held in state**; a **custom scrollbar rail maps percent-of-space to position**, which is why grabbing the scrollbar and cranking it end-to-end works smoothly; programmatic jumps (search/random) **interpolate the virtual position with `requestAnimationFrame` over ~300 ms** rather than trusting native smooth scroll over an impossible scroll height. No virtualization library.
- The choice between (a) virtual position + custom rail and (b) native page scroll + recentering window is governed by decision 0009 and made with a reproducible comparison during this plan.
- Emergent scroll behavior is verified end-to-end per decision 0008 — Playwright is the oracle; no pure-TypeScript scroll simulation.

# Dependencies

- Decision 0009 — accepted with this plan; comparison evidence attached.

# Proposed Changes

- Prototype both approaches from decision 0009 far enough to compare fling behavior and scrollbar-grab behavior; record the measurements and pick one.
- Implement the winner: the deck feed becomes page content scrolled by the document (or a full-viewport scroller that is the page), with the anchor/virtual-position model keeping exact `bigint` addressability.
- Animated navigation for Jump/Random/Go-to-start/end: rAF interpolation of position landing exactly on the requested deck; `prefers-reduced-motion` jumps instantly; any new interaction cancels a running animation deterministically.
- Data-path tuning as needed (window size, overscan, prefetch ahead of fling velocity) so the worker pipeline is the only real limit.

# Test Plan

- Pure window/position math stays unit-tested (`src/virtualization/`), extended for whatever model wins.
- Playwright: scripted fling (mouse wheel / CDP input) asserting the anchor keeps up and rows resolve; scrollbar-drag-to-end asserting the last deck is reachable; existing end-of-space specs keep passing; animated-jump specs cover exact landing, reduced-motion instant path, and mid-animation cancellation.

# Benchmark Plan

- Before/after capture of the same fling input: "Shuffling…" dwell time and anchor lag. The e2e assertions are the hard gate; the capture documents the improvement claim per repo policy.

# Security Considerations

- No new runtime dependencies; the custom scrollbar is dependency-free.

# Documentation Changes

- Decision 0009 marked accepted with the comparison evidence attached; decision 0007's annotation already points to 0009.
- `docs/architecture.md` updated: the virtualization boundary now describes the virtual-position model.

# Tasks

- [x] Prototype and compare both scroll models; record measurements in decision 0009. (See Deviations.)
- [x] Implement the chosen model with page-level scroll: `src/virtualization/position.ts` (pure `FeedPosition` math) + `src/ExplorerPage.tsx` rewrite; `src/virtualization/window.ts` removed.
- [x] Implement rAF animated navigation with reduced-motion and cancellation (300ms ease-in-out cubic; `data-animating` exposes animation state).
- [x] Tune overscan/prefetch against fling input — overscan of 8 rows around the visible span sufficed; the existing supersession + worker early-cancel needed no changes (see Deviations).
- [x] Playwright fling and scrollbar-drag specs; existing scroll specs kept green (retargeted from `.explorer-scroll` to `.explorer-feed`).
- [x] Run all quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

- **Virtual position + custom rail** (the Every UUID model) won over native page scroll + recentering window. Native recentering was measured as shipped (the wall: 23.2s to deliver a 320ms fling) and cannot meet the end-to-end scrollbar requirement structurally — the native scrollbar only ever spans the physical window. Full rationale and numbers in decision 0009.
- The position is `{ topIndex: bigint, offsetPx: number }` — the deck under the viewport's top edge plus a sub-row pixel offset — so wheel/trackpad input is lossless and deck numbers render synchronously during scroll.
- End-of-space semantics: the last deck pins to the bottom visible row (`maxTopIndex`); scrolling past the end is clamped there, never to void.
- The rail maps percent-of-space to an exact position at 1e9 fixed-point granularity; the thumb keeps the pointer's grab offset within its travel range so both extremes are exactly reachable.
- Direct input (wheel, keyboard, touch drag, rail drag) is always instant; only programmatic navigation (Jump/Random/Go-to-start/end) animates.
- Card buffers are cached by deck index (bounded to the current strip) instead of physical window offset, so rows survive sub-row strip shifts and gentle scrolls don't refetch.

# Deviations

- **Approach comparison without a tuned-A prototype.** The plan contemplated tuning native scroll (larger margins, predictive prefetch) for the comparison. Instead the shipped model was measured as the approach-A representative: the measurement showed the wall is intrinsic to recenter-on-input (23,194ms to deliver 320ms of fling input), and no tuning of that model can satisfy the end-to-end scrollbar requirement, which is structural. Recorded in decision 0009's Evidence.
- **Keyboard scrolling added** (arrows/PageUp/PageDown/Home/End on the focused feed): replacing the nested pane removed the keyboard scrolling native scroll gave for free; this keeps the feed operable without a pointer. The rail itself is `aria-hidden`; accessible paths are the feed's keyboard support and the jump form.
- **Touch is a one-to-one drag without momentum.** Wheel/trackpad fling cadence is the tested fling path; touch momentum is future work.
- **`data-animating` test hook**: an observable attribute for "a jump animation is running", so the cancellation spec needs no timing guesses (protocol round-trips in a busy page can outlast the 300ms animation).
- **Solid 2 RC lifecycle discoveries** (decision 0010 line): `onSettled` is the mount-with-cleanup hook (the returned function fires on disposal); `createEffect` requires the `createEffect(compute, effectFn)` pair — there is no single-function form.
- The request effect keys on primitive `stripStart`/`stripCount` memos so sub-row (`offsetPx`-only) scrolls don't fire worker requests.

# Verification Evidence

- `vp check` (Oxfmt + Oxlint): clean.
- `pnpm typecheck` (`tsc --noEmit`): clean.
- `vp test run`: 141/141 passing (35 new `position.test.ts` tests; `ExplorerPage.ui.test.tsx` updated to the strip model; `window.test.ts` removed with its module).
- `vp build`: clean.
- `pnpm test:e2e`: 12/12 passing — end-of-space regression guards (retargeted, unchanged assertions), fling gate, rail-drag-to-both-ends, proportional mid-rail landing, exact jump landing, reduced-motion instant path, deterministic mid-animation cancellation, keyboard scrolling.
- Fling capture (`node e2e/fling-capture.mjs`, same machine, identical input):
  - Before: fling delivery 23,194ms; position+data settled 24,177ms.
  - After: fling delivery 5,222ms (Playwright protocol-bound; in-page app consumption ~0.6ms for all 40 events); position exact at fling end (162/162 rows); cards resolved ~150ms after the fling.

# Outcome

The explorer is a full-viewport page-level feed driven by a `bigint` virtual position. The fling wall is gone: input advances the position synchronously (deck numbers render immediately), and the worker only fills in card faces. The custom scrollbar rail is grabbable end-to-end, landing exactly on the first/last scrollable deck. Jump, Random, and Go-to-start/end glide over 300ms with exact landings, an instant reduced-motion path, and deterministic cancellation by any new input. Decision 0009 is accepted with the comparison evidence; `docs/architecture.md` describes the new rendering model.

# Related Commits

Pending (branch `feat/explorer-scroll-model`).
