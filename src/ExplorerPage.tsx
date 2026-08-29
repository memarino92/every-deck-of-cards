import { useSearchParams } from '@solidjs/router'
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
} from 'solid-js'

import { CARD_COUNT, type CardId } from './domain/cards.ts'
import {
  LAST_DECK_NUMBER,
  permutationIndexToPublicDeckNumber,
} from './domain/deck-number.ts'
import { PlayingCard } from './PlayingCard.tsx'
import { parseDeckNumberParam } from './virtualization/deck-param.ts'
import {
  createWindowGeometry,
  logicalIndexAt,
  recenteredAnchor,
  windowStart,
} from './virtualization/window.ts'
import { DeckBatchSource } from './worker/DeckBatchSource.ts'
import type { BatchResponse } from './worker/explorer.worker.ts'

/** Pixel height of one deck row; scroll math divides scrollTop by this. */
const ROW_HEIGHT = 148
/** Rendered rows including overscan; each row fans 52 cards, so keep small. */
const PHYSICAL_ROWS = 24
const OVERSCAN = 6

const geometry = createWindowGeometry(PHYSICAL_ROWS, OVERSCAN)

// Superseded or terminated requests are expected during fast scroll.
function ignoreRejection(): void {}

interface DeckRow {
  readonly index: bigint
  readonly cards: Uint8Array | undefined
}

export function ExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams['deck']
  const initialIndex = parseDeckNumberParam(Array.isArray(raw) ? raw[0] : raw)

  const [anchor, setAnchor] = createSignal<bigint>(initialIndex)
  const [batches, setBatches] = createSignal<ReadonlyMap<number, Uint8Array>>(
    new Map(),
  )
  const [jumpValue, setJumpValue] = createSignal(
    permutationIndexToPublicDeckNumber(initialIndex).toString(),
  )

  let scrollEl: HTMLDivElement | undefined
  let source: DeckBatchSource | undefined

  const assignScrollEl = (element: HTMLDivElement): void => {
    scrollEl = element
  }

  const rows = createMemo<readonly DeckRow[]>(() => {
    const result: DeckRow[] = []

    for (let physical = 0; physical < PHYSICAL_ROWS; physical += 1) {
      result.push({
        index: logicalIndexAt(anchor(), physical, geometry),
        cards: batches().get(physical),
      })
    }

    return result
  })

  // Fold a worker response into the buffer for the current window. A response
  // may arrive after the window has shifted, so rows are keyed by the window
  // position in effect when it lands, not when it was requested.
  function handleResponse(response: BatchResponse): void {
    const nextStart = windowStart(anchor(), geometry)
    const next = new Map<number, Uint8Array>()

    for (let deck = 0; deck < response.count; deck += 1) {
      const index = response.startIndex + BigInt(deck)
      const physical = Number(index - nextStart)

      if (physical >= 0 && physical < PHYSICAL_ROWS) {
        next.set(
          physical,
          response.cards.slice(deck * CARD_COUNT, (deck + 1) * CARD_COUNT),
        )
      }
    }

    setBatches(next)
  }

  // The single request path: fetch the window around the anchor on mount and
  // whenever it changes. Stale responses are dropped by the source sequence.
  createEffect(
    on(
      anchor,
      (currentAnchor) => {
        const worker = source

        if (worker === undefined) {
          return
        }

        worker
          .request(windowStart(currentAnchor, geometry), PHYSICAL_ROWS)
          .then(handleResponse)
          .catch(ignoreRejection)
      },
      { defer: false },
    ),
  )

  function handleScroll(): void {
    if (scrollEl === undefined) {
      return
    }

    const scrollRow = scrollEl.scrollTop / ROW_HEIGHT
    const currentAnchor = anchor()
    let next = recenteredAnchor(currentAnchor, scrollRow, geometry)

    // Never anchor above the first deck: that would surface decks numbered
    // below 1 near the top of the space. Settle on the first window instead.
    const minimumAnchor = BigInt(Math.floor(PHYSICAL_ROWS / 2))

    if (next < minimumAnchor) {
      next = minimumAnchor
    }

    if (next === currentAnchor) {
      return
    }

    const currentStart = windowStart(currentAnchor, geometry)

    setAnchor(next)

    // Keep the same logical row under the viewport after re-anchoring. The
    // window start only moves by whole rows, so this offset is exact; when the
    // start is pinned at deck 1 the anchor settles on the window center.
    const nextStart = windowStart(next, geometry)
    const startShift = Number(nextStart - currentStart)

    scrollEl.scrollTop = scrollEl.scrollTop - startShift * ROW_HEIGHT
  }

  function jump(): void {
    const parsed = parseDeckNumberParam(jumpValue())

    setSearchParams({
      deck: permutationIndexToPublicDeckNumber(parsed).toString(),
    })
    setAnchor(parsed)

    if (scrollEl !== undefined) {
      scrollEl.scrollTop = (PHYSICAL_ROWS / 2) * ROW_HEIGHT
    }
  }

  onMount(() => {
    source = new DeckBatchSource(
      () =>
        new Worker(new URL('./worker/explorer.worker.ts', import.meta.url), {
          type: 'module',
        }),
    )

    if (scrollEl !== undefined) {
      scrollEl.scrollTop = (PHYSICAL_ROWS / 2) * ROW_HEIGHT
    }
  })

  onCleanup(() => {
    source?.terminate()
  })

  return (
    <section class="explorer" aria-labelledby="explorer-title">
      <header class="explorer-bar">
        <div class="explorer-heading">
          <p class="eyebrow">The explorer</p>
          <h1 id="explorer-title">Every deck, in order.</h1>
        </div>

        <form
          class="jump"
          onSubmit={(event) => {
            event.preventDefault()
            jump()
          }}
        >
          <label class="jump-field">
            <span>Deck number</span>
            <input
              inputmode="numeric"
              value={jumpValue()}
              onInput={(event) => setJumpValue(event.currentTarget.value)}
            />
          </label>
          <button type="submit">Jump</button>
        </form>

        <p class="explorer-meta">
          <span>1</span> —{' '}
          <span>{LAST_DECK_NUMBER.toLocaleString('en-US')}</span>
        </p>
      </header>

      <div ref={assignScrollEl} class="explorer-scroll" onScroll={handleScroll}>
        <div
          class="explorer-window"
          style={{ height: `${PHYSICAL_ROWS * ROW_HEIGHT}px` }}
        >
          <For each={rows()}>
            {(row) => (
              <div class="deck-row" style={{ height: `${ROW_HEIGHT}px` }}>
                <span class="deck-number">
                  {permutationIndexToPublicDeckNumber(row.index).toLocaleString(
                    'en-US',
                  )}
                </span>
                <div class="deck-fan">
                  {row.cards !== undefined ? (
                    <For each={Array.from(row.cards)}>
                      {(id, position) => (
                        <div
                          class="deck-card"
                          style={{
                            // Deal right-to-left: the first card (face of the
                            // deck) is rightmost, so each card is covered on
                            // its right and you read every top-left upright
                            // pip as you scan left to right.
                            '--position': position(),
                            // The face card (position 0) sits on top.
                            'z-index': 52 - position(),
                          }}
                        >
                          <PlayingCard id={id as CardId} />
                        </div>
                      )}
                    </For>
                  ) : (
                    <span class="deck-loading">Shuffling…</span>
                  )}
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}
