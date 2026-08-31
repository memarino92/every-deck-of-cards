import { unrankBatchIncremental } from './batch.ts'

/**
 * Explorer worker entry point.
 *
 * Receives batch requests, unranked the requested decks via the incremental
 * producer, and posts the card buffer back as a transferable object so the
 * bytes move without a structured clone. The worker echoes the request's
 * `seq`; the client drops stale responses. Requests are coalesced to one
 * latest pending request, and the producer yields to the worker task queue
 * between chunks so newer messages can cancel stale work before it completes.
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

// The newest request seq received; a running batch stops if this has changed.
let latestSeq = 0
let latestRequest: BatchRequest | undefined
let processing = false

interface SchedulerLike {
  yield(): Promise<void>
}

/** Yield to tasks (not just microtasks) so queued `message` events can run. */
function yieldToWorkerTasks(): Promise<void> {
  const scheduler = (
    globalThis as typeof globalThis & {
      scheduler?: SchedulerLike
    }
  ).scheduler

  return scheduler?.yield() ?? new Promise((resolve) => setTimeout(resolve, 0))
}

async function processLatestRequest(): Promise<void> {
  processing = true

  try {
    while (latestRequest !== undefined) {
      const request = latestRequest
      latestRequest = undefined
      const seq = request.seq
      // eslint-disable-next-line no-await-in-loop -- batches must run sequentially so pending requests coalesce
      const batch = await unrankBatchIncremental(
        request.startIndex,
        request.count,
        () => seq !== latestSeq,
        yieldToWorkerTasks,
      )

      if (batch === undefined || seq !== latestSeq) {
        continue
      }

      const response: BatchResponse = {
        seq,
        startIndex: batch.startIndex,
        count: batch.count,
        cards: batch.cards,
      }

      scope.postMessage(response, [batch.cards.buffer])
    }
  } finally {
    processing = false
  }
}

scope.addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = event.data

  if (!isBatchRequest(request)) {
    return
  }

  latestSeq = request.seq
  latestRequest = request

  if (!processing) {
    void processLatestRequest()
  }
})
