import { For, createMemo } from 'solid-js'
import { CANONICAL_DECK } from '../domain/cards.ts'
import { factorial } from '../domain/factorial.ts'
import { traceUnrank } from '../domain/trace.ts'
import { PlayingCard } from '../PlayingCard.tsx'

export function PermutationCards(props: { readonly size: 2 | 3 }) {
  const rows = createMemo(() => {
    const cards = CANONICAL_DECK.slice(0, props.size)
    const result = []
    for (let index = 0n; index < factorial(props.size); index += 1n) {
      result.push({ index, cards: traceUnrank(cards, index).permutation })
    }
    return result
  })

  return (
    <ol
      class={['talk-permutation-cards', { 'is-two-cards': props.size === 2 }]}
      aria-label="Card arrangements in index order"
    >
      <For each={rows()}>
        {(row) => (
          <li aria-label={`Index ${row.index}`}>
            <span class="talk-arrangement-index">{row.index.toString()}</span>
            <For each={row.cards}>{(card) => <PlayingCard id={card} />}</For>
          </li>
        )}
      </For>
    </ol>
  )
}
