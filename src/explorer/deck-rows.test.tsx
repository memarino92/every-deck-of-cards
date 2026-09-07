import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { unrankBatch } from '../worker/batch.ts'
import type { WorkerLike } from '../worker/DeckBatchSource.ts'
import type { BatchRequest, BatchResponse } from '../worker/protocol.ts'
import { createDeckRows } from './deck-rows.ts'

class ControlledWorker implements WorkerLike {
  requests: BatchRequest[] = []
  terminated = false
  message: ((event: MessageEvent<BatchResponse>) => void) | undefined
  error: ((event: ErrorEvent) => void) | undefined
  postMessage(request: BatchRequest): void {
    this.requests.push(request)
  }
  terminate(): void {
    this.terminated = true
  }
  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<BatchResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message')
      this.message = listener as (event: MessageEvent<BatchResponse>) => void
    else this.error = listener as (event: ErrorEvent) => void
  }
  respond(request = this.requests.at(-1)!): void {
    const batch = unrankBatch(request.startIndex, request.count)
    this.message?.({
      data: { ...batch, seq: request.seq },
    } as MessageEvent<BatchResponse>)
  }
  fail(): void {
    this.error?.({ message: 'Failed worker' } as ErrorEvent)
  }
}

afterEach(cleanup)

describe('deck row resource', () => {
  it('surfaces failure, recreates the worker on retry, and ignores the old worker', async () => {
    const workers: ControlledWorker[] = []
    render(() => {
      const rows = createDeckRows(
        () => ({ start: 0n, count: 1 }),
        () => {
          const worker = new ControlledWorker()
          workers.push(worker)
          return worker
        },
      )
      return (
        <>
          <output>
            {rows.failed()
              ? 'failed'
              : (rows.cardsFor(0n)?.length ?? 'loading')}
          </output>
          <button onClick={rows.retry}>Retry</button>
        </>
      )
    })
    await waitFor(() => expect(workers[0]?.requests).toHaveLength(1))
    workers[0]!.fail()
    await screen.findByText('failed')
    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(workers[0]!.terminated).toBe(true)
    workers[0]!.respond()
    expect(screen.getByRole('status').textContent).toBe('loading')
    await waitFor(() => expect(workers[1]?.requests).toHaveLength(1))
    workers[1]!.respond()
    await screen.findByText('52')
    cleanup()
    expect(workers[1]!.terminated).toBe(true)
  })

  it('drops superseded batches and evicts rows when the strip leaves them', async () => {
    const worker = new ControlledWorker()
    render(() => {
      const [start, setStart] = createSignal(0n)
      const rows = createDeckRows(
        () => ({ start: start(), count: 1 }),
        () => worker,
      )
      return (
        <>
          <output>
            {rows.failed()
              ? 'failed'
              : (rows.cardsFor(start())?.join(',') ?? 'loading')}
          </output>
          <span>
            {rows.cardsFor(0n) === undefined ? 'zero absent' : 'zero cached'}
          </span>
          <button onClick={() => setStart(1n)}>Next strip</button>
          <button onClick={() => setStart(2n)}>Later strip</button>
        </>
      )
    })
    await waitFor(() => expect(worker.requests).toHaveLength(1))
    worker.respond()
    await screen.findByText('zero cached')
    await fireEvent.click(screen.getByRole('button', { name: 'Next strip' }))
    await waitFor(() => expect(worker.requests).toHaveLength(2))
    const superseded = worker.requests[1]!
    await fireEvent.click(screen.getByRole('button', { name: 'Later strip' }))
    await waitFor(() => expect(worker.requests).toHaveLength(3))
    worker.respond(superseded)
    expect(screen.getByRole('status').textContent).toBe('loading')
    worker.respond()
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        Array.from(unrankBatch(2n, 1).cards).join(','),
      ),
    )
    expect(screen.getByText('zero absent')).toBeDefined()
  })

  it('reports worker construction failure as a retryable state', async () => {
    render(() => {
      const rows = createDeckRows(
        () => ({ start: 0n, count: 1 }),
        () => {
          throw new Error('Cannot create worker')
        },
      )
      return <output>{rows.failed() ? 'failed' : 'loading'}</output>
    })
    expect(await screen.findByText('failed')).toBeDefined()
  })
})
