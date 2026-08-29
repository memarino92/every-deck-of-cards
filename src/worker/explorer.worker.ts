import { unrankBatchIncremental } from './batch.ts'

/**
 * Explorer worker entry point.
 *
 * Receives batch requests, unranked the requested decks via the incremental
 * producer (yielding between decks so a superseding request is picked up
 * promptly), and posts the card buffer back as a transferable object so the
 * bytes move without a structured clone. A new request supersedes any
 * in-flight one: the worker echoes the request's `seq`, and the client drops
 * responses whose `seq` is no longer current. Here the latest `seq` also cancels
 * a partially-computed batch early, so fast scrolling stays responsive.
 */

export interface BatchRequest {
  readonly seq: number
  readonly startIndex: bigint
  readonly count: number
}

export interface BatchResponse {
  readonly seq: number
  readonly startIndex: bigint
  readonly count: number
  readonly cards: Uint8Array
}

function isBatchRequest(value: unknown): value is BatchRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate['seq'] === 'number' &&
    typeof candidate['startIndex'] === 'bigint' &&
    typeof candidate['count'] === 'number'
  )
}

const scope = self as unknown as {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<unknown>) => void,
  ): void
  postMessage(message: BatchResponse, transfer: Transferable[]): void
}

// The newest request seq received; an in-flight batch cancels when this moves.
let latestSeq = 0

scope.addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = event.data

  if (!isBatchRequest(request)) {
    return
  }

  latestSeq = request.seq
  const seq = request.seq

  void unrankBatchIncremental(
    request.startIndex,
    request.count,
    () => seq !== latestSeq,
  ).then((batch) => {
    // A superseded batch resolves to undefined and is never posted.
    if (batch === undefined || seq !== latestSeq) {
      return undefined
    }

    const response: BatchResponse = {
      seq,
      startIndex: batch.startIndex,
      count: batch.count,
      cards: batch.cards,
    }

    scope.postMessage(response, [batch.cards.buffer])

    return undefined
  })
})
