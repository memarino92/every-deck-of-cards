import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onSettled,
} from 'solid-js'

import { CARD_COUNT, type CardId } from '../domain/cards.ts'
import {
  DeckBatchSource,
  type WorkerFactory,
} from '../worker/DeckBatchSource.ts'
import { BatchCancelledError, type BatchResponse } from '../worker/protocol.ts'

export interface RowRange {
  readonly start: bigint
  readonly count: number
}

function createExplorerWorker(): Worker {
  return new Worker(new URL('../worker/explorer.worker.ts', import.meta.url), {
    type: 'module',
  })
}

function decodeRows(
  response: BatchResponse,
): ReadonlyMap<bigint, readonly CardId[]> {
  if (
    !Number.isSafeInteger(response.count) ||
    response.count < 0 ||
    response.cards.length !== response.count * CARD_COUNT
  )
    throw new Error('Invalid card buffer')
  const rows = new Map<bigint, readonly CardId[]>()
  for (let row = 0; row < response.count; row += 1) {
    const cards = Array.from(
      response.cards.subarray(row * CARD_COUNT, (row + 1) * CARD_COUNT),
    )
    if (
      cards.some((id) => id >= CARD_COUNT) ||
      new Set(cards).size !== CARD_COUNT
    ) {
      throw new Error('Invalid deck in card buffer')
    }
    rows.set(response.startIndex + BigInt(row), cards as CardId[])
  }
  return rows
}

/** Owns worker lifetime, stale completions, row decoding, bounded storage and retry. */
export function createDeckRows(
  range: () => RowRange,
  factory: WorkerFactory = createExplorerWorker,
) {
  const start = createMemo(() => range().start)
  const count = createMemo(() => range().count)
  const [rows, setRows] = createSignal<ReadonlyMap<bigint, readonly CardId[]>>(
    new Map(),
  )
  const [source, setSource] = createSignal<DeckBatchSource>()
  const [failed, setFailed] = createSignal(false)
  let generation = 0
  let disposed = false

  function retry(): void {
    if (disposed) return
    generation += 1
    source()?.terminate()
    setSource(undefined)
    setFailed(false)
    try {
      setSource(new DeckBatchSource(factory))
    } catch {
      setFailed(true)
    }
  }

  onSettled(retry)
  onCleanup(() => {
    disposed = true
    generation += 1
    source()?.terminate()
  })

  createEffect(
    () => [start(), count(), source()] as const,
    ([first, length, worker]) => {
      const run = ++generation
      const end = first + BigInt(length)
      const inRange = (index: bigint): boolean => index >= first && index < end
      setRows(
        (previous) =>
          new Map([...previous].filter(([index]) => inRange(index))),
      )
      if (worker === undefined) return
      void worker
        .request(first, length)
        .then((response) => {
          if (disposed || run !== generation) return undefined
          if (response.startIndex !== first || response.count !== length)
            throw new Error('Invalid batch range')
          const decoded = decodeRows(response)
          setRows(decoded)
          setFailed(false)
          return undefined
        })
        .catch((error) => {
          if (
            !disposed &&
            run === generation &&
            !(error instanceof BatchCancelledError)
          )
            setFailed(true)
        })
    },
  )

  return { cardsFor: (index: bigint) => rows().get(index), failed, retry }
}
