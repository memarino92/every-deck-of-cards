import { CANONICAL_DECK } from '../domain/cards.ts'
export function shuffleLiftForCard(id: number): number {
  return id < CANONICAL_DECK.length / 2
    ? -(18 + (id % 5) * 3)
    : 10 + (id % 5) * 2
}
