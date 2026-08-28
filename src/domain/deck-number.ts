import { CARD_COUNT } from './cards.ts'
import { factorial } from './factorial.ts'

export const DECK_COUNT = factorial(CARD_COUNT)
export const FIRST_DECK_NUMBER = 1n
export const LAST_DECK_NUMBER = DECK_COUNT

export function publicDeckNumberToIndex(deckNumber: bigint): bigint {
  if (
    typeof deckNumber !== 'bigint' ||
    deckNumber < FIRST_DECK_NUMBER ||
    deckNumber > LAST_DECK_NUMBER
  ) {
    throw new RangeError(`Deck number must be from 1 through ${DECK_COUNT}`)
  }

  return deckNumber - 1n
}

export function permutationIndexToPublicDeckNumber(index: bigint): bigint {
  if (typeof index !== 'bigint' || index < 0n || index >= DECK_COUNT) {
    throw new RangeError(
      `Permutation index must be from 0 through ${DECK_COUNT - 1n}`,
    )
  }

  return index + 1n
}
