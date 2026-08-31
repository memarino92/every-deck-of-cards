import { render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { CARD_COUNT } from '@/domain/cards.ts'
import { stripRange, createPosition } from '@/virtualization/position.ts'
import { unrankBatch } from '@/worker/batch.ts'
import type { BatchRequest, BatchResponse } from '@/worker/explorer.worker.ts'

// The router provides useSearchParams; render the page inside a memory-history
// router primed to / so the explorer mounts the way it does in production.
import { createRouter, memoryHistory } from '@solidjs/router'
import { cleanup } from '@solidjs/testing-library'

import { ExplorerPage } from '@/ExplorerPage.tsx'

/**
 * Regression test for the initial-load stall: the explorer must issue a worker
 * request on mount and populate rows, even though the position does not change
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
  const Router = createRouter({
    routes: [{ path: '/', component: ExplorerPage }],
    history: memoryHistory('/'),
  })

  render(() => <Router>{(props) => props.children}</Router>)
}

// The feed measures itself; jsdom reports zero heights, so stub a viewport
// tall enough for several rows. The expected strip comes from the same pure
// math the component uses.
const STUBBED_FEED_HEIGHT = 800
const ROW_HEIGHT = 148
const OVERSCAN_ROWS = 8
const EXPECTED_STRIP = stripRange(
  createPosition(0n, 0),
  STUBBED_FEED_HEIGHT,
  ROW_HEIGHT,
  OVERSCAN_ROWS,
)

describe('ExplorerPage initial load', () => {
  let fakeWorker: FakeWorker
  let clientHeightSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fakeWorker = new FakeWorker()
    const workerRef = fakeWorker
    // The page constructs `new Worker(...)`; the stub must be a constructor.
    vi.stubGlobal('Worker', function (this: unknown) {
      return workerRef
    } as unknown as typeof Worker)
    clientHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(STUBBED_FEED_HEIGHT)
  })

  afterEach(() => {
    cleanup()
    clientHeightSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('requests a batch on mount without requiring a position change', async () => {
    renderExplorer()

    await waitFor(() => {
      expect(fakeWorker.requests.length).toBeGreaterThan(0)
    })

    // The first request covers the strip starting at deck 1 (index 0).
    expect(fakeWorker.requests[0]?.startIndex).toBe(0n)
    expect(fakeWorker.requests[0]?.count).toBe(EXPECTED_STRIP.count)
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

    // The strip is full: every rendered row fans 52 cards.
    expect(document.querySelectorAll('.deck-row').length).toBe(
      EXPECTED_STRIP.count,
    )
    expect(document.querySelectorAll('.playing-card').length).toBe(
      EXPECTED_STRIP.count * CARD_COUNT,
    )
  })
})
