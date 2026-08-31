# 0007: Explorer worker batching and bigint virtualization

- Status: accepted; virtualization model superseded by 0009
- Date: 2026-08-29

## Context

The explorer is the site's centerpiece: a scrollable feed over all `52!` deck orderings. Two hard constraints shape it. First, `52! ≈ 8.07 × 10^67` far exceeds what any DOM or JavaScript `number` can represent, so the feed cannot be a real scroll region of `52!` rows. Second, computing a deck ordering means unranking a `bigint` index through the factoradic algorithm, which is pure but non-trivial; doing it on the main thread at scroll-frame rate risks jank and would entangle rendering with permutation mathematics.

The architecture document already draws boundaries (`domain`, `worker`, `virtualization`, `ui`) and states the browser cannot create a scroll area with `52!` rows. This record makes those boundaries concrete for the explorer milestone.

## Decision

The explorer is built from three separated pieces:

1. **Worker batching.** A dedicated Web Worker receives typed requests `{ startIndex, count }`, unranked contiguous batches with `unrankPermutation`, and posts results back as flat `Uint8Array` card-ID buffers using transferable objects (no structured-clone of card objects). Requests carry a monotonically increasing sequence number; a new request rejects the previous pending client promise, and responses whose sequence is no longer current are dropped. The worker keeps only the latest pending request and yields to its task queue between batch chunks, so newer messages cancel stale work and overwrite intermediate queued requests.

   Within a batch, only the first deck is computed with a full factoradic `unrankPermutation`; every following deck is produced by `nextPermutation`, the domain's in-place lexicographic step from index `i` to `i + 1`. The explorer scrolls through adjacent indices, so stepping replaces each additional factoradic unrank with a comparison sweep and suffix reversal and needs no bigint arithmetic per step. Correctness is verified against independent `unrankPermutation` results; this record makes no throughput magnitude claim. Random access (jump-to-deck) still uses a full unrank, so the bijection remains the source of truth.

2. **Bigint virtualization (historical; superseded by decision 0009).** The initial implementation owned a bounded physical scroll window continuously recentered around a logical `bigint` anchor. Decision 0009 replaced that anchor/window/recentering model and its pure math with a `bigint` virtual position plus bounded rendered strip. The invariant retained here is that cross-space position arithmetic remains `bigint`; JavaScript `number` is restricted to viewport-local pixels and row counts.

3. **Deck-number addressing.** The shareable URL carries the one-based public deck number; loading the explorer validates it through the existing deck-number domain module, converts to a zero-based index, and positions the feed there. A jump control accepts a deck number and navigates to that position.

The domain layer is unchanged: the worker imports `unrankPermutation` and the card table, and rendering receives only compact card IDs.

## Presentation

The explorer's visual direction is a **minimal instrument**: dark neutral background and monospace deck numbers, so the feed reads as a precision instrument over the permutation space. Within that frame, each deck is rendered as **real playing cards fanned left to right** so every card's pips and face design are visible — not abstract glyphs. The cards are the exhibit; the instrument styling is the frame around them. The felt-table casino theme of the landing page is not the explorer's target. Presentation is a UI-layer concern and does not affect the worker or virtualization boundaries.

## Alternatives Considered

- **Main-thread unranking of visible rows only.** Simplest to write, but unranking at scroll-frame rate on the UI thread invites jank, merges the rendering and permutation boundaries the architecture forbids, and produces no worker/transport material for the talk. Rejected for the milestone, though the worker's domain calls remain directly testable on the main thread.
- **Full factoradic unrank for every deck in a batch.** Correct but wasteful: scrolling walks consecutive indices, where each deck is a short lexicographic step from the last. The batch producer unranked the first deck fully, then steps with `nextPermutation`. Random access still unranked directly.
- **A real scroll element sized to `52!` pixels.** Browsers cap element dimensions around 2^24–2^33 px; `52!` is astronomically beyond that. Not possible.
- **Percent-based thumb mapping (scroll fraction × 52!).** Loses exact addressability: a fractional scroll position cannot name a specific deck number, and floating-point cannot resolve adjacent indices. The site promises exact decks, so position must be integer `bigint`, not a proportion.
- **Paging / "next batch" buttons instead of continuous scroll.** Exact and simple, but abandons the feeling of an unbroken space the project exists to create. Continuous exploration is the point.

## Consequences

- The worker protocol, latest-request coalescing, stale-response suppression, and transferable-buffer transport become reusable talk material and a template for the deck editor's randomize endpoint.
- Virtualization logic remains pure and testable without a browser; decision 0009 replaces the anchor/recentering functions with virtual-position, fraction, interpolation, and strip math.
- The explorer never stores or enumerates the space; memory stays bounded regardless of position.
- Card availability is bounded by batch latency; overscan and stale-response suppression keep rendering bounded, and any performance claim requires a reproducible benchmark before it is made.
- The public deck-number URL format is established here and will be shared with the deck editor.

## Evidence

The initial explorer plan recorded worker round-trip tests, anchor/window math tests, and batch-boundary correctness tests. Decision 0009 and its completed plan carry the replacement virtual-position tests and browser-level scroll evidence. Performance observations remain separate from correctness evidence.

`nextPermutation` correctness is covered by domain tests that assert it lands on index `i + 1` for runs of consecutive 52-card decks, crosses suit-run boundaries (including the midpoint rank reversal), and returns `false` at the final permutation, plus a worker test asserting a wide stepped window matches independent `unrankPermutation` results deck-for-deck.

## Related Material

- [Factoradic permutation indexing](0003-use-factoradic-permutation-indexing.md)
- [Canonical card order](0004-use-new-deck-canonical-order.md)
- [Sequential card IDs](0005-assign-card-ids-in-canonical-order.md)
- [Explorer plan](../plans/completed/2026-08-29-explorer.md)
- [Architecture](../architecture.md)
- [0009: Explorer full-viewport feed with virtual-position navigation](0009-explorer-page-scroll-virtual-position.md) — supersedes this record's nested scroll container and the complete anchor/window/recentering virtualization model. Worker batching/coalescing, stale-response suppression, and deck-number addressing remain in force.
