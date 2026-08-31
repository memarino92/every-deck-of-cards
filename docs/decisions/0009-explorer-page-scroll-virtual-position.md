# 0009: Explorer page-scroll model with virtual-position navigation

- Status: accepted
- Date: 2026-08-30

## Context

The explorer renders a bounded window of deck rows inside a nested `.explorer-scroll` pane and recenters a `bigint` anchor on every scroll event (decision 0007). A fast fling recenters the window many times per gesture; each recenter shifts `scrollTop` and waits on a worker round-trip, so the feed stalls on "Shuffling…" and the gesture hits a wall long before the data path's real limits. The nested pane also makes the explorer a "window in a window": the page itself never scrolls.

Every UUID (everyuuid.com) demonstrates a smoother model over a comparably astronomical space (`2^122` UUIDs): a **virtual position** — a `bigint` state — drives which items are computed for the visible rows; a custom scrollbar rail maps percent-of-space to that position, so grabbing the scrollbar and cranking it to the bottom works; and programmatic jumps (search, random) animate by interpolating the virtual position with `requestAnimationFrame` over a few hundred milliseconds rather than relying on native smooth scrolling over an impossible scroll height. (Bundle inspected 2026-08-30: no virtualization library.)

## Decision

The explorer holds its scroll position as application state — a **virtual position** (`FeedPosition`: the `bigint` deck under the viewport's top edge plus a sub-row pixel offset) in `src/virtualization/position.ts` — and the nested pane is gone. Concretely:

- **The feed is the page.** While the explorer is mounted the document does not scroll (`overflow: hidden`; the feed fills the viewport between masthead and footer). Wheel and touch input advance the position directly and synchronously; the rendered strip (visible rows plus overscan) follows the position, translated by a compositor `transform`. Input can never stall behind the data path because the position never waits on it — deck numbers render synchronously from the position, and only card faces load asynchronously.
- **Custom scrollbar rail.** A fixed-size thumb on a rail maps percent-of-space to an exact `bigint` position (1e9 fixed-point granularity, far beyond any rail's pixel resolution). Thumb drags preserve the pointer's grab offset within the thumb's travel range, so cranking to — or past — either end lands exactly on the first or last scrollable deck. Percent mapping is scrollbar _input_ only; the position of record is always an exact integer.
- **Animated navigation.** Jump, Random, and Go-to-start/end interpolate the position with `requestAnimationFrame` over 300 ms (ease-in-out cubic), landing exactly on the requested deck. `prefers-reduced-motion` (or a missing `matchMedia`) jumps instantly. Any new input — wheel, rail, keyboard, touch, or another navigation — cancels a running animation deterministically. A `data-animating` attribute exposes animation state so tests can observe a running glide without timing guesses.
- **Direct input is instant.** Keyboard (arrows, PageUp/PageDown, Home/End on the focused feed) and touch drags move the position immediately; only programmatic navigation animates.
- **Data path unchanged** (decision 0007 stands): the strip requests `[start, count]` batches; supersession and the worker's early-cancel absorb scroll churn. Card buffers are cached by deck index so rows survive sub-row strip shifts.

The alternative — **native page scroll + recentering window** — was measured as shipped and rejected without a tuned prototype: its native scrollbar can only ever span the physical window, so the end-to-end grab requirement is structurally unmeetable, and the fling measurement (below) shows the wall is intrinsic to recentering on input.

## Alternatives Considered

- **Status quo (nested pane + recenter-on-scroll).** Rejected: per-gesture recentering is the fling wall, and the nested pane is the feel being removed.
- **Native page scroll + recentering window, tuned** (larger margins, predictive prefetch, rAF-driven anchor updates). Rejected on the measurement below plus the structural scrollbar argument above; tuning cannot give a native scrollbar end-to-end reach.
- **Native scrollbar over the true `52!` height.** Impossible: no browser can express a scroll region that tall; every approach needs a virtual position or a recentering window.
- **Percent-based thumb mapping as the position of record.** Still rejected for the _addressing_ layer, as 0007 argued — a float fraction cannot name a specific deck. The rail uses percent mapping only as scrollbar _input_, resolving to an exact integer position; that distinction keeps exact addressability intact.
- **Third-party virtualization library.** Rejected unless justified by a later record; the position math is in-house and small.

## Consequences

- The nested `.explorer-scroll` pane and its `scrollTop`-shifting recenter loop are gone; `src/virtualization/window.ts` is replaced by `src/virtualization/position.ts` (advance/clamp/fraction/interpolation/strip math, all pure and unit-tested).
- Scroll behavior remains emergent between browser and app, so decision 0008's e2e-oracle rule applies in full: Playwright specs cover flings, rail drags to both ends, exact jump landing, reduced-motion, and mid-animation cancellation.
- Decision 0007's worker batching, `nextPermutation` stepping, and deck-number addressing still stand; this record supersedes only its choice of scroll container and recenter trigger, and 0007 is annotated to point here.
- The rail is a pointer-only affordance (`aria-hidden`): keyboard scrolling lives on the focused feed and exact addressing in the jump form.
- Touch scrolling is a direct one-to-one drag without momentum; wheel input (including trackpad fling cadence) is the tested fling path.
- Independent of where the explorer lives (`/explore` today, `/` under the explorer-first-home plan): the scroll model is correct under either route.

## Evidence

- everyuuid.com bundle inspection (2026-08-30): virtual-position `bigint` state, custom scrollbar component, rAF jump interpolation (~300 ms).
- Fling comparison, `node e2e/fling-capture.mjs` (methodology in the script header: 40 × 600px wheel events 8ms apart at deck 1,000,000, 1280×800 viewport, same machine for both runs):
  - **Before (nested pane + recenter):** the fling took **23,194 ms** of wall clock to deliver (~72× the 320ms of input — each wheel event stalled behind a recenter and worker round-trip; this is the wall). Position and data settled at 24,177 ms.
  - **After (virtual position):** the same fling delivered in **5,222 ms**, bounded by Playwright protocol latency rather than the app — in-page, the app consumes the entire 40-event fling in **~0.6 ms**. The position tracked the input exactly (162/162 rows at fling end) and card rows resolved ~150 ms after the fling stopped.
- Scrollbar grab: `e2e/explorer-rail.spec.ts` — dragging the thumb past the bottom of the rail renders the last deck; past the top returns to deck 1; a mid-rail press lands in the proportional middle of the space. (The native-scrollbar model cannot express this at all.)
- E2e gates (`pnpm test:e2e`, 12/12 passing): `e2e/explorer-fling.spec.ts` (full-distance fling without stall, rows resolve ≤ 3s after), `e2e/explorer-rail.spec.ts` (end-to-end drag), `e2e/explorer-jump.spec.ts` (exact landing, reduced-motion instant path, deterministic mid-animation cancellation via `data-animating`, keyboard scrolling), `e2e/explorer-end.spec.ts` (existing end-of-space regression guards, green unchanged).
- Unit: `src/virtualization/position.test.ts` (35 tests) covers position clamping, sub-row carry/borrow, end-of-space pinning, fraction mapping both directions, interpolation exactness at the endpoints, and strip range math.

## Related Material

- Decisions 0007 (worker batching and virtualization — partially superseded), 0008 (e2e oracle), 0010/0011 (toolchain), 0012 (explorer-first home page).
- Plan: `docs/plans/completed/2026-08-30-explorer-scroll-model.md`.
