import type { BatchRequest, BatchResponse } from './explorer.worker.ts'

/**
 * Client-side owner of the explorer worker.
 *
 * Owns the request sequence and drops superseded responses: each request
 * increments `seq`, and a response is delivered only while its `seq` is still
 * the latest issued. This is where cancellation lives — a stale response is
 * discarded, never applied.
 */

export interface WorkerLike {
  postMessage(message: BatchRequest, transfer: Transferable[]): void
  terminate(): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<BatchResponse>) => void,
  ): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
}

export type WorkerFactory = () => WorkerLike

interface PendingRequest {
  readonly resolve: (batch: BatchResponse) => void
  readonly reject: (error: Error) => void
}

export class DeckBatchSource {
  readonly #worker: WorkerLike
  #seq = 0
  #pending: PendingRequest | undefined

  public constructor(createWorker: WorkerFactory) {
    this.#worker = createWorker()
    this.#worker.addEventListener(
      'message',
      (event: MessageEvent<BatchResponse>) => {
        this.#handleResponse(event.data)
      },
    )
    this.#worker.addEventListener('error', (event: ErrorEvent) => {
      this.#pending?.reject(
        new Error(event.message || 'Explorer worker failed'),
      )
      this.#pending = undefined
    })
  }

  /**
   * Request `count` decks starting at `startIndex`. Any earlier in-flight
   * request is superseded: its promise rejects with a supersession error and
   * its eventual response is dropped.
   */
  public request(startIndex: bigint, count: number): Promise<BatchResponse> {
    this.#pending?.reject(new Error('Superseded by a newer batch request'))

    this.#seq += 1
    const seq = this.#seq

    const promise = new Promise<BatchResponse>((resolve, reject) => {
      this.#pending = { resolve, reject }
    })

    const message: BatchRequest = { seq, startIndex, count }
    this.#worker.postMessage(message, [])

    return promise
  }

  #handleResponse(response: BatchResponse): void {
    if (response.seq !== this.#seq || this.#pending === undefined) {
      return
    }

    const pending = this.#pending
    this.#pending = undefined
    pending.resolve(response)
  }

  public terminate(): void {
    this.#pending?.reject(new Error('Explorer worker terminated'))
    this.#pending = undefined
    this.#worker.terminate()
  }
}
