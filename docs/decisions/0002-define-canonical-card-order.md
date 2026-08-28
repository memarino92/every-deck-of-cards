# 0002: Define canonical card order

- Status: superseded by [0004](0004-use-new-deck-canonical-order.md)
- Date: 2026-08-28

## Context

Permutation indices only have stable meaning relative to one canonical sequence. Once public deck numbers are shared, changing that sequence would make every number refer to a different deck.

## Decision

Assign card IDs in suit-major order. Suits are clubs, diamonds, hearts, then spades. Within each suit, ranks are ace, two through ten, jack, queen, then king. Card IDs are zero-based integers from 0 through 51.

Public deck `1` is this sequence. Public deck `52!` is its lexicographic reverse.

## Alternatives Considered

- Rank-major ordering groups all suits of each rank, but makes a conventional suit run less direct and is less useful as the first demonstrative deck.
- Red/black or bridge suit orderings are valid but lack a universal standard. The chosen order is simple, memorable, and explicit.
- A physical manufacturer's new-deck order varies by product and region and would couple the compatibility contract to an external convention.

## Consequences

Published deck numbers are stable only while this record and its tests remain unchanged. Curated rank-major, color-grouped, and new-deck patterns remain independently rankable favorites rather than implicit canonical behavior.

## Evidence

Canonical card tests enumerate every ID, suit, and rank boundary.

## Related Material

- [Permutation domain plan](../plans/active/2026-08-28-permutation-domain.md)
- [Superseding new-deck-order decision](0004-use-new-deck-canonical-order.md)
