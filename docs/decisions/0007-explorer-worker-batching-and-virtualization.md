# 0007: Explorer worker batching and bigint virtualization

- Status: accepted
- Date: 2026-08-29

## Context

The explorer is the site's centerpiece: a scrollable feed over all `52!` deck orderings. Two hard constraints shape it. First, `52! ≈ 8.07 × 10^67` far exceeds what any DOM or JavaScript `number` can represent, so the feed cannot be a real scroll region of `52!` rows. Second, computing a deck ordering means unranking a `bigint` index through the factoradic algorithm, which is pure but non-trivial; doing it on the main thread at scroll-frame rate risks jank and would entangle rendering with permutation mathematics.

The architecture document already draws boundaries (`domain`, `worker`, `virtualization`, `ui`) and states the browser cannot create a scroll area with `52!` rows. This record makes those boundaries concrete for the explorer milestone.

## Decision

The explorer is built from three separated pieces:

1. **Worker batching.** A dedicated Web Worker receives typed requests `{ startIndex, count }`, unranked contiguous batches with `unrankPermutation`, and posts results back as flat `Uint8Array` card-ID buffers using transferable objects (no structured-clone of card objects). Requests carry a monotonically increasing sequence number so stale responses are dropped, and a new request supersedes the in-flight one.

   Within a batch, only the first deck is computed with a full factoradic `unrankPermutation`; every following deck is produced by `nextPermutation`, the domain's in-place lexicographic step from index `i` to `i + 1`. The explorer scrolls through adjacent indices, so stepping replaces a per-deck bigint factoradic division chain with a single comparison sweep and suffix reversal. Verified against `unrankPermutation` for runs of consecutive indices and across suit-run boundaries, stepping is roughly two orders of magnitude cheaper per deck (~0.0001 ms vs ~0.011 ms on a development machine; observational, not a performance claim) and needs no bigint arithmetic per step. Random access (jump-to-deck) still uses a full unrank, so the bijection remains the source of truth.

2. **Bigint virtualization.** The UI owns a bounded physical scroll window (a few hundred rows) that is continuously recentered around a logical `bigint` anchor index. Each row renders 52 card faces, so the physical window is kept deliberately small to bound DOM weight; visible rows plus a small overscan are ever rendered or held in memory. The logical position across the full `52!` range is the anchor plus the physical offset. All position arithmetic stays in `bigint`; JavaScript `number` is used only inside a single physical window whose size is far below `Number.MAX_SAFE_INTEGER`.

3. **Deck-number addressing.** The shareable URL carries the one-based public deck number; loading the explorer validates it through the existing deck-number domain module, converts to a zero-based index, and anchors the window there. A jump control accepts a deck number and re-anchors.

The domain layer is unchanged: the worker imports `unrankPermutation` and the card table, and rendering receives only compact card IDs.

## Presentation

The explorer's visual direction is a **minimal instrument**: dark neutral background and monospace deck numbers, so the feed reads as a precision instrument over the permutation space. Within that frame, each deck is rendered as **real playing cards fanned left to right** so every card's pips and face design are visible — not abstract glyphs. The cards are the exhibit; the instrument styling is the frame around them. The felt-table casino theme of the landing page is not the explorer's target. Presentation is a UI-layer concern and does not affect the worker or virtualization boundaries.

## Alternatives Considered

- **Main-thread unranking of visible rows only.** Simplest to write, but unranking at scroll-frame rate on the UI thread invites jank, merges the rendering and permutation boundaries the architecture forbids, and produces no worker/transport material for the talk. Rejected for the milestone, though the worker's domain calls remain directly testable on the main thread.
- **Full factoradic unrank for every deck in a batch.** Correct but wasteful: scrolling walks consecutive indices, where each deck is a short lexicographic step from the last. The batch producer unranked the first deck fully, then steps with `nextPermutation`. Random access still unranked directly.
- **A real scroll element sized to `52!` pixels.** Browsers cap element dimensions around 2^24–2^33 px; `52!` is astronomically beyond that. Not possible.
- **Percent-based thumb mapping (scroll fraction × 52!).** Loses exact addressability: a fractional scroll position cannot name a specific deck number, and floating-point cannot resolve adjacent indices. The site promises exact decks, so position must be integer `bigint`, not a proportion.
- **Paging / "next batch" buttons instead of continuous scroll.** Exact and simple, but abandons the feeling of an unbroken space the project exists to create. Continuous recentering is the point.

## Consequences

- The worker protocol, cancellation, and transferable-buffer transport become reusable talk material and a template for the deck editor's randomize endpoint.
- Virtualization logic (anchor recentering, offset math) is pure and testable without a browser, keeping the `bigint` invariants enforceable.
- The explorer never stores or enumerates the space; memory stays bounded regardless of position.
- Scroll velocity is bounded by batch latency; overscan and superseding requests are the mitigation, and any performance claim requires a reproducible benchmark before it is made.
- The public deck-number URL format is established here and will be shared with the deck editor.

## Evidence

To be recorded in the explorer plan: worker round-trip tests, virtualization anchor-math tests, batch-boundary correctness tests against the domain, and any scroll/unrank throughput benchmark with documented methodology before performance claims.

`nextPermutation` correctness is covered by domain tests that assert it lands on index `i + 1` for runs of consecutive 52-card decks, crosses suit-run boundaries (including the midpoint rank reversal), and returns `false` at the final permutation, plus a worker test asserting a wide stepped window matches independent `unrankPermutation` results deck-for-deck.

## Related Material

- [Factoradic permutation indexing](0003-use-factoradic-permutation-indexing.md)
- [Canonical card order](0004-use-new-deck-canonical-order.md)
- [Sequential card IDs](0005-assign-card-ids-in-canonical-order.md)
- [Explorer plan](../plans/completed/2026-08-29-explorer.md)
- [Architecture](../architecture.md)
- [0009: Explorer as page-scroll feed with virtual-position navigation](0009-explorer-page-scroll-virtual-position.md) — supersedes this record's choice of scroll container (nested pane) and recenter trigger; the worker batching, bigint window math, and deck-number addressing above still stand.
