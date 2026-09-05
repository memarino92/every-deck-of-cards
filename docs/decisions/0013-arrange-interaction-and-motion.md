# 0013: Arrange uses native live reordering and endpoint-constrained motion

- Status: accepted
- Date: 2026-09-01

## Context

Arrange edits one exact 52-card permutation while preserving the site's canonical ordering and one-based public addressing contracts. Its overlapping horizontal spread needs pointer, touch, and keyboard interaction; its Shuffle action must reach an already drawn uniform target; and both behaviors must remain interruptible and testable in a real browser.

The Solid ecosystem's prominent drag package, [`@thisbeyond/solid-dnd` 0.7.5](https://www.npmjs.com/package/@thisbeyond/solid-dnd), was evaluated on 2026-08-31. It was last published in 2023, declared a Solid `^1.5` peer range, provided vertical rather than overlapping-horizontal sortable primitives, and had an [open maintenance-status issue](https://github.com/thisbeyond/solid-dnd/issues/117). A general motion dependency would likewise exceed the needs of one keyed card transition.

## Decision

- `/arrange` owns one local card-ID ordering and ranks it synchronously. Position zero is the rightmost, topmost card, matching the explorer and physical new-deck presentation.
- Each card remains a semantic button. Mouse and pen use Pointer Events for live insertion; keyboard and tap use select-then-insert. On touch, a stationary long press activates drag, earlier movement manually pans the spread, a quick pan release continues with bounded time-based momentum, and activation requests a brief best-effort Vibration API cue. New input and Arrange actions cancel momentum; native `scrollLeft` clamping remains authoritative; reduced-motion preference keeps panning one-to-one.
- Settled orderings use the explorer's one-based `?deck=` parameter. Initial navigation and Back/Forward unrank that parameter; drag crossings do not write history, while release and other settled actions do.
- Shuffle draws one unbiased index through the platform-independent injected-entropy domain algorithm and a Web Crypto platform adapter. The UI commits that exact target and uses the Web Animations API to move keyed cards from old slots to new slots. Intermediate geometry displays `Shuffling...`; reduced motion settles immediately; interruption cancels motion deterministically.
- No drag-and-drop or motion dependency is added.

## Consequences

- Rendering owns pointer capture, gesture arbitration, haptics, animation lifecycle, and cancellation; domain code remains independent of Solid and browser APIs.
- Manual touch panning and its dependency-free momentum remain in the rendering/input boundary. They do not affect card ordering, ranking, worker boundaries, or URL state. Broader mobile layout refinement remains follow-up work.
- Browser behavior requires Playwright coverage. Pure tests cover reorder coordinates, ranking, target selection, and deterministic reduced-motion settlement.
- The Web Animations approach is sufficient for Arrange. Broader talk-diagram motion needs remain a separate future evaluation rather than an editor dependency requirement.

## Evidence

- `src/ArrangePage.test.tsx` covers reorder math, pointer-position mapping, split shuffle directions, exact query initialization, live ranking, reset, and deterministic reduced-motion settlement.
- `e2e/arrange.spec.ts` covers keyboard reordering and focus, mouse and long-press touch drag, touch panning, haptic activation, post-shuffle drag lift, shareable URLs and history, exact shuffle settlement, cancellation, reduced motion, and mobile geometry. `e2e/arrange-momentum.spec.ts` covers post-release continuation, wheel cancellation, reduced-motion panning, and both horizontal bounds.
- Completion evidence and merged commits are recorded in the completed deck-editor plan.

## Related Material

- [Deck editor randomize action](0006-deck-editor-randomize-with-visual-shuffle.md)
- [Canonical card order](0004-use-new-deck-canonical-order.md)
- [Completed deck editor plan](../plans/completed/2026-08-28-deck-editor.md)
