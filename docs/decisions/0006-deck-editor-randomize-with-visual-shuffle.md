# 0006: Deck editor randomize action with a visible shuffle

- Status: accepted
- Date: 2026-08-28

## Context

The planned drag-and-drop deck editor (see the deck editor plan) lets a visitor arrange a deck by hand and watch its exact public deck number update live. Hand-arranging 52 cards is slow, and most visitors want to land somewhere interesting immediately. A randomize action is the natural entry point — but a number that simply snaps to a new value would hide the one thing this site is about: a shuffle is a journey from one exact permutation to another.

The visual character of that journey matters to the project's goals. The site is a demo, executable documentation, and talk material; the shuffle is the single most shareable moment it can produce.

## Decision

The deck editor will include a **randomize** action that:

1. Draws a uniformly random target index from `0` through `52! - 1` using `crypto.getRandomValues` with rejection sampling to eliminate modulo bias, all inside the pure domain layer (behind an injectable entropy source for testability).
2. Animates a visible shuffle from the currently displayed ordering to the drawn target ordering, then settles and reveals the target's exact public deck number.

The animation is rendering-layer work; the domain only supplies the target index and, if needed by the animation, intermediate permutations computed through the existing rank/unrank functions. Randomness never bypasses the bijection: the displayed result is always a real deck number that can be shared and reproduced.

## Alternatives Considered

- Instant jump to a random deck number. Simple, but wastes the most compelling visual the project can offer and teaches nothing.
- Simulating physical shuffle sequences (riffle/overhand) to reach the target. Physically evocative, but a sequence of physical shuffles does not land on a chosen target index; the site promises every number is reachable, so the animation must be able to travel to _any_ permutation, not just shuffle-reachable ones. Physical-style motion may still inform the animation's feel.
- `Math.random`-based selection. Rejected: non-cryptographic, implementation-defined, and biased without care — unacceptable for a project whose entire premise is exact, uniform addressability.
- Precomputing or storing random decks. Contradicts the core constraint; everything is generated on demand.

## Consequences

- The domain gains a small, pure, injectable random-index module with tests proving uniformity properties (rejection of out-of-range draws, exact bounds) and no browser imports beyond an entropy-function parameter.
- The editor plan must specify animation duration, easing, reduced-motion behavior (`prefers-reduced-motion` collapses the animation to an instant transition), and cancellation when the visitor interacts mid-shuffle.
- No new dependencies; `crypto.getRandomValues` is a baseline web platform API.
- The shuffle animation becomes talk material: it is the live demonstration that every endpoint of the animation is addressable.

## Evidence

- To be recorded in the deck editor plan: domain tests for the random-index draw (bounds, rejection sampling, deterministic injection), and reduced-motion/cancellation behavior in UI tests.

## Related Material

- [Factoradic permutation indexing](0003-use-factoradic-permutation-indexing.md)
- [Deck editor plan](../plans/active/2026-08-28-deck-editor.md)
