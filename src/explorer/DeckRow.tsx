import { For } from 'solid-js'
import type { CardId } from '../domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from '../domain/deck-number.ts'
import { PlayingCard } from '../PlayingCard.tsx'
import { spreadSlotStyle } from '../cards/spread.ts'
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
                class="card-slot deck-card"
                style={spreadSlotStyle(position(), props.cards?.length ?? 0)}
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
