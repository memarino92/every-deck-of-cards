import { describe, expect, it } from 'vite-plus/test'

import { CANONICAL_DECK } from './cards.ts'
import { DECK_COUNT } from './deck-number.ts'
import { factorial } from './factorial.ts'
import { rankPermutation, unrankPermutation } from './permutation.ts'
import { traceUnrank } from './trace.ts'

describe('unrank tracing', () => {
  it('records the exact digit sequence for a known three-value walk', () => {
    const trace = traceUnrank(['a', 'b', 'c'], 4n)

    expect(trace.permutationCount).toBe(6n)
    expect(trace.permutation).toEqual(['c', 'a', 'b'])
    expect(trace.steps).toHaveLength(3)

    const [first, second, third] = trace.steps
    expect(first).toMatchObject({
      position: 0,
      digit: 2,
      blockSize: 2n,
      indexSoFar: 4n,
      remainder: 0n,
      selected: 'c',
    })
    expect(first?.poolBefore).toEqual(['a', 'b', 'c'])
    expect(second).toMatchObject({
      position: 1,
      digit: 0,
      blockSize: 1n,
      indexSoFar: 4n,
      remainder: 0n,
      selected: 'a',
    })
    expect(second?.poolBefore).toEqual(['a', 'b'])
    expect(third).toMatchObject({
      position: 2,
      digit: 0,
      blockSize: 1n,
      selected: 'b',
    })
  })

  it('reconstructs the running index from its own digits', () => {
    for (let index = 0n; index < 24n; index += 1n) {
      const trace = traceUnrank([0, 1, 2, 3], index)
      const rebuilt = trace.steps.reduce(
        (total, step) => total + BigInt(step.digit) * step.blockSize,
        0n,
      )

      expect(rebuilt).toBe(index)
      expect(trace.steps.at(-1)?.indexSoFar).toBe(index)
      expect(trace.steps.at(-1)?.remainder).toBe(0n)
      expect(trace.permutation).toEqual(unrankPermutation([0, 1, 2, 3], index))
      expect(rankPermutation([0, 1, 2, 3], trace.permutation)).toBe(index)
    }
  })

  it('exhaustively matches unrankPermutation through eight values', () => {
    for (let size = 0; size <= 8; size += 1) {
      const canonical = Array.from({ length: size }, (_, value) => value)
      const permutationCount = factorial(size)

      for (let index = 0n; index < permutationCount; index += 1n) {
        expect(traceUnrank(canonical, index).permutation).toEqual(
          unrankPermutation(canonical, index),
        )
      }
    }
  })

  it('traces a representative 52-card index against production unrank', () => {
    const index = DECK_COUNT / 2n
    const trace = traceUnrank(CANONICAL_DECK, index)

    expect(trace.steps).toHaveLength(52)
    expect(trace.permutation).toEqual(unrankPermutation(CANONICAL_DECK, index))
    expect(trace.steps[0]?.blockSize).toBe(factorial(51))
    expect(trace.steps[0]?.poolBefore).toEqual([...CANONICAL_DECK])
    expect(trace.steps.at(-1)?.indexSoFar).toBe(index)
  })

  it('freezes its output', () => {
    const trace = traceUnrank(['a', 'b', 'c'], 0n)

    expect(Object.isFrozen(trace)).toBe(true)
    expect(Object.isFrozen(trace.steps)).toBe(true)
    expect(Object.isFrozen(trace.permutation)).toBe(true)
    expect(Object.isFrozen(trace.canonical)).toBe(true)
    for (const step of trace.steps) {
      expect(Object.isFrozen(step)).toBe(true)
      expect(Object.isFrozen(step.poolBefore)).toBe(true)
    }
  })

  it.each([-1n, 6n])('rejects out-of-range index %s', (index) => {
    expect(() => traceUnrank(['a', 'b', 'c'], index)).toThrow(RangeError)
  })

  it('rejects duplicate canonical values and non-bigint indices', () => {
    expect(() => traceUnrank(['a', 'a'], 0n)).toThrow(RangeError)
    expect(() => traceUnrank(['a'], 0 as unknown as bigint)).toThrow(RangeError)
  })
})
