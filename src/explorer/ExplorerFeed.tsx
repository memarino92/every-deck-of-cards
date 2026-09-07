import { For } from 'solid-js'
import type { CardId } from '../domain/cards.ts'
import { DeckRow } from './DeckRow.tsx'

export function ExplorerFeed(props: {
  readonly indices: readonly bigint[]
  readonly cardsFor: (index: bigint) => readonly CardId[] | undefined
  readonly rowHeight: number
  readonly top: number
  readonly shift: number
  readonly animating: boolean
  readonly momentum: boolean
  readonly failed: boolean
  readonly onRetry: () => void
}) {
  return (
    <section
      class="explorer-feed"
      // Keyboard navigation bubbles to the enclosing input surface.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabindex="0"
      aria-label="Deck feed: every deck, in order"
      data-animating={props.animating || undefined}
      data-momentum={props.momentum || undefined}
      style={{ top: `${props.top}px` }}
    >
      {props.failed && (
        <div class="explorer-error" role="alert">
          <p>These decks could not be loaded.</p>
          <button type="button" onClick={props.onRetry}>
            Try again
          </button>
        </div>
      )}
      <div
        class="explorer-strip"
        style={{ transform: `translateY(-${props.shift}px)` }}
      >
        <For each={props.indices}>
          {(index) => (
            <DeckRow
              index={index}
              cards={props.cardsFor(index)}
              height={props.rowHeight}
              failed={props.failed}
            />
          )}
        </For>
      </div>
    </section>
  )
}
