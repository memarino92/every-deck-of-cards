import { For } from 'solid-js'

import { cardFromId, type Card, type CardId } from './domain/cards.ts'

/**
 * Playing-card face rendering. This is pure presentation: the domain stays
 * numeric, and this module maps a card ID to rank/suit symbols and a face
 * layout. Rows in the explorer fan 52 of these left to right.
 */

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
} as const

const RANK_LABELS: Record<Card['rank'], string> = {
  ace: 'A',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  jack: 'J',
  queen: 'Q',
  king: 'K',
}

const RED_SUITS = new Set<Card['suit']>(['hearts', 'diamonds'])

const COURT_RANKS = new Set<Card['rank']>(['jack', 'queen', 'king'])

/** Crown/monogram glyph for the court panel of each face rank. */
const COURT_GLYPHS: Record<string, string> = {
  jack: '♞',
  queen: '♛',
  king: '♚',
}

/**
 * Classic pip layouts as [column, row] fractions within the pip area, for
 * ranks two through ten. Ace uses a single large centered pip.
 */
const PIP_LAYOUTS: Readonly<
  Record<string, readonly (readonly [number, number])[]>
> = {
  two: [
    [0.5, 0.12],
    [0.5, 0.88],
  ],
  three: [
    [0.5, 0.12],
    [0.5, 0.5],
    [0.5, 0.88],
  ],
  four: [
    [0.28, 0.12],
    [0.72, 0.12],
    [0.28, 0.88],
    [0.72, 0.88],
  ],
  five: [
    [0.28, 0.12],
    [0.72, 0.12],
    [0.5, 0.5],
    [0.28, 0.88],
    [0.72, 0.88],
  ],
  six: [
    [0.28, 0.12],
    [0.72, 0.12],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.88],
    [0.72, 0.88],
  ],
  seven: [
    [0.28, 0.12],
    [0.72, 0.12],
    [0.5, 0.31],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.88],
    [0.72, 0.88],
  ],
  eight: [
    [0.28, 0.12],
    [0.72, 0.12],
    [0.5, 0.31],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.5, 0.69],
    [0.28, 0.88],
    [0.72, 0.88],
  ],
  nine: [
    [0.28, 0.1],
    [0.72, 0.1],
    [0.28, 0.37],
    [0.72, 0.37],
    [0.5, 0.5],
    [0.28, 0.63],
    [0.72, 0.63],
    [0.28, 0.9],
    [0.72, 0.9],
  ],
  ten: [
    [0.28, 0.1],
    [0.72, 0.1],
    [0.5, 0.23],
    [0.28, 0.37],
    [0.72, 0.37],
    [0.28, 0.63],
    [0.72, 0.63],
    [0.5, 0.77],
    [0.28, 0.9],
    [0.72, 0.9],
  ],
}

export interface CardFace {
  readonly rankLabel: string
  readonly suitSymbol: string
  readonly isRed: boolean
  readonly isCourt: boolean
  readonly courtGlyph: string
  readonly pips: readonly (readonly [number, number])[]
}

export function cardFace(id: CardId): CardFace {
  const card = cardFromId(id)
  const isCourt = COURT_RANKS.has(card.rank)

  return {
    rankLabel: RANK_LABELS[card.rank],
    suitSymbol: SUIT_SYMBOLS[card.suit],
    isRed: RED_SUITS.has(card.suit),
    isCourt,
    courtGlyph: COURT_GLYPHS[card.rank] ?? '',
    pips: card.rank === 'ace' ? [[0.5, 0.5]] : (PIP_LAYOUTS[card.rank] ?? []),
  }
}

export function PlayingCard(props: { id: CardId }) {
  const face = () => cardFace(props.id)

  return (
    <div
      class={['playing-card', { red: face().isRed }]}
      aria-label={`${face().rankLabel} of ${cardFromId(props.id).suit}`}
    >
      <span class="corner corner-top">
        <span class="corner-rank">{face().rankLabel}</span>
        <span class="corner-suit">{face().suitSymbol}</span>
      </span>

      {face().isCourt ? (
        <span class="court" aria-hidden="true">
          <span class="court-figure">
            <span class={`court-glyph glyph-${cardFromId(props.id).rank}`}>
              {face().courtGlyph}
            </span>
          </span>
          <span class="court-figure court-figure-flip">
            <span class={`court-glyph glyph-${cardFromId(props.id).rank}`}>
              {face().courtGlyph}
            </span>
          </span>
          <span class="court-emblem">{face().suitSymbol}</span>
        </span>
      ) : (
        <span class="pips" aria-hidden="true">
          <For each={face().pips}>
            {([x, y]) => (
              <span
                class="pip"
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              >
                {face().suitSymbol}
              </span>
            )}
          </For>
        </span>
      )}

      <span class="corner corner-bottom">
        <span class="corner-rank">{face().rankLabel}</span>
        <span class="corner-suit">{face().suitSymbol}</span>
      </span>
    </div>
  )
}
