# 0006: Deck editor randomize action with a visible shuffle

- Status: accepted
- Date: 2026-08-28

## Context

The planned deck editor lets a visitor arrange a deck by hand and watch its exact public deck number update live. Randomization provides a quick way to demonstrate another exact endpoint, but a number that simply snaps to a new value would hide the relationship between the current permutation and its replacement.

The visual character of that journey matters to the project's goals. The site is a demo, executable documentation, and talk material; the shuffle is intended as a prominent demonstration.

## Decision

The deck editor will include a **randomize** action that:

1. Draws a uniformly random target index from `0` through `52! - 1` with rejection sampling to eliminate modulo bias. The platform-independent domain algorithm accepts an injected entropy source; a platform adapter supplies `crypto.getRandomValues` in production.
2. Animates a visible shuffle from the currently displayed ordering to the drawn target ordering, then settles and reveals the target's exact public deck number.

The animation is rendering-layer work; the domain only supplies the target index and, if needed by the animation, intermediate permutations computed through the existing rank/unrank functions. Randomness never bypasses the bijection: the displayed result is always a real deck number that can be shared and reproduced.

## Alternatives Considered

- Instant jump to a random deck number. Simple, but wastes the most compelling visual the project can offer and teaches nothing.
- Simulating an independent physical shuffle sequence (riffle/overhand). Physically evocative, but an independently sampled sequence does not guarantee the already selected uniform target. The animation is endpoint-constrained; physical-style motion may still inform its feel.
- `Math.random`-based selection. Rejected: non-cryptographic, implementation-defined, and biased without care — unacceptable for a project whose entire premise is exact, uniform addressability.
- Precomputing or storing random decks. Contradicts the core constraint; everything is generated on demand.

## Consequences

- The domain gains a small, platform-independent random-index module with injected entropy, tests covering uniformity properties (rejection of out-of-range draws, exact bounds), and no browser imports.
- The editor specifies animation duration, easing, reduced-motion behavior (`prefers-reduced-motion` collapses the animation to an instant transition), and cancellation when the visitor interacts mid-shuffle.
- No new dependencies; `crypto.getRandomValues` is a baseline web platform API.
- The shuffle animation is a candidate for talk material: it demonstrates that every endpoint is addressable.

## Implementation Note (2026-09-01)

Arrange shipped with native Web Animations and no motion dependency. Stable card IDs split the flourish into 26 upward and 26 downward arcs. During intermediate geometry the number reads `Shuffling...`; completion reveals the exact target, reduced motion settles immediately, and interaction cancels deterministically. Decision 0013 records the complete shipped interaction model.

## Evidence

- `src/domain/random.test.ts` covers exact lower/small draws, bounds, rejection and retry, rejection exhaustion, and deterministic-corpus variation.
- `src/ArrangePage.test.tsx` injects permutation index `42` and proves that reduced-motion shuffle settles on the matching ordering and public deck number `43`.
- `e2e/arrange.spec.ts` fixes browser entropy to index `42` and verifies animated settlement on deck `43`, `Shuffling...` number suppression during intermediate geometry, Reset cancellation, and instant reduced-motion settlement.
- Implementation and complete verification commands are recorded in the completed deck-editor plan.

## Related Material

- [Factoradic permutation indexing](0003-use-factoradic-permutation-indexing.md)
- [Deck editor plan](../plans/completed/2026-08-28-deck-editor.md)
- [Arrange interaction and motion](0013-arrange-interaction-and-motion.md)
