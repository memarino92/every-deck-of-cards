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
import { cryptoEntropy, randomPermutationIndex } from './domain/random.ts'
import { PlayingCard } from './PlayingCard.tsx'
import { parseDeckNumberParam } from './virtualization/deck-param.ts'
import {
  clampAnchor,
  createWindowGeometry,
  logicalIndexAt,
  recenteredAnchor,
  windowStart,
} from './virtualization/window.ts'
import { DeckBatchSource } from './worker/DeckBatchSource.ts'
import type { BatchResponse } from './worker/explorer.worker.ts'

/** Pixel height of one deck row; scroll math divides scrollTop by this. */
const ROW_HEIGHT = 148
/** Rendered rows; each row fans 52 cards, so keep the window small. */
const PHYSICAL_ROWS = 24

const geometry = createWindowGeometry(PHYSICAL_ROWS)

// Superseded or terminated requests are expected during fast scroll.
function ignoreRejection(): void {}

interface DeckRow {
  readonly index: bigint
  readonly cards: Uint8Array | undefined
}

/**
 * The anchor is the deck under the viewport's top edge. The physical window
 * holds `PHYSICAL_ROWS` rows with `windowStart(anchor)` the first rendered
 * row; the anchor sits `floor(PHYSICAL_ROWS / 2)` rows into the window so
 * there is scroll margin on both sides. On each scroll event the window
 * recenters onto the deck under the viewport's center.
 */
export function ExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams['deck']
  const requestedIndex = parseDeckNumberParam(Array.isArray(raw) ? raw[0] : raw)

  // Anchor the requested deck, then place the viewport so that deck sits at
  // the top. windowStart() clamps near deck 1, so the offset from the window
  // start to the deck is the source of truth for where to scroll to.
  const [anchor, setAnchor] = createSignal<bigint>(requestedIndex)

  const [batches, setBatches] = createSignal<ReadonlyMap<number, Uint8Array>>(
    new Map(),
  )
  const [jumpValue, setJumpValue] = createSignal(
    permutationIndexToPublicDeckNumber(requestedIndex).toString(),
  )

  let scrollEl: HTMLDivElement | undefined

  const assignScrollEl = (element: HTMLDivElement): void => {
    scrollEl = element
  }

  // The worker source is a signal so the request effect re-runs when the
  // worker is created on mount — the initial window must not wait for an
  // anchor change that never comes when the requested deck is already current.
  const [source, setSource] = createSignal<DeckBatchSource | undefined>(
    undefined,
  )

  // The scrollTop (in px) that puts `deckIndex` at the top of the viewport.
  function scrollTopFor(deckIndex: bigint): number {
    return Number(deckIndex - windowStart(anchor(), geometry)) * ROW_HEIGHT
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

  // The single request path: fetch the window whenever the anchor changes or
  // the worker becomes available. Keying on both fixes the initial-load stall
  // where the anchor was already current, so no change ever fired the effect.
  // Stale responses are dropped by the source sequence.
  createEffect(
    on(
      () => [anchor(), source()] as const,
      ([currentAnchor, worker]) => {
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
    const next = recenteredAnchor(currentAnchor, scrollRow, geometry)

    if (next === currentAnchor) {
      return
    }

    const currentStart = windowStart(currentAnchor, geometry)

    setAnchor(next)

    // Keep the same logical row under the viewport after re-anchoring: shift
    // the scroll position by how far the window's first row moved.
    const nextStart = windowStart(next, geometry)
    const startShift = Number(nextStart - currentStart)

    scrollEl.scrollTop = scrollEl.scrollTop - startShift * ROW_HEIGHT
  }

  // Navigate to a deck: anchor it, sync the URL, and scroll it to the top.
  function navigateTo(deckIndex: bigint): void {
    const number = permutationIndexToPublicDeckNumber(deckIndex)
    const clamped = clampAnchor(deckIndex)

    setJumpValue(number.toString())
    setSearchParams({ deck: number.toString() })
    setAnchor(clamped)

    if (scrollEl !== undefined) {
      scrollEl.scrollTop =
        Number(clamped - windowStart(clamped, geometry)) * ROW_HEIGHT
    }
  }

  function jump(): void {
    navigateTo(parseDeckNumberParam(jumpValue()))
  }

  // Draw a uniformly random deck and navigate to it, surfacing its real number.
  function randomize(): void {
    navigateTo(randomPermutationIndex(cryptoEntropy))
  }

  onMount(() => {
    setSource(
      new DeckBatchSource(
        () =>
          new Worker(new URL('./worker/explorer.worker.ts', import.meta.url), {
            type: 'module',
          }),
      ),
    )

    if (scrollEl !== undefined) {
      scrollEl.scrollTop = scrollTopFor(requestedIndex)
    }
  })

  onCleanup(() => {
    source()?.terminate()
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
          <button type="button" class="random-button" onClick={randomize}>
            Random
          </button>
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
