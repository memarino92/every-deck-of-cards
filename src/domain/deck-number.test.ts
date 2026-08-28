import { describe, expect, it } from 'vitest'

import {
  DECK_COUNT,
  FIRST_DECK_NUMBER,
  LAST_DECK_NUMBER,
  permutationIndexToPublicDeckNumber,
  publicDeckNumberToIndex,
} from './deck-number.ts'

describe('public deck numbers', () => {
  it('uses the inclusive one-based range from 1 through 52!', () => {
    expect(FIRST_DECK_NUMBER).toBe(1n)
    expect(LAST_DECK_NUMBER).toBe(DECK_COUNT)
    expect(DECK_COUNT.toString()).toBe(
      '80658175170943878571660636856403766975289505440883277824000000000000',
    )
  })

  it.each([
    [1n, 0n],
    [2n, 1n],
    [DECK_COUNT, DECK_COUNT - 1n],
  ])('maps public deck %s to internal index %s', (deckNumber, index) => {
    expect(publicDeckNumberToIndex(deckNumber)).toBe(index)
    expect(permutationIndexToPublicDeckNumber(index)).toBe(deckNumber)
  })

  it.each([0n, -1n, DECK_COUNT + 1n])(
    'rejects invalid public deck number %s',
    (deckNumber) => {
      expect(() => publicDeckNumberToIndex(deckNumber)).toThrow(RangeError)
    },
  )

  it.each([-1n, DECK_COUNT])('rejects invalid internal index %s', (index) => {
    expect(() => permutationIndexToPublicDeckNumber(index)).toThrow(RangeError)
  })

  it('rejects non-bigint values at runtime boundaries', () => {
    expect(() => publicDeckNumberToIndex(1 as unknown as bigint)).toThrow(
      RangeError,
    )
    expect(() => publicDeckNumberToIndex('1' as unknown as bigint)).toThrow(
      RangeError,
    )
    expect(() =>
      permutationIndexToPublicDeckNumber(0 as unknown as bigint),
    ).toThrow(RangeError)
  })
})
