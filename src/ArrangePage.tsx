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

function cardName(id: CardId): string {
  const card = cardFromId(id)
  return `${card.rank} of ${card.suit}`
}

export function ArrangePage() {
  const [ordering, setOrdering] = createSignal<readonly CardId[]>([
    ...CANONICAL_DECK,
  ])
  const [selectedIndex, setSelectedIndex] = createSignal<number>()
  const deckNumber = createMemo(() =>
    permutationIndexToPublicDeckNumber(
      rankPermutation(CANONICAL_DECK, ordering()),
    ),
  )

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
            Select a card, then select where it should move.
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
        <div class="arrange-spread-track">
          <For each={ordering()}>
            {(id, position) => {
              const isSelected = () => selectedIndex() === position()
              const label = () =>
                isSelected()
                  ? `Cancel moving ${cardName(id)}`
                  : selectedIndex() === undefined
                    ? `Select ${cardName(id)}`
                    : `Move selected card to position ${position() + 1}, before ${cardName(id)}`

              return (
                <button
                  class={['arrange-card', { selected: isSelected() }]}
                  type="button"
                  aria-label={label()}
                  aria-pressed={isSelected() ? 'true' : 'false'}
                  style={{
                    '--position': position(),
                    'z-index': position() + 1,
                  }}
                  onClick={() => selectPosition(position())}
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
