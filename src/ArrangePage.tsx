import { useSearchParams } from '@solidjs/router'
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  untrack,
} from 'solid-js'

import { CANONICAL_DECK, cardFromId, type CardId } from './domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from './domain/deck-number.ts'
import { rankPermutation, unrankPermutation } from './domain/permutation.ts'
import { randomPermutationIndex } from './domain/random.ts'
import { cryptoEntropy } from './platform/crypto-entropy.ts'
import { PlayingCard } from './PlayingCard.tsx'
import { parseDeckNumberParam } from './virtualization/deck-param.ts'

const SHUFFLE_DURATION_MS = 760
const TOUCH_LONG_PRESS_MS = 420
const TOUCH_SLOP_PX = 8
const TOUCH_DRAG_HAPTIC_MS = 12

export function moveCard<T>(
  ordering: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    fromIndex >= ordering.length ||
    toIndex < 0 ||
    toIndex >= ordering.length
  ) {
    throw new RangeError('Card positions must be within the deck')
  }

  const next = [...ordering]
  const [card] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, card as T)
  return next
}

export function positionFromPointer(
  pointerX: number,
  trackLeft: number,
  trackWidth: number,
  cardWidth: number,
  itemCount: number,
): number {
  if (itemCount < 1) {
    throw new RangeError('A spread must contain at least one card')
  }

  if (itemCount === 1 || trackWidth <= cardWidth) {
    return 0
  }

  const step = (trackWidth - cardWidth) / (itemCount - 1)
  const slotFromLeft = Math.round((pointerX - trackLeft) / step)
  return Math.max(0, Math.min(itemCount - 1, itemCount - 1 - slotFromLeft))
}

export function shuffleLiftForCard(id: number): number {
  return id < CANONICAL_DECK.length / 2
    ? -(18 + (id % 5) * 3)
    : 10 + (id % 5) * 2
}

function cardName(id: CardId): string {
  const card = cardFromId(id)
  return `${card.rank} of ${card.suit}`
}

function firstSearchParam(
  raw: string | string[] | undefined,
): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface ArrangePageProps {
  readonly drawPermutationIndex?: () => bigint
  readonly reducedMotion?: boolean
}

export function ArrangePage(props: ArrangePageProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedIndex = parseDeckNumberParam(
    untrack(() => firstSearchParam(searchParams['deck'])),
  )
  const [ordering, setOrdering] = createSignal<readonly CardId[]>([
    ...unrankPermutation(CANONICAL_DECK, requestedIndex),
  ])
  const [selectedIndex, setSelectedIndex] = createSignal<number>()
  const [draggedId, setDraggedId] = createSignal<CardId>()
  const [isShuffling, setIsShuffling] = createSignal(false)
  const deckNumber = createMemo(() =>
    permutationIndexToPublicDeckNumber(
      rankPermutation(CANONICAL_DECK, ordering()),
    ),
  )
  let spreadTrack: HTMLDivElement | undefined
  let suppressClick = false
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined
  let shuffleRun = 0
  let shuffleAnimations: Animation[] = []
  let dragSession:
    | {
        readonly pointerId: number
        readonly cardId: CardId
        readonly startX: number
        readonly startY: number
        readonly grabOffset: number
        readonly initialOrdering: readonly CardId[]
        readonly pointerType: string
        readonly startScrollLeft: number
        longPressTimer: ReturnType<typeof setTimeout> | undefined
        currentIndex: number
        dragging: boolean
        panning: boolean
      }
    | undefined

  const assignSpreadTrack = (element: HTMLDivElement): void => {
    spreadTrack = element
  }

  const clearDrag = (): void => {
    if (dragSession?.longPressTimer !== undefined) {
      clearTimeout(dragSession.longPressTimer)
    }
    dragSession = undefined
    setDraggedId(undefined)
  }

  const suppressNextClick = (): void => {
    suppressClick = true
    if (suppressClickTimer !== undefined) {
      clearTimeout(suppressClickTimer)
    }
    suppressClickTimer = setTimeout(() => {
      suppressClick = false
      suppressClickTimer = undefined
    }, 500)
  }

  let ownDeckParam: string | undefined

  const syncDeckParam = (nextOrdering: readonly CardId[]): void => {
    const deckParam = permutationIndexToPublicDeckNumber(
      rankPermutation(CANONICAL_DECK, nextOrdering),
    ).toString()

    if (firstSearchParam(searchParams['deck']) === deckParam) {
      return
    }

    ownDeckParam = deckParam
    setSearchParams({ deck: deckParam })
  }

  const cancelShuffle = (syncTarget = true): void => {
    const wasShuffling = isShuffling()
    shuffleRun += 1
    for (const animation of shuffleAnimations) {
      animation.cancel()
    }
    shuffleAnimations = []
    setIsShuffling(false)
    if (wasShuffling && syncTarget) {
      syncDeckParam(ordering())
    }
  }

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

        cancelShuffle(false)
        clearDrag()
        setSelectedIndex(undefined)
        setOrdering(
          unrankPermutation(CANONICAL_DECK, parseDeckNumberParam(deckParam)),
        )
      })
    },
  )

  onCleanup(() => {
    if (dragSession?.longPressTimer !== undefined) {
      clearTimeout(dragSession.longPressTimer)
    }
    if (suppressClickTimer !== undefined) {
      clearTimeout(suppressClickTimer)
    }
    shuffleRun += 1
    for (const animation of shuffleAnimations) {
      animation.cancel()
    }
  })

  const handlePointerDown = (
    event: PointerEvent & { currentTarget: HTMLButtonElement },
    id: CardId,
    position: number,
  ): void => {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return
    }

    cancelShuffle()

    const cardRect = event.currentTarget.getBoundingClientRect()
    const initialSession = {
      pointerId: event.pointerId,
      cardId: id,
      startX: event.clientX,
      startY: event.clientY,
      grabOffset: event.clientX - cardRect.left,
      initialOrdering: ordering(),
      pointerType: event.pointerType,
      startScrollLeft: spreadTrack?.parentElement?.scrollLeft ?? 0,
      longPressTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      currentIndex: position,
      dragging: false,
      panning: false,
    }
    dragSession = initialSession

    if (event.pointerType === 'touch') {
      initialSession.longPressTimer = setTimeout(() => {
        if (dragSession === initialSession && !initialSession.panning) {
          initialSession.longPressTimer = undefined
          initialSession.dragging = true
          setDraggedId(initialSession.cardId)
          setSelectedIndex(undefined)
          globalThis.navigator.vibrate?.(TOUCH_DRAG_HAPTIC_MS)
        }
      }, TOUCH_LONG_PRESS_MS)
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent): void => {
    const session = dragSession
    const track = spreadTrack

    if (
      session === undefined ||
      session.pointerId !== event.pointerId ||
      track === undefined
    ) {
      return
    }

    if (!session.dragging && session.pointerType === 'touch') {
      const distance = Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      )

      if (!session.panning && distance < TOUCH_SLOP_PX) {
        return
      }

      if (!session.panning) {
        if (session.longPressTimer !== undefined) {
          clearTimeout(session.longPressTimer)
          session.longPressTimer = undefined
        }
        session.panning = true
      }

      const spread = track.parentElement
      if (spread !== null) {
        spread.scrollLeft =
          session.startScrollLeft - (event.clientX - session.startX)
      }
      return
    }

    if (!session.dragging && Math.abs(event.clientX - session.startX) < 6) {
      return
    }

    session.dragging = true
    setDraggedId(session.cardId)
    setSelectedIndex(undefined)

    const trackRect = track.getBoundingClientRect()
    const cardWidth =
      track.querySelector<HTMLElement>('.arrange-card')?.offsetWidth ?? 0
    const desiredLeft = event.clientX - session.grabOffset
    const targetIndex = positionFromPointer(
      desiredLeft,
      trackRect.left,
      trackRect.width,
      cardWidth,
      ordering().length,
    )

    if (targetIndex !== session.currentIndex) {
      setOrdering(moveCard(ordering(), session.currentIndex, targetIndex))
      session.currentIndex = targetIndex
    }
  }

  const handlePointerUp = (
    event: PointerEvent & { currentTarget: HTMLButtonElement },
  ): void => {
    const session = dragSession

    if (session === undefined || session.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (session.dragging || session.panning) {
      suppressNextClick()
    }
    if (session.dragging) {
      syncDeckParam(ordering())
    }

    clearDrag()
  }

  const handlePointerCancel = (event: PointerEvent): void => {
    const session = dragSession

    if (session === undefined || session.pointerId !== event.pointerId) {
      return
    }

    if (session.dragging) {
      setOrdering(session.initialOrdering)
    }
    clearDrag()
  }

  const selectPosition = (position: number): void => {
    cancelShuffle()
    const selected = selectedIndex()

    if (selected === undefined) {
      setSelectedIndex(position)
      return
    }

    if (selected === position) {
      setSelectedIndex(undefined)
      return
    }

    const nextOrdering = moveCard(ordering(), selected, position)
    setOrdering(nextOrdering)
    setSelectedIndex(undefined)
    syncDeckParam(nextOrdering)
  }

  const reset = (): void => {
    cancelShuffle(false)
    clearDrag()
    const nextOrdering = [...CANONICAL_DECK]
    setOrdering(nextOrdering)
    setSelectedIndex(undefined)
    syncDeckParam(nextOrdering)
  }

  const shuffle = (): void => {
    cancelShuffle(false)
    clearDrag()
    setSelectedIndex(undefined)

    const track = spreadTrack
    const previousRects = new Map<number, DOMRect>()
    if (track !== undefined) {
      for (const element of track.querySelectorAll<HTMLElement>(
        '.arrange-card',
      )) {
        const id = Number(element.dataset['cardId'])
        previousRects.set(id, element.getBoundingClientRect())
      }
    }

    const index =
      props.drawPermutationIndex?.() ?? randomPermutationIndex(cryptoEntropy)
    const targetOrdering = unrankPermutation(CANONICAL_DECK, index)
    setOrdering(targetOrdering)

    if (props.reducedMotion ?? prefersReducedMotion()) {
      syncDeckParam(targetOrdering)
      return
    }

    const run = shuffleRun + 1
    shuffleRun = run
    setIsShuffling(true)

    requestAnimationFrame(() => {
      if (run !== shuffleRun || track === undefined) {
        return
      }

      shuffleAnimations = Array.from(
        track.querySelectorAll<HTMLElement>('.arrange-card'),
        (element) => {
          const id = Number(element.dataset['cardId'])
          const previousRect = previousRects.get(id)
          const nextRect = element.getBoundingClientRect()
          const deltaX = (previousRect?.left ?? nextRect.left) - nextRect.left
          const direction = Math.sign(deltaX) || (id % 2 === 0 ? 1 : -1)
          const lift = shuffleLiftForCard(id)

          return element.animate(
            [
              { transform: `translateX(${deltaX}px)` },
              {
                offset: 0.55,
                transform: `translateX(${deltaX * 0.3}px) translateY(${lift}px) rotate(${direction * 2.5}deg)`,
              },
              { transform: 'translateX(0) translateY(0) rotate(0)' },
            ],
            {
              duration: SHUFFLE_DURATION_MS,
              delay: (id % 13) * 7,
              easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
              fill: 'backwards',
            },
          )
        },
      )

      void Promise.allSettled(
        shuffleAnimations.map((animation) => animation.finished),
      ).then(() => {
        if (run === shuffleRun) {
          shuffleAnimations = []
          setIsShuffling(false)
          untrack(() => syncDeckParam(targetOrdering))
        }
        return undefined
      })
    })
  }

  return (
    <section
      class="arrange"
      aria-labelledby="arrange-title"
      data-shuffling={isShuffling() ? '' : undefined}
    >
      <div class="arrange-heading">
        <div>
          <p class="eyebrow">Arrange one exact shuffle</p>
          <h1 id="arrange-title" class="arrange-title">
            Deck
          </h1>
        </div>

        <div class="arrange-actions">
          <p class="arrange-instructions" id="arrange-instructions">
            Drag a card, or select it and then select where it should move. On
            touch, long press to drag.
          </p>
          <button class="arrange-control" type="button" onClick={shuffle}>
            Shuffle
          </button>
          <button class="arrange-control" type="button" onClick={reset}>
            Reset deck
          </button>
        </div>
      </div>

      <output class="arrange-number" aria-live="polite">
        <span>Deck number</span>
        {isShuffling() ? 'Shuffling...' : deckNumber().toLocaleString('en-US')}
      </output>

      <div class="arrange-spread" aria-describedby="arrange-instructions">
        <div class="arrange-spread-track" ref={assignSpreadTrack}>
          <For each={ordering()}>
            {(id, position) => {
              const isSelected = () => selectedIndex() === position()
              const isDragging = () => draggedId() === id
              const label = () =>
                isSelected()
                  ? `Cancel moving ${cardName(id)}`
                  : selectedIndex() === undefined
                    ? `Select ${cardName(id)}`
                    : `Move selected card to position ${position() + 1}, before ${cardName(id)}`

              return (
                <button
                  class={[
                    'arrange-card',
                    {
                      selected: isSelected(),
                      dragging: isDragging(),
                    },
                  ]}
                  type="button"
                  aria-label={label()}
                  aria-pressed={isSelected() ? 'true' : 'false'}
                  data-card-id={id}
                  style={{
                    '--position': position(),
                    'z-index': ordering().length - position(),
                  }}
                  onClick={() => {
                    if (suppressClick) {
                      suppressClick = false
                      if (suppressClickTimer !== undefined) {
                        clearTimeout(suppressClickTimer)
                        suppressClickTimer = undefined
                      }
                      return
                    }

                    selectPosition(position())
                  }}
                  onPointerDown={(event) =>
                    handlePointerDown(event, id, position())
                  }
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                >
                  <PlayingCard id={id} />
                </button>
              )
            }}
          </For>
        </div>
      </div>
    </section>
  )
}
