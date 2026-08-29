import { describe, expect, it } from 'vitest'

import { CARD_COUNT, CANONICAL_DECK } from '../domain/cards.ts'
import { DECK_COUNT } from '../domain/deck-number.ts'
import { rankPermutation, unrankPermutation } from '../domain/permutation.ts'
import {
  clampBatchCount,
  unrankBatch,
  unrankBatchIncremental,
} from './batch.ts'
import { DeckBatchSource, type WorkerLike } from './DeckBatchSource.ts'
import type { BatchRequest, BatchResponse } from './explorer.worker.ts'

describe('clampBatchCount', () => {
  it('returns the requested count when enough decks remain', () => {
    expect(clampBatchCount(0n, 50)).toBe(50)
  })

  it('clamps to the decks remaining at the end of the space', () => {
    expect(clampBatchCount(DECK_COUNT - 3n, 50)).toBe(3)
    expect(clampBatchCount(DECK_COUNT - 1n, 1)).toBe(1)
  })

  it('returns zero at the end of the space', () => {
    expect(clampBatchCount(DECK_COUNT, 10)).toBe(0)
  })

  it('rejects invalid inputs', () => {
    expect(() => clampBatchCount(-1n, 10)).toThrow(RangeError)
    expect(() => clampBatchCount(0n, 0)).toThrow(RangeError)
    expect(() => clampBatchCount(0n, 1.5)).toThrow(RangeError)
  })
})

describe('unrankBatch', () => {
  it('produces a flat buffer of count * 52 card IDs', () => {
    const batch = unrankBatch(0n, 4)

    expect(batch.count).toBe(4)
    expect(batch.cards).toBeInstanceOf(Uint8Array)
    expect(batch.cards).toHaveLength(4 * CARD_COUNT)
  })

  it('places each deck in canonical order within the buffer', () => {
    const batch = unrankBatch(7n, 3)

    for (let deck = 0; deck < batch.count; deck += 1) {
      const expected = unrankPermutation(CANONICAL_DECK, 7n + BigInt(deck))

      for (let position = 0; position < CARD_COUNT; position += 1) {
        expect(batch.cards[deck * CARD_COUNT + position]).toBe(
          expected[position],
        )
      }
    }
  })

  it('round-trips every card group back to its index', () => {
    const start = DECK_COUNT / 2n
    const batch = unrankBatch(start, 5)

    for (let deck = 0; deck < batch.count; deck += 1) {
      const ordering = Array.from(
        batch.cards.slice(deck * CARD_COUNT, (deck + 1) * CARD_COUNT),
      )

      expect(rankPermutation(CANONICAL_DECK, ordering)).toBe(
        start + BigInt(deck),
      )
    }
  })

  it('contains only valid card IDs', () => {
    const batch = unrankBatch(123_456n, 8)

    for (const id of batch.cards) {
      expect(id).toBeGreaterThanOrEqual(0)
      expect(id).toBeLessThan(CARD_COUNT)
    }
  })

  it('clamps the final batch at the end of the space', () => {
    const batch = unrankBatch(DECK_COUNT - 2n, 10)

    expect(batch.count).toBe(2)
    expect(batch.cards).toHaveLength(2 * CARD_COUNT)
  })

  it('matches independent unrank for every deck in a wide window', () => {
    // Wide enough to cross suit-run boundaries where many positions change.
    const start = 5_000_000n
    const batch = unrankBatch(start, 128)

    for (let deck = 0; deck < batch.count; deck += 1) {
      const expected = unrankPermutation(CANONICAL_DECK, start + BigInt(deck))

      for (let position = 0; position < CARD_COUNT; position += 1) {
        expect(batch.cards[deck * CARD_COUNT + position]).toBe(
          expected[position],
        )
      }
    }
  })
})

// Hoisted so the lint scoping rule sees stable, capture-free helpers.
const noCancel = () => false
// A synchronous yield keeps the incremental tests deterministic and fast.
const syncYield = () => Promise.resolve()

describe('unrankBatchIncremental', () => {
  it('produces a buffer identical to the synchronous batch', async () => {
    const start = 9_876n
    const incremental = await unrankBatchIncremental(
      start,
      6,
      noCancel,
      syncYield,
    )
    const synchronous = unrankBatch(start, 6)

    expect(incremental).toBeDefined()
    expect(incremental?.count).toBe(synchronous.count)
    expect(Array.from(incremental?.cards ?? [])).toEqual(
      Array.from(synchronous.cards),
    )
  })

  it('cancels early when the cancellation flag flips', async () => {
    let cancel = false
    const result = await unrankBatchIncremental(
      0n,
      10,
      () => cancel,
      async () => {
        // Cancel after the first deck has been produced.
        cancel = true
      },
    )

    expect(result).toBeUndefined()
  })

  it('completes when never cancelled', async () => {
    const result = await unrankBatchIncremental(0n, 3, noCancel, syncYield)

    expect(result?.count).toBe(3)
    expect(result?.cards).toHaveLength(3 * CARD_COUNT)
  })
})

/** A fake worker that runs `unrankBatch` synchronously on the next tick. */
function createFakeWorker(): WorkerLike & {
  readonly requests: BatchRequest[]
} {
  const requests: BatchRequest[] = []
  let messageListener:
    ((event: MessageEvent<BatchResponse>) => void) | undefined

  const worker: WorkerLike & { requests: BatchRequest[] } = {
    requests,
    postMessage(message: BatchRequest) {
      requests.push(message)
      const batch = unrankBatch(message.startIndex, message.count)
      const response: BatchResponse = {
        seq: message.seq,
        startIndex: batch.startIndex,
        count: batch.count,
        cards: batch.cards,
      }
      queueMicrotask(() =>
        messageListener?.({ data: response } as MessageEvent<BatchResponse>),
      )
    },
    terminate() {},
    addEventListener(
      type: 'message' | 'error',
      listener:
        | ((event: MessageEvent<BatchResponse>) => void)
        | ((event: ErrorEvent) => void),
    ) {
      if (type === 'message') {
        messageListener = listener as (
          event: MessageEvent<BatchResponse>,
        ) => void
      }
    },
  }

  return worker
}

describe('DeckBatchSource', () => {
  it('resolves a batch with matching data', async () => {
    const source = new DeckBatchSource(createFakeWorker)
    const batch = await source.request(0n, 3)

    expect(batch.count).toBe(3)
    expect(batch.startIndex).toBe(0n)
    expect(batch.cards).toHaveLength(3 * CARD_COUNT)
    source.terminate()
  })

  it('rejects a superseded request and resolves the newer one', async () => {
    const source = new DeckBatchSource(createFakeWorker)

    const first = source.request(0n, 2)
    const second = source.request(10n, 2)

    await expect(first).rejects.toThrow(/Superseded/)
    const batch = await second

    expect(batch.startIndex).toBe(10n)
    source.terminate()
  })

  it('drops a response whose sequence is no longer current', async () => {
    const worker = createFakeWorker()
    const source = new DeckBatchSource(() => worker)

    const first = source.request(0n, 2)
    const second = source.request(20n, 2)

    await expect(first).rejects.toThrow(/Superseded/)
    const batch = await second

    // The first response is dropped; the resolved batch is the newer request.
    expect(batch.startIndex).toBe(20n)
    source.terminate()
  })

  it('rejects the pending request on terminate', async () => {
    // A worker that never responds keeps the request in flight.
    const silent: WorkerLike = {
      postMessage() {},
      terminate() {},
      addEventListener() {},
    }
    const source = new DeckBatchSource(() => silent)
    const pending = source.request(0n, 1)

    source.terminate()

    await expect(pending).rejects.toThrow(/terminated/)
  })
})
