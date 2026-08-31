import { describe, expect, it } from 'vite-plus/test'

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
  it('defines exactly 52 unique cards', () => {
    expect(CARD_COUNT).toBe(52)
    expect(CARDS).toHaveLength(52)
    expect(CANONICAL_DECK).toHaveLength(52)
    expect(new Set(CANONICAL_DECK).size).toBe(52)
    expect(Object.isFrozen(SUITS)).toBe(true)
    expect(Object.isFrozen(RANKS)).toBe(true)
    expect(Object.isFrozen(CARDS)).toBe(true)
    expect(Object.isFrozen(CANONICAL_DECK)).toBe(true)
  })

  it('assigns card IDs sequentially in canonical deck order', () => {
    for (const [position, card] of CARDS.entries()) {
      expect(card.id).toBe(position)
      expect(Object.isFrozen(card)).toBe(true)
    }

    for (const [position, id] of CANONICAL_DECK.entries()) {
      expect(id).toBe(position)
    }
  })

  it('uses the adopted USPCC-style new-deck order from face to back', () => {
    const descendingRanks = RANKS.toReversed()

    expect(SUITS).toEqual(['spades', 'diamonds', 'clubs', 'hearts'])
    expect(CARDS.slice(0, 13).map((card) => card.rank)).toEqual(RANKS)
    expect(CARDS.slice(0, 13).every((card) => card.suit === 'spades')).toBe(
      true,
    )
    expect(CARDS.slice(13, 26).map((card) => card.rank)).toEqual(RANKS)
    expect(CARDS.slice(13, 26).every((card) => card.suit === 'diamonds')).toBe(
      true,
    )
    expect(CARDS.slice(26, 39).map((card) => card.rank)).toEqual(
      descendingRanks,
    )
    expect(CARDS.slice(26, 39).every((card) => card.suit === 'clubs')).toBe(
      true,
    )
    expect(CARDS.slice(39, 52).map((card) => card.rank)).toEqual(
      descendingRanks,
    )
    expect(CARDS.slice(39, 52).every((card) => card.suit === 'hearts')).toBe(
      true,
    )
  })

  it('places the new-deck endpoint cards at their canonical positions', () => {
    expect(CARDS[0]).toMatchObject({ id: 0, rank: 'ace', suit: 'spades' })
    expect(CARDS[25]).toMatchObject({ id: 25, rank: 'king', suit: 'diamonds' })
    expect(CARDS[26]).toMatchObject({ id: 26, rank: 'king', suit: 'clubs' })
    expect(CARDS[51]).toMatchObject({ id: 51, rank: 'ace', suit: 'hearts' })
  })

  it('uses ace through king rank order as the ascending contract', () => {
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
  })

  it('resolves metadata from a valid card ID', () => {
    expect(cardFromId(26 as CardId)).toEqual({
      id: 26,
      rank: 'king',
      suit: 'clubs',
    })
  })

  it.each([-1, 1.5, 52, Number.NaN, Number.POSITIVE_INFINITY, '0', 0n])(
    'rejects invalid card ID %s',
    (id) => {
      expect(() => cardFromId(id as CardId)).toThrow(RangeError)
    },
  )
})
