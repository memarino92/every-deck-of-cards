import { For } from 'solid-js'
import type { CardId } from '../domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from '../domain/deck-number.ts'
import { PlayingCard } from '../PlayingCard.tsx'
interface DeckRowProps {
  readonly index: bigint
  readonly cards: readonly CardId[] | undefined
  readonly height: number
  readonly failed: boolean
}
export function DeckRow(props: DeckRowProps) {
  const number = () => permutationIndexToPublicDeckNumber(props.index)

  return (
    <div class="deck-row" style={{ height: `${props.height}px` }}>
      <span class="deck-number">{number().toLocaleString('en-US')}</span>
      <div class="deck-fan">
        {props.cards !== undefined ? (
          <For each={props.cards}>
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
                <PlayingCard id={id} />
              </div>
            )}
          </For>
        ) : (
          <span class="deck-loading">
            {props.failed ? 'Unavailable' : 'Shuffling…'}
          </span>
        )}
      </div>
    </div>
  )
}
