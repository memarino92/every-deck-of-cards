# 0009: Explorer full-viewport feed with virtual-position navigation

- Status: accepted
- Date: 2026-08-30

## Context

The explorer rendered a bounded window of deck rows inside a nested `.explorer-scroll` pane and recentered a `bigint` anchor on every scroll event (decision 0007). A fast wheel sequence repeatedly shifted `scrollTop`, rebuilt rows, and issued worker requests, so visual position and card availability lagged input. The nested pane also made the explorer a "window in a window": the page itself never scrolled.

Every UUID (everyuuid.com) was an observational design reference over a comparably astronomical space (`2^122` UUIDs): its production bundle on 2026-08-30 appeared to use `bigint` virtual-position state, a percent-mapped custom rail, and requestAnimationFrame jump interpolation. Because that production asset is mutable and was not archived, this observation motivates the prototype but is not durable implementation evidence.

## Decision

The explorer holds its scroll position as application state — a **virtual position** (`FeedPosition`: the `bigint` deck under the feed viewport's top edge plus a sub-row pixel offset) in `src/virtualization/position.ts` — and the nested pane is gone. Concretely:

- **One full-viewport scroll surface.** Native document scrolling stays disabled on the explorer-first home page. The surface first consumes input into a finite pixel offset that moves the compact introduction away, then advances `FeedPosition`; reversing at deck 1 reveals the introduction through the same state path. The rendered strip (visible rows plus overscan) follows with a compositor transform. Deck numbers derive synchronously from the position, while card faces remain asynchronous and main-thread rendering still determines end-to-end responsiveness.
- **Custom scrollbar rail.** A fixed-size thumb on a rail maps percent-of-space to an exact `bigint` position (1e9 fixed-point granularity, far beyond any rail's pixel resolution). Thumb drags preserve the pointer's grab offset within the thumb's travel range, so cranking to — or past — either end lands exactly on the first or last scrollable deck. Percent mapping is scrollbar _input_ only; the position of record is always an exact integer.
- **Animated navigation.** Jump, Random, and Go-to-start/end interpolate the position with `requestAnimationFrame` over 300 ms (ease-in-out cubic). Mid-space targets land at the feed viewport top; an end target is exactly visible with the final deck pinned to the bottom row. The target is re-clamped if viewport geometry changes during the animation. `prefers-reduced-motion` (or a missing `matchMedia`) jumps instantly. Any new feed input — wheel, rail, keyboard, touch, or another navigation — cancels a running animation deterministically. A `data-animating` attribute exposes animation state to browser tests.
- **Direct input is instant.** Keyboard (arrows, PageUp/PageDown, Home/End on the focused feed) and touch drags move the position immediately; only programmatic navigation animates.
- **Data path retained and bounded** (decision 0007): the strip requests `[start, count]` batches, sequence numbers suppress stale responses, and the worker coalesces pending messages to the latest request while yielding between chunks so stale work can stop. Card buffers are cached by deck index so rows survive sub-row strip shifts.

The alternative — **native page scroll + recentering window** — was exercised through the shipped implementation and rejected without a separately tuned prototype. Its native scrollbar can only span the bounded physical window, so it cannot provide end-to-end space navigation. The functional wheel-sequence comparison also showed repeated recentering was the wrong input model, without making a generalized timing claim.

## Alternatives Considered

- **Status quo (nested pane + recenter-on-scroll).** Rejected: per-gesture recentering is the fling wall, and the nested pane is the feel being removed.
- **Native page scroll + recentering window, tuned** (larger margins, predictive prefetch, rAF-driven anchor updates). Rejected primarily on the structural scrollbar argument above; tuning cannot give a native scrollbar end-to-end reach.
- **Native scrollbar over the true `52!` height.** Impossible: no browser can express a scroll region that tall; every approach needs a virtual position or a recentering window.
- **Percent-based thumb mapping as the position of record.** Still rejected for the _addressing_ layer, as 0007 argued — a float fraction cannot name a specific deck. The rail uses percent mapping only as scrollbar _input_, resolving to an exact integer position; that distinction keeps exact addressability intact.
- **Third-party virtualization library.** Rejected unless justified by a later record; the position math is in-house and small.

## Consequences

- The nested `.explorer-scroll` pane and its `scrollTop`-shifting recenter loop are gone; `src/virtualization/window.ts` is replaced by `src/virtualization/position.ts` (advance/clamp/fraction/interpolation/strip math, all pure and unit-tested).
- Scroll behavior remains emergent between browser and app, so decision 0008's e2e-oracle rule applies in full: Playwright specs cover flings, rail drags to both ends, exact jump landing, reduced-motion, and mid-animation cancellation.
- Decision 0007's worker batching/coalescing, `nextPermutation` stepping, stale-response suppression, and deck-number addressing still stand. This record supersedes its complete anchor/window/recentering virtualization model; 0007 is annotated accordingly.
- The rail is a pointer-only affordance (`aria-hidden`). Keyboard controls on the focused feed and exact addressing in the jump form are alternatives, but no screen-reader scrollbar semantics are claimed.
- Touch scrolling is a direct one-to-one drag without momentum; wheel input (including trackpad fling cadence) is the tested fling path.
- The explorer lives at `/`; legacy `/explore` links redirect while preserving their query parameters. Decision 0012 defines the route and intro/feed composition without changing this decision's virtual-position authority.

## Evidence

- `e2e/fling-capture.mjs` is the reproducible observational harness. It always starts a specified Git worktree on an unused port; records revision, Node, browser, OS, CPU, and raw repetitions; and describes its input accurately as sequential awaited Playwright wheel events with minimum 8 ms gaps. Its output is diagnostic and is not used here for a generalized performance magnitude claim.
- Scrollbar grab: `e2e/explorer-rail.spec.ts` — dragging the thumb past the bottom of the rail renders the last deck; past the top returns to deck 1; a mid-rail press lands in the proportional middle of the space. (The native-scrollbar model cannot express this at all.)
- E2e gates: `e2e/explorer-home.spec.ts` (single-surface wheel and touch continuity with no document scroll), `e2e/explorer-fling.spec.ts` (exact full-distance wheel sequence and eventual row resolution), `e2e/explorer-rail.spec.ts` (visible end-to-end drag), `e2e/explorer-jump.spec.ts` (exact landing, reduced-motion path, cancellation, resize re-clamping, modified-wheel preservation, keyboard controls), and `e2e/explorer-end.spec.ts` (visible end-of-space regression guards).
- Unit: `src/virtualization/position.test.ts` covers position clamping, sub-row carry/borrow, end-of-space pinning, fraction mapping, safe interpolation boundaries, partial-row strip geometry, and exact endpoints.

## Related Material

- Decisions 0007 (worker batching and virtualization — partially superseded), 0008 (e2e oracle), 0010/0011 (toolchain), 0012 (explorer-first home page).
- Plan: `docs/plans/completed/2026-08-30-explorer-scroll-model.md`.
