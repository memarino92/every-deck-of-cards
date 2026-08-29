# 0004: Use new-deck canonical order

- Status: accepted (card-ID retention superseded by [0005](0005-assign-card-ids-in-canonical-order.md))
- Date: 2026-08-28
- Supersedes: [0002: Define canonical card order](0002-define-canonical-card-order.md)

## Context

Permutation indices require one stable canonical sequence. Decision 0002 chose a suit-major sequence because it was simple to generate, but the public application does not yet expose deck numbers and therefore has a final opportunity to adopt a sequence with physical and explanatory meaning.

"New deck order" varies by manufacturer, product, region, and viewing orientation. For this project's US-oriented standard deck, a commonly reported US Playing Card Company-style arrangement provides a recognizable sequence that reverses rank direction halfway through the deck.

## Decision

Public deck `1`, read from the face of a 52-card deck toward the back, is:

1. Ace through king of spades.
2. Ace through king of diamonds.
3. King through ace of clubs.
4. King through ace of hearts.

Jokers and advertising cards are excluded. Public deck `52!` remains the lexicographic reverse of deck `1`.

Card IDs remain the zero-based suit-major identifiers established by decision 0002. The canonical permutation sequence refers to those IDs in new-deck order, separating stable card identity from permutation rank.

> **Update (2026-08-28):** [Decision 0005](0005-assign-card-ids-in-canonical-order.md) superseded this paragraph before any public exposure. Card IDs are now sequential in canonical deck order, so `CANONICAL_DECK` is the identity sequence. The canonical sequence defined above is unchanged.

## Alternatives Considered

- Keep card IDs in ascending order as the canonical deck. This is mathematically convenient but carries no useful physical meaning.
- ~~Reassign card IDs to match new-deck order. This would unnecessarily change card identity as well as permutation meaning.~~ Revisited and adopted by [decision 0005](0005-assign-card-ids-in-canonical-order.md): with no public exposure yet, aligning identity with canonical position proved to be the cheaper and clearer contract.
- Claim a manufacturer-independent official order. No universal new-deck order exists, so the project adopts one commonly reported USPCC-style convention and fixes its orientation explicitly.

## Consequences

Deck numbers generated under decision 0002 change meaning. This compatibility break is accepted before deck-number links are released publicly; after this decision ships, the new ordering is a published compatibility contract.

The first deck is recognizable when displayed, and the midpoint reversal becomes useful executable documentation. Tests must enumerate every suit run and confirm that every card ID appears exactly once.

## Evidence

- Card-domain tests verify all four ordered runs, endpoint cards, uniqueness, and immutability.
- The adopted sequence is reported in [New Deck Order for Playing Cards Explained](https://ambitiouswithcards.com/new-deck-order/), including viewing orientation and non-playing cards. This secondary source describes common practice rather than a manufacturer specification.

## Related Material

- [Production launch plan](../plans/completed/2026-08-28-production-launch.md)
- [Factoradic permutation indexing](0003-use-factoradic-permutation-indexing.md)
