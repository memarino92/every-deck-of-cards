import { describe, expect, it } from 'vite-plus/test'

import { CANONICAL_DECK } from './cards.ts'
import { DECK_COUNT } from './deck-number.ts'
import { factorial } from './factorial.ts'
import {
  nextPermutation,
  rankPermutation,
  unrankPermutation,
} from './permutation.ts'

const THREE_VALUE_PERMUTATIONS = [
  ['a', 'b', 'c'],
  ['a', 'c', 'b'],
  ['b', 'a', 'c'],
  ['b', 'c', 'a'],
  ['c', 'a', 'b'],
  ['c', 'b', 'a'],
] as const

describe('permutation ranking', () => {
  it.each(
    THREE_VALUE_PERMUTATIONS.map((permutation, index) => [index, permutation]),
  )('maps known three-value permutation %i', (index, permutation) => {
    expect(unrankPermutation(['a', 'b', 'c'], BigInt(index))).toEqual(
      permutation,
    )
    expect(rankPermutation(['a', 'b', 'c'], permutation)).toBe(BigInt(index))
  })

  it('exhaustively proves round trips for collections through eight values', () => {
    for (let size = 0; size <= 8; size += 1) {
      const canonical = Array.from({ length: size }, (_, value) => value)
      const permutationCount = factorial(size)
      const seen = new Set<string>()

      for (let index = 0n; index < permutationCount; index += 1n) {
        const permutation = unrankPermutation(canonical, index)

        expect(rankPermutation(canonical, permutation)).toBe(index)
        seen.add(permutation.join(','))
      }

      expect(BigInt(seen.size)).toBe(permutationCount)
    }
  })

  it.each([
    0n,
    1n,
    51n,
    factorial(26),
    DECK_COUNT / 2n,
    DECK_COUNT - 2n,
    DECK_COUNT - 1n,
  ])('round trips representative 52-card index %s', (index) => {
    const deck = unrankPermutation(CANONICAL_DECK, index)

    expect(deck).toHaveLength(52)
    expect(new Set(deck).size).toBe(52)
    expect(rankPermutation(CANONICAL_DECK, deck)).toBe(index)
  })

  it('round trips a deterministic sample across the 52-card index space', () => {
    let index = 7_654_321n

    for (let sample = 0; sample < 128; sample += 1) {
      index =
        (index * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) %
        DECK_COUNT

      const deck = unrankPermutation(CANONICAL_DECK, index)

      expect(rankPermutation(CANONICAL_DECK, deck)).toBe(index)
    }
  })

  it('maps the final index to the reversed canonical deck', () => {
    const finalDeck = unrankPermutation(CANONICAL_DECK, DECK_COUNT - 1n)

    for (const [index, card] of finalDeck.entries()) {
      expect(card).toBe(CANONICAL_DECK.at(-index - 1))
    }
  })

  it('ranks the canonical and reversed decks at opposite boundaries', () => {
    const finalDeck = unrankPermutation(CANONICAL_DECK, DECK_COUNT - 1n)

    expect(rankPermutation(CANONICAL_DECK, CANONICAL_DECK)).toBe(0n)
    expect(rankPermutation(CANONICAL_DECK, finalDeck)).toBe(DECK_COUNT - 1n)
  })

  it.each([-1n, 6n])('rejects out-of-range index %s', (index) => {
    expect(() => unrankPermutation(['a', 'b', 'c'], index)).toThrow(RangeError)
  })

  it('rejects a non-bigint index at runtime', () => {
    expect(() => unrankPermutation(['a'], 0 as unknown as bigint)).toThrow(
      RangeError,
    )
    expect(() => unrankPermutation(['a'], '0' as unknown as bigint)).toThrow(
      RangeError,
    )
  })

  it('rejects duplicate canonical values', () => {
    expect(() => unrankPermutation(['a', 'a'], 0n)).toThrow(RangeError)
    expect(() => rankPermutation(['a', 'a'], ['a', 'a'])).toThrow(RangeError)
  })

  it('rejects a malformed permutation', () => {
    expect(() => rankPermutation(['a', 'b'], ['a'])).toThrow(RangeError)
    expect(() => rankPermutation(['a', 'b'], ['a', 'a'])).toThrow(RangeError)
    expect(() => rankPermutation(['a', 'b'], ['a', 'c'])).toThrow(RangeError)
  })

  it('rejects collections larger than a standard deck', () => {
    const oversized = Array.from({ length: 53 }, (_, value) => value)

    expect(() => unrankPermutation(oversized, 0n)).toThrow(RangeError)
    expect(() => rankPermutation(oversized, oversized)).toThrow(RangeError)
  })

  it('uses consistent SameValueZero equality for generic values', () => {
    expect(rankPermutation([Number.NaN], [Number.NaN])).toBe(0n)
    expect(unrankPermutation([Number.NaN], 0n)).toEqual([Number.NaN])
    expect(rankPermutation([-0, 1], [0, 1])).toBe(0n)
    expect(() => rankPermutation([-0, 0], [-0, 0])).toThrow(RangeError)
  })
})

describe('nextPermutation', () => {
  it('steps from index i to i+1 for a run of 52-card decks', () => {
    const start = 12_345_678_901_234_567_890n
    const ordering = [...unrankPermutation(CANONICAL_DECK, start)]

    for (let step = 1; step <= 512; step += 1) {
      expect(nextPermutation(ordering)).toBe(true)
      expect(rankPermutation(CANONICAL_DECK, ordering)).toBe(
        start + BigInt(step),
      )
    }
  })

  it('matches unrank across suit-run boundaries', () => {
    // Cross the spades→diamonds boundary (index 13!) and the midpoint rank
    // reversal, where many positions change at once.
    for (const boundary of [factorial(13), DECK_COUNT / 2n]) {
      const ordering = [...unrankPermutation(CANONICAL_DECK, boundary - 1n)]

      expect(nextPermutation(ordering)).toBe(true)
      expect(rankPermutation(CANONICAL_DECK, ordering)).toBe(boundary)
    }
  })

  it('returns false at the final permutation and leaves it in place', () => {
    const ordering = [...unrankPermutation(CANONICAL_DECK, DECK_COUNT - 1n)]

    expect(nextPermutation(ordering)).toBe(false)
    expect(rankPermutation(CANONICAL_DECK, ordering)).toBe(DECK_COUNT - 1n)
  })

  it('produces the canonical order on the first step from deck 1', () => {
    const ordering = [...unrankPermutation(CANONICAL_DECK, 0n)]

    nextPermutation(ordering)

    // Deck 2 swaps the last two cards of the new-deck order.
    expect(rankPermutation(CANONICAL_DECK, ordering)).toBe(1n)
  })
})
