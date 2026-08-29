# 0005: Assign card IDs sequentially in canonical deck order

- Status: accepted
- Date: 2026-08-28
- Supersedes: the card-identity half of [0004: Use new-deck canonical order](0004-use-new-deck-canonical-order.md), which had retained the suit-major IDs of [0002](0002-define-canonical-card-order.md)

## Context

Decision 0004 established the adopted USPCC-style new-deck order as the canonical permutation sequence, but deliberately retained card IDs in the earlier suit-major order (clubs 0–12, diamonds 13–25, hearts 26–38, spades 39–51) to keep card identity stable. The result is that `CANONICAL_DECK` — public deck `1` — is a non-sequential list of IDs such as `[39, 40, …, 51, 13, …, 25, 12, …, 0, 38, …, 26]`.

That split identity is a permanent tax on every explanation the project exists to tell:

- The factoradic explainer must open with a lookup table before it can show that deck `1` unravels from index `0`.
- `cardFromId` cannot resolve a card in constant time by direct indexing into canonical position; ID-to-card and canonical-position-to-card become separate mappings to teach, test, and maintain.
- Readers reasonably expect the canonical deck's IDs to read `0, 1, 2, …, 51`. Anything else looks like a bug.

Card IDs have never been published: the application exposes no deck numbers, links, or serialized IDs yet. This is the final opportunity to unify identity and canonical position before both become a compatibility contract.

## Decision

Card IDs are assigned sequentially in canonical deck order: the card at canonical position `p` has ID `p`. The ace of spades is ID `0` and the ace of hearts is ID `51`.

`CANONICAL_DECK` is therefore the identity sequence `[0, 1, …, 51]`. It is retained as a frozen, tested export because the rest of the domain and the explainer material refer to it by name, and because it documents that the canonical permutation is the identity permutation over card IDs.

Both halves of the compatibility contract are now fixed before public exposure: the canonical sequence (decision 0004) and card identity (this decision). After this decision ships, neither may change without breaking published deck numbers.

## Alternatives Considered

- Keep suit-major IDs with a lookup to canonical order (status quo). Preserves decision 0002 identity but leaves every future reader, test, and talk slide reconciling two orderings forever.
- Drop `CANONICAL_DECK` entirely once it is the identity. Rejected: the named constant is the domain's statement of deck `1`, and tests assert its contract directly.
- Renumber ranks or suits within the new order. The canonical sequence itself is fixed by decision 0004; only ID assignment is in scope here.

## Consequences

- Deck `1` unranked from index `0n` yields card IDs `[0..51]` in order; the factoradic walkthrough can use card IDs directly as its symbols.
- `cardFromId` remains a bounds-checked direct index into `CARDS`, and `CARDS[id]` continues to hold because `CARDS` is now defined in canonical order.
- Public deck-number meaning is unchanged from decision 0004; the permutation bijection is untouched. Only the labels on the cards move.
- Existing card-domain tests are rewritten to assert sequential IDs in canonical order and the identity property of `CANONICAL_DECK`.
- Suit-major order remains visible only as the historical content of superseded decision 0002.

## Evidence

- Card-domain tests assert `CANONICAL_DECK` equals `[0..51]`, that every card's ID equals its canonical position, and that the four ordered suit runs of decision 0004 still hold.
- Exhaustive permutation round trips through eight values and representative 52-card indices are unaffected, confirming the bijection is independent of ID assignment.

## Related Material

- [Use new-deck canonical order](0004-use-new-deck-canonical-order.md)
- [Define canonical card order (superseded)](0002-define-canonical-card-order.md)
- [Permutation domain plan](../plans/active/2026-08-28-permutation-domain.md)
