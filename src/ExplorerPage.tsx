import { useSearchParams } from '@solidjs/router'
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onSettled,
  untrack,
} from 'solid-js'

import { CARD_COUNT, type CardId } from './domain/cards.ts'
import {
  FIRST_DECK_NUMBER,
  LAST_DECK_NUMBER,
  permutationIndexToPublicDeckNumber,
  publicDeckNumberToIndex,
} from './domain/deck-number.ts'
import { cryptoEntropy, randomPermutationIndex } from './domain/random.ts'
import { PlayingCard } from './PlayingCard.tsx'
import { parseDeckNumberParam } from './virtualization/deck-param.ts'
import {
  advancePosition,
  clampPosition,
  createPosition,
  easeInOutCubic,
  fractionAtPosition,
  interpolatePosition,
  LAST_INDEX,
  positionAtFraction,
  stripRange,
  visibleRowCount,
  type FeedPosition,
} from './virtualization/position.ts'
import { DeckBatchSource } from './worker/DeckBatchSource.ts'
import type { BatchResponse } from './worker/explorer.worker.ts'

/** Pixel height of one deck row; the position math divides input by this. */
const ROW_HEIGHT = 148
/** Extra rows rendered beyond each viewport edge so fast scrolls stay covered. */
const OVERSCAN_ROWS = 8
/** Duration of animated jump navigation; direct input is always instant. */
const JUMP_DURATION_MS = 300

const WHEEL_DELTA_LINE = 1
const WHEEL_DELTA_PAGE = 2

// Superseded or terminated requests are expected during fast scroll.
function ignoreRejection(): void {}

/**
 * Reduced-motion is the default-safe answer: when `matchMedia` is unavailable
 * (test environments, very old browsers) jumps land instantly rather than
 * animating.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia !== 'function' ||
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function firstSearchParam(
  raw: string | string[] | undefined,
): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

interface DeckRowProps {
  readonly index: bigint
  readonly cards: () => Uint8Array | undefined
}

/**
 * One deck row. The deck number renders synchronously from the row's index —
 * the position never waits on the worker — while the card fan fills in when
 * its batch lands.
 */
function DeckRow(props: DeckRowProps) {
  const number = () => permutationIndexToPublicDeckNumber(props.index)
  const cardList = createMemo(() => {
    const cards = props.cards()
    return cards === undefined ? undefined : Array.from(cards)
  })

  return (
    <div class="deck-row" style={{ height: `${ROW_HEIGHT}px` }}>
      <span class="deck-number">{number().toLocaleString('en-US')}</span>
      <div class="deck-fan">
        {cardList() !== undefined ? (
          <For each={cardList()}>
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
  )
}

/**
 * The explorer holds its scroll position as application state (decision
 * 0009): `position` names the deck under the viewport's top edge plus a
 * sub-row pixel offset. Wheel, keyboard, touch-drag, and the custom
 * scrollbar rail all advance the position directly, so input never waits on
 * the worker; only card faces load asynchronously. Programmatic navigation
 * (Jump, Random, Go to start/end) animates the position with
 * `requestAnimationFrame` and always lands exactly on the requested deck.
 */
export function ExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Read once at mount: the requested deck seeds the position; later `deck`
  // param changes come from this page's own navigations, not back at it.
  const requestedIndex = untrack(() => {
    return parseDeckNumberParam(firstSearchParam(searchParams['deck']))
  })

  const [position, setPosition] = createSignal<FeedPosition>(
    createPosition(requestedIndex, 0),
  )
  const [viewportHeight, setViewportHeight] = createSignal(0)
  const [batches, setBatches] = createSignal<ReadonlyMap<bigint, Uint8Array>>(
    new Map(),
  )
  const [jumpValue, setJumpValue] = createSignal(
    permutationIndexToPublicDeckNumber(requestedIndex).toString(),
  )

  let feedEl: HTMLElement | undefined
  let explorerEl: HTMLElement | undefined
  let railEl: HTMLDivElement | undefined
  let thumbEl: HTMLDivElement | undefined
  let documentBottom = 0

  const assignFeedEl = (element: HTMLElement): void => {
    feedEl = element
  }
  const assignExplorerEl = (element: HTMLElement): void => {
    explorerEl = element
  }
  const assignRailEl = (element: HTMLDivElement): void => {
    railEl = element
  }
  const assignThumbEl = (element: HTMLDivElement): void => {
    thumbEl = element
  }

  // The worker source is a signal so the request effect re-runs when the
  // worker is created on mount — the initial strip must not wait for a
  // position change that never comes when the requested deck is already
  // current.
  const [source, setSource] = createSignal<DeckBatchSource | undefined>(
    undefined,
  )

  const visibleRows = createMemo(() =>
    visibleRowCount(viewportHeight(), ROW_HEIGHT),
  )
  const strip = createMemo(() =>
    stripRange(position(), viewportHeight(), ROW_HEIGHT, OVERSCAN_ROWS),
  )
  // Primitive projections of the strip: bigint/number identity only changes
  // when the strip actually moves, so sub-row scrolls (offsetPx changes) do
  // not retrigger the request effect below.
  const stripStart = createMemo(() => strip().start)
  const stripCount = createMemo(() => strip().count)
  const rowIndices = createMemo<readonly bigint[]>(() => {
    const { start, count } = strip()
    const indices: bigint[] = []

    for (let row = 0; row < count; row += 1) {
      indices.push(start + BigInt(row))
    }

    return indices
  })
  const thumbTopPercent = createMemo(
    () => fractionAtPosition(position(), visibleRows()) * 100,
  )

  // Fold a worker response into the card cache. Entries are keyed by deck
  // index so rows survive strip shifts; rows outside the current strip are
  // evicted to keep the cache bounded.
  function handleResponse(response: BatchResponse): void {
    const { start, count } = strip()
    const end = start + BigInt(count)

    setBatches((previous) => {
      const next = new Map(previous)

      for (const key of next.keys()) {
        if (key < start || key >= end) {
          next.delete(key)
        }
      }

      for (let deck = 0; deck < response.count; deck += 1) {
        const index = response.startIndex + BigInt(deck)

        if (index >= start && index < end) {
          next.set(
            index,
            response.cards.slice(deck * CARD_COUNT, (deck + 1) * CARD_COUNT),
          )
        }
      }

      return next
    })
  }

  // The single request path: fetch the strip whenever it moves or the worker
  // becomes available. Keying on both fixes the initial-load stall where the
  // position was already current, so no change ever fired the effect. Stale
  // responses are dropped by the source sequence.
  createEffect(
    () => [stripStart(), stripCount(), source()] as const,
    ([start, count, worker]) => {
      if (worker === undefined) {
        return
      }

      worker.request(start, count).then(handleResponse).catch(ignoreRejection)
    },
  )

  // --- Animated navigation ------------------------------------------------

  let animationFrame: number | undefined
  // Exposed as `data-animating` on the feed: observable animation state, so
  // tests (and any future chrome) can tell a running glide from a settled
  // feed without timing guesses.
  const [animating, setAnimating] = createSignal(false)

  function cancelAnimation(): void {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame)
      animationFrame = undefined
      setAnimating(false)
    }
  }

  /**
   * Animate the position to `target` over JUMP_DURATION_MS. The destination
   * is re-clamped against live viewport geometry on every frame, so a resize
   * during an end jump still lands with the final deck visible. Reduced motion
   * (or a missing rAF) jumps instantly. Any new input
   * — wheel, rail, keyboard, touch, or another navigation — cancels a running
   * animation deterministically.
   */
  function animateTo(target: FeedPosition): void {
    cancelAnimation()

    const currentTarget = (): FeedPosition =>
      clampPosition(
        target,
        visibleRowCount(feedEl?.clientHeight ?? viewportHeight(), ROW_HEIGHT),
      )

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      setPosition(currentTarget())
      return
    }

    const from = position()
    const start = performance.now()
    setAnimating(true)

    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / JUMP_DURATION_MS)

      if (t >= 1) {
        animationFrame = undefined
        setAnimating(false)
        setPosition(currentTarget())
        return
      }

      setPosition(
        interpolatePosition(
          from,
          currentTarget(),
          easeInOutCubic(t),
          ROW_HEIGHT,
          visibleRows(),
        ),
      )
      animationFrame = requestAnimationFrame(step)
    }

    animationFrame = requestAnimationFrame(step)
  }

  // Navigate to a deck: sync the URL and input, then glide the position.
  let ownDeckParam: string | undefined

  function navigateTo(deckIndex: bigint): void {
    const number = permutationIndexToPublicDeckNumber(deckIndex)
    const deckParam = number.toString()
    const currentParam = firstSearchParam(searchParams['deck'])

    setJumpValue(deckParam)
    ownDeckParam = currentParam === deckParam ? undefined : deckParam
    setSearchParams({ deck: deckParam })
    animateTo(createPosition(deckIndex, 0))
  }

  // Own navigations already start their animation above. A later URL change
  // from browser Back/Forward is external and must update the displayed deck
  // so the shareable query string never disagrees with the feed.
  let initialDeckParamObserved = false
  createEffect(
    () => firstSearchParam(searchParams['deck']),
    (deckParam) => {
      untrack(() => {
        if (!initialDeckParamObserved) {
          initialDeckParamObserved = true
          return
        }

        if (deckParam === ownDeckParam) {
          ownDeckParam = undefined
          return
        }

        const index = parseDeckNumberParam(deckParam)
        setJumpValue(permutationIndexToPublicDeckNumber(index).toString())
        animateTo(createPosition(index, 0))
      })
    },
  )

  function jump(): void {
    navigateTo(parseDeckNumberParam(jumpValue()))
  }

  // Draw a uniformly random deck and navigate to it, surfacing its real number.
  function randomize(): void {
    navigateTo(randomPermutationIndex(cryptoEntropy))
  }

  // Jump straight to the last deck: one of the first things a visitor wants,
  // and a 68-digit number nobody should have to type.
  function goToEnd(): void {
    navigateTo(publicDeckNumberToIndex(LAST_DECK_NUMBER))
  }

  // Back to deck 1 without typing it out.
  function goToStart(): void {
    navigateTo(publicDeckNumberToIndex(FIRST_DECK_NUMBER))
  }

  // --- Direct input: wheel, keyboard, touch drag, rail ---------------------

  // Wheel input over the feed advances the virtual position. Browser zoom
  // gestures stay native rather than being consumed as deck scrolling.
  function documentOwnsScroll(deltaY: number): boolean {
    const atStart = position().topIndex === 0n && position().offsetPx === 0

    return (
      !animating() &&
      ((deltaY > 0 && globalThis.scrollY < documentBottom - 1) ||
        (deltaY < 0 && atStart && globalThis.scrollY > 0))
    )
  }

  function handleWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      return
    }

    // Let the document carry the visitor through the intro before the virtual
    // feed takes over, and back to it once the feed returns to deck 1.
    if (documentOwnsScroll(event.deltaY)) {
      return
    }

    event.preventDefault()
    cancelAnimation()

    const scale =
      event.deltaMode === WHEEL_DELTA_LINE
        ? ROW_HEIGHT
        : event.deltaMode === WHEEL_DELTA_PAGE
          ? Math.max(viewportHeight(), ROW_HEIGHT)
          : 1

    setPosition((current) =>
      advancePosition(current, event.deltaY * scale, ROW_HEIGHT, visibleRows()),
    )
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const advanceBy: Partial<Record<string, number>> = {
      ArrowDown: ROW_HEIGHT,
      ArrowUp: -ROW_HEIGHT,
      PageDown: Math.max(viewportHeight(), ROW_HEIGHT),
      PageUp: -Math.max(viewportHeight(), ROW_HEIGHT),
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      cancelAnimation()
      const top =
        event.key === 'Home'
          ? createPosition(0n, 0)
          : clampPosition(createPosition(LAST_INDEX, 0), visibleRows())
      setPosition(top)
      return
    }

    const delta = advanceBy[event.key]

    if (delta === undefined) {
      return
    }

    event.preventDefault()
    cancelAnimation()
    setPosition((current) =>
      advancePosition(current, delta, ROW_HEIGHT, visibleRows()),
    )
  }

  // Touch dragging pans the virtual position once the document reaches the
  // feed. At deck 1, downward dragging returns control to the document so the
  // intro remains reachable.
  let touchDragY: number | undefined
  let touchDragIdentifier: number | undefined

  function handleFeedTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      endTouchDrag()
      return
    }

    touchDragIdentifier = event.touches[0]?.identifier
    touchDragY = event.touches[0]?.clientY
  }

  function handleFeedTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1 || touchDragIdentifier === undefined) {
      endTouchDrag()
      return
    }

    const touch = event.touches[0]
    const currentY =
      touch?.identifier === touchDragIdentifier ? touch.clientY : undefined

    if (touchDragY === undefined || currentY === undefined) {
      return
    }

    const delta = touchDragY - currentY
    touchDragY = currentY

    if (documentOwnsScroll(delta)) {
      return
    }

    event.preventDefault()
    cancelAnimation()
    setPosition((current) =>
      advancePosition(current, delta, ROW_HEIGHT, visibleRows()),
    )
  }

  function endTouchDrag(): void {
    touchDragY = undefined
    touchDragIdentifier = undefined
  }

  // The rail maps percent-of-space to an exact position (decision 0009). The
  // thumb travels `rail height - thumb height`; grabbing the thumb keeps the
  // pointer's offset within it, and pressing the bare rail teleports the
  // thumb's center to the pointer. Either way the extremes clamp, so cranking
  // to (or past) an end lands exactly on the first or last scrollable deck.
  let railDragging = false
  let railGrabOffset = 0

  function railFraction(clientY: number): number {
    if (railEl === undefined || thumbEl === undefined) {
      return 0
    }

    const railRect = railEl.getBoundingClientRect()
    const thumbHeight = thumbEl.getBoundingClientRect().height
    const travel = Math.max(1, railRect.height - thumbHeight)
    const fraction = (clientY - railRect.top - railGrabOffset) / travel

    return fraction < 0 ? 0 : fraction > 1 ? 1 : fraction
  }

  function handleRailPointerDown(event: PointerEvent): void {
    if (railEl === undefined || thumbEl === undefined) {
      return
    }

    event.preventDefault()
    cancelAnimation()
    railDragging = true
    railEl.setPointerCapture(event.pointerId)

    railGrabOffset =
      event.target === thumbEl
        ? event.clientY - thumbEl.getBoundingClientRect().top
        : thumbEl.getBoundingClientRect().height / 2

    setPosition(positionAtFraction(railFraction(event.clientY), visibleRows()))
  }

  function handleRailPointerMove(event: PointerEvent): void {
    if (!railDragging) {
      return
    }

    setPosition(positionAtFraction(railFraction(event.clientY), visibleRows()))
  }

  function endRailDrag(): void {
    railDragging = false
  }

  // --- Setup ---------------------------------------------------------------

  // Runs once when the component settles (Solid 2's mount-with-cleanup hook;
  // the returned function fires on disposal). Normal document scrolling
  // carries the compact intro away; the full-page feed then owns virtual input.
  onSettled(() => {
    document.body.classList.add('explorer-active')
    feedEl?.addEventListener('wheel', handleWheel, { passive: false })
    feedEl?.addEventListener('touchmove', handleFeedTouchMove, {
      passive: false,
    })

    const updateDocumentBottom = (): void => {
      documentBottom = Math.max(
        0,
        document.documentElement.scrollHeight - globalThis.innerHeight,
      )
    }
    updateDocumentBottom()
    globalThis.addEventListener('resize', updateDocumentBottom)

    if (firstSearchParam(searchParams['deck']) !== undefined) {
      explorerEl?.scrollIntoView()
    }

    let observer: ResizeObserver | undefined

    if (feedEl !== undefined) {
      setViewportHeight(feedEl.clientHeight)

      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver((entries) => {
          const entry = entries[0]

          if (entry !== undefined) {
            setViewportHeight(entry.contentRect.height)
            updateDocumentBottom()
          }
        })
        observer.observe(feedEl)
      }
    }

    return () => {
      document.body.classList.remove('explorer-active')
      feedEl?.removeEventListener('wheel', handleWheel)
      feedEl?.removeEventListener('touchmove', handleFeedTouchMove)
      globalThis.removeEventListener('resize', updateDocumentBottom)
      observer?.disconnect()
      cancelAnimation()
    }
  })

  // Once the viewport is measured (and whenever it resizes), keep the
  // position inside the scrollable range — this is what pins a `?deck=`
  // link to the last deck into the final viewport instead of past it.
  createEffect(
    () => visibleRows(),
    (rows) => {
      setPosition((current) => clampPosition(current, rows))
    },
  )

  onSettled(() => {
    const workerSource = new DeckBatchSource(
      () =>
        new Worker(new URL('./worker/explorer.worker.ts', import.meta.url), {
          type: 'module',
        }),
    )
    setSource(workerSource)

    return () => workerSource.terminate()
  })

  return (
    <section
      ref={assignExplorerEl}
      class="explorer"
      aria-labelledby="explorer-title"
    >
      <header class="explorer-bar">
        <div class="explorer-heading">
          <p class="eyebrow">The explorer</p>
          <h2 id="explorer-title">Every deck, in order.</h2>
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
          <button type="button" class="end-button" onClick={goToEnd}>
            Go to end
          </button>
          <button type="button" class="start-button" onClick={goToStart}>
            Go to start
          </button>
        </form>

        <p class="explorer-meta">
          <span>1</span> —{' '}
          <span>{LAST_DECK_NUMBER.toLocaleString('en-US')}</span>
        </p>
      </header>

      {/* The feed is a keyboard-operable scroll viewport: focusable, with
          arrow/page/Home/End scrolling — the accessible pattern for a custom
          scroll region, which the a11y rule tables do not model. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section
        ref={assignFeedEl}
        class="explorer-feed"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabindex="0"
        aria-label="Deck feed: every deck, in order"
        data-animating={animating() || undefined}
        onKeyDown={handleKeyDown}
        onTouchStart={handleFeedTouchStart}
        onTouchEnd={endTouchDrag}
        onTouchCancel={endTouchDrag}
      >
        <div
          class="explorer-strip"
          style={{ transform: `translateY(-${strip().shiftPx}px)` }}
        >
          <For each={rowIndices()}>
            {(index) => (
              <DeckRow index={index} cards={() => batches().get(index)} />
            )}
          </For>
        </div>

        <div
          ref={assignRailEl}
          class="explorer-rail"
          // The rail is a pointer affordance; keyboard scrolling lives on the
          // feed itself and exact addressing lives in the jump form.
          aria-hidden="true"
          onPointerDown={handleRailPointerDown}
          onPointerMove={handleRailPointerMove}
          onPointerUp={endRailDrag}
          onPointerCancel={endRailDrag}
        >
          <div
            ref={assignThumbEl}
            class="explorer-rail-thumb"
            style={{
              top: `${thumbTopPercent()}%`,
              transform: `translateY(-${thumbTopPercent()}%)`,
            }}
          />
        </div>
      </section>
    </section>
  )
}
