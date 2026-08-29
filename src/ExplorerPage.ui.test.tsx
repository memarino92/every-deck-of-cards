// @vitest-environment jsdom
import { render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CARD_COUNT } from '@/domain/cards.ts'
import { unrankBatch } from '@/worker/batch.ts'
import type { BatchRequest, BatchResponse } from '@/worker/explorer.worker.ts'

// The router provides useSearchParams; render the page inside a memory router
// primed to /explore so the explorer mounts the way it does in production.
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { cleanup } from '@solidjs/testing-library'

import { ExplorerPage } from '@/ExplorerPage.tsx'

/**
 * Regression test for the initial-load stall: the explorer must issue a worker
 * request on mount and populate rows, even though the anchor does not change
 * (the requested deck is already current). Previously the request effect was
 * keyed only on the anchor, so the first request never fired until the visitor
 * clicked Random or Jump.
 */
class FakeWorker {
  public requests: BatchRequest[] = []
  #listeners = new Map<string, (event: MessageEvent<BatchResponse>) => void>()

  public postMessage(message: BatchRequest): void {
    this.requests.push(message)
    const batch = unrankBatch(message.startIndex, message.count)
    const response: BatchResponse = {
      seq: message.seq,
      startIndex: batch.startIndex,
      count: batch.count,
      cards: batch.cards,
    }
    // Respond synchronously so the test does not depend on timers; Solid still
    // applies the resulting signal update before the assertions run.
    this.#listeners.get('message')?.({
      data: response,
    } as MessageEvent<BatchResponse>)
  }

  public addEventListener(
    type: string,
    listener: (event: MessageEvent<BatchResponse>) => void,
  ): void {
    this.#listeners.set(type, listener)
  }

  public terminate(): void {}
}

function renderExplorer(): void {
  const history = createMemoryHistory()
  history.set({ value: '/explore', scroll: false, replace: true })

  render(() => (
    <MemoryRouter history={history}>
      <Route path="/explore" component={ExplorerPage} />
    </MemoryRouter>
  ))
}

describe('ExplorerPage initial load', () => {
  let fakeWorker: FakeWorker

  beforeEach(() => {
    fakeWorker = new FakeWorker()
    const workerRef = fakeWorker
    // The page constructs `new Worker(...)`; the stub must be a constructor.
    vi.stubGlobal('Worker', function (this: unknown) {
      return workerRef
    } as unknown as typeof Worker)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('requests a batch on mount without requiring an anchor change', async () => {
    renderExplorer()

    await waitFor(() => {
      expect(fakeWorker.requests.length).toBeGreaterThan(0)
    })

    // The first request covers the window starting at deck 1 (index 0).
    expect(fakeWorker.requests[0]?.startIndex).toBe(0n)
  })

  it('renders card rows after the initial batch resolves', async () => {
    renderExplorer()

    // Flush the resolved worker promise and let Solid apply the update.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await waitFor(() => {
      expect(screen.queryAllByText('Shuffling…').length).toBe(0)
    })

    // Deck 1's face card (ace of spades) is present in the first row.
    const faces = await screen.findAllByLabelText('A of spades')
    expect(faces.length).toBeGreaterThan(0)

    // The window is full: 24 rows each contribute 52 card faces.
    expect(document.querySelectorAll('.playing-card').length).toBe(
      24 * CARD_COUNT,
    )
  })
})
