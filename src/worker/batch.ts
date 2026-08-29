import { CARD_COUNT, CANONICAL_DECK } from '../domain/cards.ts'
import { DECK_COUNT } from '../domain/deck-number.ts'
import { nextPermutation, unrankPermutation } from '../domain/permutation.ts'

/**
 * Pure batch production for the explorer worker.
 *
 * A batch covers `count` consecutive decks from `startIndex`. Because the
 * explorer scrolls through adjacent indices, only the first deck needs a full
 * factoradic unrank; each following deck is one cheap lexicographic step from
 * the previous via `nextPermutation`. The result is a flat `Uint8Array` of
 * `count * CARD_COUNT` card IDs. This is kept separate from the worker
 * transport so it is directly testable on the main thread.
 */

export interface Batch {
  readonly startIndex: bigint
  readonly count: number
  /** Flat card IDs: deck d occupies [d*CARD_COUNT, (d+1)*CARD_COUNT). */
  readonly cards: Uint8Array
}

export function clampBatchCount(startIndex: bigint, count: number): number {
  if (typeof startIndex !== 'bigint' || startIndex < 0n) {
    throw new RangeError('Start index must be a non-negative bigint')
  }

  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new RangeError('Count must be a positive safe integer')
  }

  const remaining = DECK_COUNT - startIndex

  if (remaining <= 0n) {
    return 0
  }

  const requested = BigInt(count)

  return Number(requested < remaining ? requested : remaining)
}

function writeDeck(
  cards: Uint8Array,
  deck: number,
  ordering: readonly number[],
): void {
  const offset = deck * CARD_COUNT

  for (let position = 0; position < CARD_COUNT; position += 1) {
    cards[offset + position] = ordering[position] as number
  }
}

export function unrankBatch(startIndex: bigint, count: number): Batch {
  const resolvedCount = clampBatchCount(startIndex, count)
  const cards = new Uint8Array(resolvedCount * CARD_COUNT)

  if (resolvedCount === 0) {
    return Object.freeze({ startIndex, count: 0, cards })
  }

  const ordering = [...unrankPermutation(CANONICAL_DECK, startIndex)]

  for (let deck = 0; deck < resolvedCount; deck += 1) {
    writeDeck(cards, deck, ordering)

    if (deck + 1 < resolvedCount) {
      nextPermutation(ordering)
    }
  }

  return Object.freeze({ startIndex, count: resolvedCount, cards })
}

/**
 * Like `unrankBatch`, but yields to the event loop every few decks so a
 * superseding request is picked up promptly during fast scroll. `shouldCancel`
 * abandons a superseded batch early; when it returns true the partially filled
 * buffer is discarded and the promise resolves to `undefined`. The default
 * yield is a microtask, cheap enough that a full window stays sub-millisecond.
 */
export async function unrankBatchIncremental(
  startIndex: bigint,
  count: number,
  shouldCancel: () => boolean,
  yieldControl: () => Promise<void> = () => Promise.resolve(),
): Promise<Batch | undefined> {
  const resolvedCount = clampBatchCount(startIndex, count)
  const cards = new Uint8Array(resolvedCount * CARD_COUNT)

  if (resolvedCount === 0) {
    return Object.freeze({ startIndex, count: 0, cards })
  }

  const ordering = [...unrankPermutation(CANONICAL_DECK, startIndex)]

  for (let deck = 0; deck < resolvedCount; deck += 1) {
    if (shouldCancel()) {
      return undefined
    }

    writeDeck(cards, deck, ordering)

    if (deck + 1 < resolvedCount) {
      nextPermutation(ordering)

      // Yield every few decks so the worker can receive a superseding request.
      if (deck % 4 === 3) {
        // eslint-disable-next-line no-await-in-loop -- intentional cooperative yield between decks
        await yieldControl()
      }
    }
  }

  return Object.freeze({ startIndex, count: resolvedCount, cards })
}
