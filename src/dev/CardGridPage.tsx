import { useSearchParams } from '@solidjs/router'
import { createSignal, For } from 'solid-js'

import { cardFromId, type CardId } from '../domain/cards.ts'
import { PlayingCard } from '../PlayingCard.tsx'

const ALL_IDS: readonly CardId[] = Array.from(
  { length: 52 },
  (_, id) => id as CardId,
)

/**
 * A grid of all 52 card faces for styling iteration. Dev-only route; not
 * linked from the site nav. A width slider previews how faces scale into the
 * explorer's fanned rows. `?rank=jack` (or any rank) isolates that rank.
 */
export function CardGridPage() {
  const [width, setWidth] = createSignal(6)
  const [searchParams] = useSearchParams()
  const rankFilter = () => {
    const raw = searchParams['rank']
    return Array.isArray(raw) ? raw[0] : raw
  }

  const ids = () => {
    const rank = rankFilter()

    if (rank === undefined) {
      return ALL_IDS
    }

    return ALL_IDS.filter((id) => cardFromId(id).rank === rank)
  }

  return (
    <section class="card-grid-page" aria-labelledby="card-grid-title">
      <header class="card-grid-bar">
        <div>
          <p class="eyebrow">Card styling</p>
          <h1 id="card-grid-title">All 52 faces.</h1>
        </div>

        <label class="card-grid-control">
          <span>Card width: {width()}rem</span>
          <input
            type="range"
            min="2.4"
            max="9"
            step="0.1"
            value={width()}
            onInput={(event) => setWidth(Number(event.currentTarget.value))}
          />
        </label>
      </header>

      <div class="card-grid" style={{ '--card-width': `${width()}rem` }}>
        <For each={ids()}>
          {(id) => (
            <figure class="card-cell">
              <PlayingCard id={id} />
              <figcaption>
                {cardFromId(id).rank} of {cardFromId(id).suit}
              </figcaption>
            </figure>
          )}
        </For>
      </div>
    </section>
  )
}
