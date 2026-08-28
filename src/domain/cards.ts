export const SUITS = Object.freeze([
  'clubs',
  'diamonds',
  'hearts',
  'spades',
] as const)

export const RANKS = Object.freeze([
  'ace',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'jack',
  'queen',
  'king',
] as const)

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

declare const cardIdBrand: unique symbol

export type CardId = number & { readonly [cardIdBrand]: 'CardId' }

export interface Card {
  readonly id: CardId
  readonly rank: Rank
  readonly suit: Suit
}

export const CARD_COUNT = SUITS.length * RANKS.length

export const CARDS: readonly Card[] = Object.freeze(
  SUITS.flatMap((suit, suitIndex) =>
    RANKS.map((rank, rankIndex) =>
      Object.freeze({
        id: (suitIndex * RANKS.length + rankIndex) as CardId,
        rank,
        suit,
      }),
    ),
  ),
)

function cardIdsForSuit(suit: Suit, descending = false): CardId[] {
  const cards = CARDS.filter((card) => card.suit === suit)

  return cards.map((card, index) =>
    descending ? (cards[cards.length - index - 1] as Card).id : card.id,
  )
}

export const CANONICAL_DECK: readonly CardId[] = Object.freeze([
  ...cardIdsForSuit('spades'),
  ...cardIdsForSuit('diamonds'),
  ...cardIdsForSuit('clubs', true),
  ...cardIdsForSuit('hearts', true),
])

export function cardFromId(id: CardId): Card {
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id < 0 ||
    id >= CARD_COUNT
  ) {
    throw new RangeError(`Card ID must be from 0 through ${CARD_COUNT - 1}`)
  }

  return CARDS[id] as Card
}
