import { useSearchParams } from '@solidjs/router'
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onSettled,
  untrack,
} from 'solid-js'
import type { JSX } from '@solidjs/web'

import { CARD_COUNT, type CardId } from './domain/cards.ts'
import {
  FIRST_DECK_NUMBER,
  LAST_DECK_NUMBER,
  permutationIndexToPublicDeckNumber,
  publicDeckNumberToIndex,
} from './domain/deck-number.ts'
import { randomPermutationIndex } from './domain/random.ts'
import { cryptoEntropy } from './platform/crypto-entropy.ts'
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
  maxTopIndex,
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
/** Touch samples older than this do not describe release velocity. */
const MOMENTUM_SAMPLE_WINDOW_MS = 100
const MOMENTUM_RELEASE_IDLE_MS = 80
const MOMENTUM_DECAY_PER_MS = 0.004
const MOMENTUM_MIN_VELOCITY_PX_PER_MS = 0.02
const MOMENTUM_MAX_VELOCITY_PX_PER_MS = 4

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
 * 0009): `position` names the deck under the feed's top edge plus a
 * sub-row pixel offset. Wheel, keyboard, touch, and the custom scrollbar rail
 * all advance the position directly, so input never waits on the worker;
 * touch flicks continue with bounded momentum after release. Only card faces
 * load asynchronously. Programmatic navigation (Jump, Random, Go to
 * start/end) animates the position with `requestAnimationFrame` and always
 * lands exactly on the requested deck.
 */
interface ExplorerPageProps {
  readonly intro?: JSX.Element
}

export function ExplorerPage(props: ExplorerPageProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  // Read once at mount: the requested deck seeds the position; later `deck`
  // param changes come from this page's own navigations, not back at it.
  const requestedDeckParam = untrack(() =>
    firstSearchParam(searchParams['deck']),
  )
  const requestedIndex = parseDeckNumberParam(requestedDeckParam)

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
  const [introHeight, setIntroHeight] = createSignal(0)
  const [introOffset, setIntroOffset] = createSignal(0)
  const [barHeight, setBarHeight] = createSignal(0)
  const [surfaceHeight, setSurfaceHeight] = createSignal(0)

  let explorerEl: HTMLElement | undefined
  let introEl: HTMLDivElement | undefined
  let barEl: HTMLElement | undefined
  let railEl: HTMLDivElement | undefined
  let thumbEl: HTMLDivElement | undefined

  const assignExplorerEl = (element: HTMLElement): void => {
    explorerEl = element
  }
  const assignIntroEl = (element: HTMLDivElement): void => {
    introEl = element
  }
  const assignBarEl = (element: HTMLElement): void => {
    barEl = element
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
  // Clip the first end row by the viewport remainder so 52! sits flush with
  // the bottom without leaving blank space.
  const endOffset = createMemo(() =>
    viewportHeight() <= 0 ? 0 : visibleRows() * ROW_HEIGHT - viewportHeight(),
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
    const start = stripStart()
    const count = stripCount()
    const indices: bigint[] = []

    for (let row = 0; row < count; row += 1) {
      indices.push(start + BigInt(row))
    }

    return indices
  })
  const thumbTopPercent = createMemo(
    () => fractionAtPosition(position(), visibleRows()) * 100,
  )
  const feedTop = createMemo(
    () => Math.max(0, introHeight() - introOffset()) + barHeight(),
  )

  createEffect(
    () => [surfaceHeight(), feedTop()] as const,
    ([surface, top]) => {
      setViewportHeight(Math.max(0, surface - top))
    },
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
  let momentumFrame: number | undefined
  // Exposed as `data-animating` on the feed: observable animation state, so
  // tests (and any future chrome) can tell a running glide from a settled
  // feed without timing guesses.
  const [animating, setAnimating] = createSignal(false)
  const [momentumScrolling, setMomentumScrolling] = createSignal(false)

  function cancelAnimation(): void {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame)
      animationFrame = undefined
      setAnimating(false)
    }
  }

  function cancelMomentum(): void {
    if (momentumFrame !== undefined) {
      cancelAnimationFrame(momentumFrame)
      momentumFrame = undefined
      setMomentumScrolling(false)
    }
  }

  function cancelMotion(): void {
    cancelAnimation()
    cancelMomentum()
  }

  function startMomentum(initialVelocity: number): void {
    cancelMomentum()

    if (
      prefersReducedMotion() ||
      typeof requestAnimationFrame !== 'function' ||
      Math.abs(initialVelocity) < MOMENTUM_MIN_VELOCITY_PX_PER_MS
    ) {
      return
    }

    let velocity = Math.max(
      -MOMENTUM_MAX_VELOCITY_PX_PER_MS,
      Math.min(MOMENTUM_MAX_VELOCITY_PX_PER_MS, initialVelocity),
    )
    let previousTime = performance.now()
    setMomentumScrolling(true)

    const step = (now: number): void => {
      const elapsed = Math.max(0, now - previousTime)

      if (elapsed === 0) {
        momentumFrame = requestAnimationFrame(step)
        return
      }

      previousTime = now
      const decay = Math.exp(-MOMENTUM_DECAY_PER_MS * elapsed)
      const delta = (velocity * (1 - decay)) / MOMENTUM_DECAY_PER_MS
      const currentPosition = position()
      const reachedStart =
        delta < 0 &&
        introOffset() === 0 &&
        currentPosition.topIndex === 0n &&
        currentPosition.offsetPx === 0
      const reachedEnd =
        delta > 0 &&
        introOffset() >= introHeight() &&
        currentPosition.topIndex === maxTopIndex(visibleRows()) &&
        currentPosition.offsetPx === endOffset()

      if (reachedStart || reachedEnd) {
        momentumFrame = undefined
        setMomentumScrolling(false)
        return
      }

      advanceSurface(delta)
      velocity *= decay

      if (Math.abs(velocity) < MOMENTUM_MIN_VELOCITY_PX_PER_MS) {
        momentumFrame = undefined
        setMomentumScrolling(false)
        return
      }

      momentumFrame = requestAnimationFrame(step)
    }

    momentumFrame = requestAnimationFrame(step)
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
    cancelMotion()

    const currentTarget = (): FeedPosition => {
      const height = viewportHeight()
      const rows = visibleRowCount(height, ROW_HEIGHT)

      return clampPosition(
        target,
        rows,
        height <= 0 ? 0 : rows * ROW_HEIGHT - height,
        ROW_HEIGHT,
      )
    }

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
          endOffset(),
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
    setIntroOffset(introHeight())
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

  /** Advance through the finite intro and then the astronomical deck space. */
  function advanceSurface(deltaPx: number): void {
    if (deltaPx === 0) {
      return
    }

    if (deltaPx > 0) {
      const introRemaining = introHeight() - introOffset()
      const introDelta = Math.min(deltaPx, introRemaining)

      if (introDelta > 0) {
        setIntroOffset((current) => current + introDelta)
      }

      const feedDelta = deltaPx - introDelta
      if (feedDelta > 0) {
        setPosition((current) =>
          advancePosition(
            current,
            feedDelta,
            ROW_HEIGHT,
            visibleRows(),
            endOffset(),
          ),
        )
      }
      return
    }

    const requestedPx = -deltaPx
    const current = position()
    const requestedRows = Math.floor(requestedPx / ROW_HEIGHT)

    if (!Number.isSafeInteger(requestedRows)) {
      setPosition(createPosition(0n, 0))
      setIntroOffset(0)
      return
    }

    const requestedRowsBig = BigInt(requestedRows)
    const requestedRemainder = requestedPx - requestedRows * ROW_HEIGHT
    const crossesFeedStart =
      requestedRowsBig > current.topIndex ||
      (requestedRowsBig === current.topIndex &&
        requestedRemainder > current.offsetPx)

    if (crossesFeedStart) {
      const remainingRows = requestedRowsBig - current.topIndex
      const introDelta =
        Number(remainingRows) * ROW_HEIGHT +
        requestedRemainder -
        current.offsetPx

      setPosition(createPosition(0n, 0))
      setIntroOffset((offset) => Math.max(0, offset - introDelta))
      return
    }

    setPosition((nextPosition) =>
      advancePosition(
        nextPosition,
        deltaPx,
        ROW_HEIGHT,
        visibleRows(),
        endOffset(),
      ),
    )
  }

  // Wheel input anywhere on the home surface advances the unified position.
  // Browser zoom gestures remain native rather than being consumed.
  function handleWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      return
    }

    event.preventDefault()
    cancelMotion()

    const scale =
      event.deltaMode === WHEEL_DELTA_LINE
        ? ROW_HEIGHT
        : event.deltaMode === WHEEL_DELTA_PAGE
          ? Math.max(viewportHeight(), ROW_HEIGHT)
          : 1

    advanceSurface(event.deltaY * scale)
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable ||
        event.target.matches('a, button, input, select, textarea'))
    ) {
      return
    }

    const advanceBy: Partial<Record<string, number>> = {
      ArrowDown: ROW_HEIGHT,
      ArrowUp: -ROW_HEIGHT,
      PageDown: Math.max(viewportHeight(), ROW_HEIGHT),
      PageUp: -Math.max(viewportHeight(), ROW_HEIGHT),
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      cancelMotion()
      if (event.key === 'Home') {
        setPosition(createPosition(0n, 0))
        setIntroOffset(0)
      } else {
        setIntroOffset(introHeight())
        setPosition(
          clampPosition(
            createPosition(LAST_INDEX, 0),
            visibleRows(),
            endOffset(),
            ROW_HEIGHT,
          ),
        )
      }
      return
    }

    const delta = advanceBy[event.key]

    if (delta === undefined) {
      return
    }

    event.preventDefault()
    cancelMotion()
    advanceSurface(delta)
  }

  // Touch dragging advances the same unified intro/deck position as wheel and
  // keyboard input; recent samples provide release momentum. Multi-touch
  // remains native for browser zoom gestures.
  let touchDragY: number | undefined
  let touchDragIdentifier: number | undefined
  let touchSamples: { readonly y: number; readonly time: number }[] = []

  function resetTouchDrag(): void {
    touchDragY = undefined
    touchDragIdentifier = undefined
    touchSamples = []
  }

  function handleFeedTouchStart(event: TouchEvent): void {
    cancelMotion()

    if (event.touches.length !== 1) {
      resetTouchDrag()
      return
    }

    touchDragIdentifier = event.touches[0]?.identifier
    touchDragY = event.touches[0]?.clientY
    touchSamples =
      touchDragY === undefined ? [] : [{ y: touchDragY, time: event.timeStamp }]
  }

  function handleFeedTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1 || touchDragIdentifier === undefined) {
      resetTouchDrag()
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
    const now = event.timeStamp
    touchSamples.push({ y: currentY, time: now })
    const sampleWindowStart = now - MOMENTUM_SAMPLE_WINDOW_MS
    const firstRecentSample = touchSamples.findIndex(
      (sample) => sample.time >= sampleWindowStart,
    )
    touchSamples = touchSamples.slice(Math.max(0, firstRecentSample - 1))
    const predecessor = touchSamples[0]
    if (predecessor !== undefined && predecessor.time < sampleWindowStart) {
      touchSamples[0] = { y: predecessor.y, time: sampleWindowStart }
    }

    event.preventDefault()
    cancelMotion()
    advanceSurface(delta)
  }

  function finishTouchDrag(event: TouchEvent): void {
    const first = touchSamples[0]
    const last = touchSamples.at(-1)
    const releasedAt = event.timeStamp

    resetTouchDrag()

    if (
      first === undefined ||
      last === undefined ||
      first === last ||
      releasedAt - last.time > MOMENTUM_RELEASE_IDLE_MS
    ) {
      return
    }

    const elapsed = last.time - first.time
    if (elapsed > 0) {
      startMomentum((first.y - last.y) / elapsed)
    }
  }

  // The rail maps percent-of-space to an exact position (decision 0009). The
  // thumb travels `rail height - thumb height`; grabbing the thumb keeps the
  // pointer's offset within it, and pressing the bare rail teleports the
  // thumb's center to the pointer. Either way the extremes clamp, so cranking
  // to (or past) an end lands exactly on the first or last scrollable deck.
  let railDragging = false
  let railGrabOffset = 0
  let railTop = 0
  let railTravel = 1

  function updateRailGeometry(): void {
    if (railEl === undefined || thumbEl === undefined) {
      return
    }

    const railRect = railEl.getBoundingClientRect()
    railTop = railRect.top
    railTravel = Math.max(
      1,
      railRect.height - thumbEl.getBoundingClientRect().height,
    )
  }

  function railFraction(clientY: number): number {
    const fraction = (clientY - railTop - railGrabOffset) / railTravel

    return fraction < 0 ? 0 : fraction > 1 ? 1 : fraction
  }

  function handleRailPointerDown(event: PointerEvent): void {
    if (railEl === undefined || thumbEl === undefined) {
      return
    }

    event.preventDefault()
    cancelMotion()
    railDragging = true
    railEl.setPointerCapture(event.pointerId)

    const thumbRect = thumbEl.getBoundingClientRect()
    updateRailGeometry()
    railGrabOffset =
      event.target === thumbEl
        ? event.clientY - thumbRect.top
        : thumbRect.height / 2

    const fraction = railFraction(event.clientY)
    setIntroOffset(fraction === 0 ? 0 : introHeight())
    setPosition(
      positionAtFraction(fraction, visibleRows(), endOffset(), ROW_HEIGHT),
    )
  }

  function handleRailPointerMove(event: PointerEvent): void {
    if (!railDragging) {
      return
    }

    const fraction = railFraction(event.clientY)
    setIntroOffset(fraction === 0 ? 0 : introHeight())
    setPosition(
      positionAtFraction(fraction, visibleRows(), endOffset(), ROW_HEIGHT),
    )
  }

  function endRailDrag(): void {
    railDragging = false
  }

  // --- Setup ---------------------------------------------------------------

  // The home surface is the only scroll owner. The browser document stays
  // fixed while wheel and touch move the intro and virtual feed as one stream.
  onSettled(() => {
    document.body.classList.add('explorer-active')
    explorerEl?.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    })
    explorerEl?.addEventListener('touchmove', handleFeedTouchMove, {
      passive: false,
    })
    globalThis.addEventListener('resize', updateRailGeometry)

    let observer: ResizeObserver | undefined

    if (
      explorerEl !== undefined &&
      introEl !== undefined &&
      barEl !== undefined
    ) {
      setSurfaceHeight(explorerEl.clientHeight)
      setIntroHeight(introEl.clientHeight)
      setBarHeight(barEl.getBoundingClientRect().height)
      if (requestedDeckParam !== undefined) {
        setIntroOffset(introEl.clientHeight)
      }

      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver((entries) => {
          const measurements = entries.map((entry) => ({
            target: entry.target,
            height:
              entry.borderBoxSize[0]?.blockSize ??
              (entry.target as HTMLElement).getBoundingClientRect().height,
          }))

          queueMicrotask(() => {
            for (const measurement of measurements) {
              if (measurement.target === explorerEl) {
                setSurfaceHeight(measurement.height)
              } else if (measurement.target === barEl) {
                setBarHeight(measurement.height)
              } else if (measurement.target === introEl) {
                const staticPreviousHeight = introHeight()

                setIntroHeight(measurement.height)
                setIntroOffset((current) => {
                  const shouldRemainHidden =
                    staticPreviousHeight > 0 && current >= staticPreviousHeight

                  return requestedDeckParam !== undefined || shouldRemainHidden
                    ? measurement.height
                    : Math.min(current, measurement.height)
                })
              }
            }
          })
        })
        observer.observe(explorerEl)
        observer.observe(introEl)
        observer.observe(barEl)
      }
    }

    return () => {
      document.body.classList.remove('explorer-active')
      explorerEl?.removeEventListener('wheel', handleWheel, { capture: true })
      explorerEl?.removeEventListener('touchmove', handleFeedTouchMove)
      globalThis.removeEventListener('resize', updateRailGeometry)
      observer?.disconnect()
      cancelMotion()
    }
  })

  // Once the viewport is measured (and whenever it resizes), keep the
  // position inside the scrollable range — this is what pins a `?deck=`
  // link to the last deck into the final viewport instead of past it.
  let previousVisibleRows = 0
  let previousEndOffset = 0
  createEffect(
    () => [visibleRows(), endOffset()] as const,
    ([rows, offset]) => {
      setPosition((current) => {
        const wasAtEnd =
          previousVisibleRows > 0 &&
          current.topIndex === maxTopIndex(previousVisibleRows) &&
          current.offsetPx === previousEndOffset

        return wasAtEnd
          ? clampPosition(
              createPosition(LAST_INDEX, 0),
              rows,
              offset,
              ROW_HEIGHT,
            )
          : clampPosition(current, rows, offset, ROW_HEIGHT)
      })
      previousVisibleRows = rows
      previousEndOffset = offset
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
    // The section is the keyboard-operable custom scroll surface.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={assignExplorerEl}
      class="explorer"
      aria-labelledby={
        props.intro === undefined ? 'explorer-title' : 'hero-title'
      }
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabindex="0"
      data-intro-visible={introOffset() < introHeight() || undefined}
      onKeyDown={handleKeyDown}
      onTouchStart={handleFeedTouchStart}
      onTouchEnd={finishTouchDrag}
      onTouchCancel={resetTouchDrag}
    >
      <div
        ref={assignIntroEl}
        class="explorer-intro"
        style={{ transform: `translateY(-${introOffset()}px)` }}
      >
        {props.intro}
      </div>

      <header
        ref={assignBarEl}
        class="explorer-bar"
        style={{
          top: `${introHeight()}px`,
          transform: `translateY(-${introOffset()}px)`,
        }}
      >
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

      {/* The feed remains focusable so keyboard input bubbles to the custom
          scroll surface while interactive controls retain their native keys. */}
      <section
        class="explorer-feed"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabindex="0"
        aria-label="Deck feed: every deck, in order"
        data-animating={animating() || undefined}
        data-momentum={momentumScrolling() || undefined}
        style={{ top: `${feedTop()}px` }}
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
      </section>

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
  )
}
