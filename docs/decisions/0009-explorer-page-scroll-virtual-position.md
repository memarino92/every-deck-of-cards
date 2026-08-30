# 0009: Explorer page-scroll model with virtual-position navigation

- Status: proposed
- Date: 2026-08-30

## Context

The explorer renders a bounded window of deck rows inside a nested `.explorer-scroll` pane and recenters a `bigint` anchor on every scroll event (decision 0007). A fast fling recenters the window many times per gesture; each recenter shifts `scrollTop` and waits on a worker round-trip, so the feed stalls on "Shuffling…" and the gesture hits a wall long before the data path's real limits. The nested pane also makes the explorer a "window in a window": the page itself never scrolls.

Every UUID (everyuuid.com) demonstrates a smoother model over a comparably astronomical space (`2^122` UUIDs): a **virtual position** — a `bigint` state — drives which items are computed for the visible rows; a custom scrollbar rail maps percent-of-space to that position, so grabbing the scrollbar and cranking it to the bottom works; and programmatic jumps (search, random) animate by interpolating the virtual position with `requestAnimationFrame` over a few hundred milliseconds rather than relying on native smooth scrolling over an impossible scroll height. (Bundle inspected 2026-08-30: no virtualization library.)

## Decision

Move the explorer off the nested pane to page-level scrolling. For scroll mechanics, prototype and compare two approaches, then implement the winner:

- **Virtual position + custom scrollbar** (the Every UUID model): scroll position is application state (`bigint`), the rendered window follows it, and a custom rail provides the grabbable end-to-end scrollbar.
- **Native page scroll + recentering window**: keep the existing window math but move it to the document scroller and make the worker pipeline keep up with flings (larger margins, predictive prefetch, rAF-driven anchor updates).

Either way: the scrollbar must be grabbable end-to-end, flings must not stall beyond what the data path allows, and animated navigation (jump/random/start/end) must land exactly on the requested deck with a reduced-motion instant path. The comparison measurements are attached under Evidence before this record is marked accepted.

## Alternatives Considered

- **Status quo (nested pane + recenter-on-scroll).** Rejected: per-gesture recentering is the fling wall, and the nested pane is the feel being removed.
- **Native scrollbar over the true `52!` height.** Impossible: no browser can express a scroll region that tall; every approach needs a virtual position or a recentering window.
- **Percent-based thumb mapping as the position of record.** Still rejected for the _addressing_ layer, as 0007 argued — a float fraction cannot name a specific deck. The Every UUID model uses percent mapping only as scrollbar _input_, resolving to an exact integer position; that distinction keeps exact addressability intact.
- **Third-party virtualization library.** Rejected unless justified by a later record; the window math is in-house and small.

## Consequences

- The nested `.explorer-scroll` pane and its `scrollTop`-shifting recenter loop go away; scroll behavior becomes emergent between the browser and the app in a new way, so decision 0008's e2e-oracle rule applies in full (Playwright fling and scrollbar-drag specs, not pure-TypeScript simulation).
- Decision 0007's worker batching, `nextPermutation` stepping, and deck-number addressing still stand; this record supersedes only its choice of scroll container and recenter trigger, and 0007 is annotated to point here.
- Independent of where the explorer lives (`/explore` today, `/` under the explorer-first-home plan): the scroll model is correct under either route.

## Evidence

- everyuuid.com bundle inspection (2026-08-30): virtual-position `bigint` state, custom scrollbar component, rAF jump interpolation (~300 ms).
- Approach-comparison measurements and before/after fling captures: to be attached during implementation.

## Related Material

- Decisions 0007 (worker batching and virtualization — partially superseded), 0008 (e2e oracle), 0010/0011 (toolchain), 0012 (explorer-first home page).
- Plan: `docs/plans/active/2026-08-30-explorer-scroll-model.md`.
