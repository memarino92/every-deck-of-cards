import { createMemo, createSignal, For } from 'solid-js'

import { CANONICAL_DECK, cardFromId, type CardId } from './domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from './domain/deck-number.ts'
import { rankPermutation } from './domain/permutation.ts'
import { PlayingCard } from './PlayingCard.tsx'

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

function cardName(id: CardId): string {
  const card = cardFromId(id)
  return `${card.rank} of ${card.suit}`
}

export function ArrangePage() {
  const [ordering, setOrdering] = createSignal<readonly CardId[]>([
    ...CANONICAL_DECK,
  ])
  const [selectedIndex, setSelectedIndex] = createSignal<number>()
  const [draggedId, setDraggedId] = createSignal<CardId>()
  const deckNumber = createMemo(() =>
    permutationIndexToPublicDeckNumber(
      rankPermutation(CANONICAL_DECK, ordering()),
    ),
  )
  let spreadTrack: HTMLDivElement | undefined
  let suppressClick = false
  let dragSession:
    | {
        readonly pointerId: number
        readonly cardId: CardId
        readonly startX: number
        readonly grabOffset: number
        readonly initialOrdering: readonly CardId[]
        currentIndex: number
        dragging: boolean
      }
    | undefined

  const assignSpreadTrack = (element: HTMLDivElement): void => {
    spreadTrack = element
  }

  const clearDrag = (): void => {
    dragSession = undefined
    setDraggedId(undefined)
  }

  const handlePointerDown = (
    event: PointerEvent & { currentTarget: HTMLButtonElement },
    id: CardId,
    position: number,
  ): void => {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return
    }

    const cardRect = event.currentTarget.getBoundingClientRect()
    dragSession = {
      pointerId: event.pointerId,
      cardId: id,
      startX: event.clientX,
      grabOffset: event.clientX - cardRect.left,
      initialOrdering: ordering(),
      currentIndex: position,
      dragging: false,
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

    if (session.dragging) {
      suppressClick = true
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
    const selected = selectedIndex()

    if (selected === undefined) {
      setSelectedIndex(position)
      return
    }

    if (selected === position) {
      setSelectedIndex(undefined)
      return
    }

    setOrdering(moveCard(ordering(), selected, position))
    setSelectedIndex(undefined)
  }

  const reset = (): void => {
    clearDrag()
    setOrdering([...CANONICAL_DECK])
    setSelectedIndex(undefined)
  }

  return (
    <section class="arrange" aria-labelledby="arrange-title">
      <div class="arrange-heading">
        <div>
          <p class="eyebrow">Arrange one exact shuffle</p>
          <h1 id="arrange-title" class="arrange-title">
            Deck
          </h1>
        </div>

        <div class="arrange-actions">
          <p class="arrange-instructions" id="arrange-instructions">
            Drag a card, or select it and then select where it should move.
          </p>
          <button class="arrange-reset" type="button" onClick={reset}>
            Reset deck
          </button>
        </div>
      </div>

      <output class="arrange-number" aria-live="polite">
        <span>Deck number</span>
        {deckNumber().toLocaleString('en-US')}
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
                  style={{
                    '--position': position(),
                    'z-index': ordering().length - position(),
                  }}
                  onClick={() => {
                    if (suppressClick) {
                      suppressClick = false
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
