import { describe, expect, it } from 'vitest'

import {
  CANONICAL_DECK,
  CARDS,
  CARD_COUNT,
  RANKS,
  SUITS,
  cardFromId,
  type CardId,
} from './cards.ts'

describe('canonical cards', () => {
  it('defines exactly 52 unique card IDs', () => {
    expect(CARD_COUNT).toBe(52)
    expect(CANONICAL_DECK).toHaveLength(52)
    expect(new Set(CANONICAL_DECK).size).toBe(52)
    for (const card of CARDS) {
      expect(CANONICAL_DECK).toContain(card.id)
    }
    expect(Object.isFrozen(SUITS)).toBe(true)
    expect(Object.isFrozen(RANKS)).toBe(true)
    expect(Object.isFrozen(CARDS)).toBe(true)
    expect(Object.isFrozen(CANONICAL_DECK)).toBe(true)
  })

  it('uses the adopted USPCC-style new-deck order from face to back', () => {
    const orderedCards = CANONICAL_DECK.map(cardFromId)
    const descendingRanks = RANKS.map(
      (_rank, index) => RANKS[RANKS.length - index - 1],
    )

    expect(orderedCards.slice(0, 13).map((card) => card.rank)).toEqual(RANKS)
    expect(
      orderedCards.slice(0, 13).every((card) => card.suit === 'spades'),
    ).toBe(true)
    expect(orderedCards.slice(13, 26).map((card) => card.rank)).toEqual(RANKS)
    expect(
      orderedCards.slice(13, 26).every((card) => card.suit === 'diamonds'),
    ).toBe(true)
    expect(orderedCards.slice(26, 39).map((card) => card.rank)).toEqual(
      descendingRanks,
    )
    expect(
      orderedCards.slice(26, 39).every((card) => card.suit === 'clubs'),
    ).toBe(true)
    expect(orderedCards.slice(39, 52).map((card) => card.rank)).toEqual(
      descendingRanks,
    )
    expect(
      orderedCards.slice(39, 52).every((card) => card.suit === 'hearts'),
    ).toBe(true)
    expect(orderedCards[0]).toMatchObject({ rank: 'ace', suit: 'spades' })
    expect(orderedCards[25]).toMatchObject({ rank: 'king', suit: 'diamonds' })
    expect(orderedCards[26]).toMatchObject({ rank: 'king', suit: 'clubs' })
    expect(orderedCards[51]).toMatchObject({ rank: 'ace', suit: 'hearts' })
  })

  it('assigns card IDs in suit-major clubs, diamonds, hearts, spades order', () => {
    expect(SUITS).toEqual(['clubs', 'diamonds', 'hearts', 'spades'])
    expect(CARDS[0]).toMatchObject({ rank: 'ace', suit: 'clubs' })
    expect(CARDS[12]).toMatchObject({ rank: 'king', suit: 'clubs' })
    expect(CARDS[13]).toMatchObject({ rank: 'ace', suit: 'diamonds' })
    expect(CARDS[51]).toMatchObject({ rank: 'king', suit: 'spades' })
  })

  it('uses ace through king rank order within every suit', () => {
    expect(RANKS).toEqual([
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
    ])

    for (const [index, card] of CARDS.entries()) {
      expect(card.id).toBe(index)
      expect(card.rank).toBe(RANKS[index % RANKS.length])
      expect(card.suit).toBe(SUITS[Math.floor(index / RANKS.length)])
      expect(Object.isFrozen(card)).toBe(true)
    }
  })

  it('resolves metadata from a valid card ID', () => {
    expect(cardFromId(26 as CardId)).toEqual({
      id: 26,
      rank: 'ace',
      suit: 'hearts',
    })
  })

  it.each([-1, 1.5, 52, Number.NaN, Number.POSITIVE_INFINITY, '0', 0n])(
    'rejects invalid card ID %s',
    (id) => {
      expect(() => cardFromId(id as CardId)).toThrow(RangeError)
    },
  )
})
