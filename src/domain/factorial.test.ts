import { describe, expect, it } from 'vitest'

import { factorial } from './factorial.ts'

describe('factorial', () => {
  it.each([
    [0, 1n],
    [1, 1n],
    [5, 120n],
    [10, 3_628_800n],
  ])('computes %i!', (value, expected) => {
    expect(factorial(value)).toBe(expected)
  })

  it('computes the exact number of standard deck permutations', () => {
    expect(factorial(52)).toBe(
      80_658_175_170_943_878_571_660_636_856_403_766_975_289_505_440_883_277_824_000_000_000_000n,
    )
  })

  it.each([
    -1,
    1.5,
    53,
    Number.MAX_SAFE_INTEGER,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects invalid input %s', (value) => {
    expect(() => factorial(value)).toThrow(RangeError)
  })
})
