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
  it('defines exactly 52 unique sequential card IDs', () => {
    expect(CARD_COUNT).toBe(52)
    expect(CANONICAL_DECK).toEqual(Array.from({ length: 52 }, (_, id) => id))
    expect(new Set(CANONICAL_DECK).size).toBe(52)
    expect(Object.isFrozen(SUITS)).toBe(true)
    expect(Object.isFrozen(RANKS)).toBe(true)
    expect(Object.isFrozen(CARDS)).toBe(true)
    expect(Object.isFrozen(CANONICAL_DECK)).toBe(true)
  })

  it('uses suit-major clubs, diamonds, hearts, spades order', () => {
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
