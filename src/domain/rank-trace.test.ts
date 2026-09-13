import { describe, expect, it } from 'vite-plus/test'
import { traceRank } from './trace.ts'
import { rankPermutation, unrankPermutation } from './permutation.ts'
import { CANONICAL_DECK } from './cards.ts'
import { DECK_COUNT } from './deck-number.ts'

describe('rank tracing', () => {
  it('matches every permutation of four cards and reconstructs each intermediate pool', () => {
    const canonical = ['A', '2', '3', '4']
    for (let index = 0n; index < 24n; index += 1n) {
      const permutation = unrankPermutation(canonical, index)
      const trace = traceRank(canonical, permutation)
      expect(trace.index).toBe(index)
      expect(trace.index).toBe(rankPermutation(canonical, permutation))
      expect(trace.steps.at(-1)?.indexSoFar).toBe(index)
      for (const step of trace.steps) {
        expect(step.poolBefore[step.digit]).toBe(permutation[step.position])
        expect(step.poolBefore).toEqual(
          canonical.filter(
            (card) => !permutation.slice(0, step.position).includes(card),
          ),
        )
      }
    }
  })
  it('preserves bigint precision for a full deck', () => {
    const trace = traceRank(CANONICAL_DECK, CANONICAL_DECK.toReversed())
    expect(trace.index).toBe(DECK_COUNT - 1n)
    expect(trace.steps.at(-1)?.indexSoFar).toBe(DECK_COUNT - 1n)
  })
  it('matches production validation and equality semantics', () => {
    expect(() => traceRank([1, 1], [1, 1])).toThrow(RangeError)
    expect(() => traceRank([1, 2], [1])).toThrow(RangeError)
    expect(() => traceRank([1, 2], [1, 1])).toThrow(RangeError)
    expect(() => traceRank([1, 2], [1, 3])).toThrow(RangeError)
    expect(traceRank([NaN, 0], [0, NaN]).index).toBe(1n)
    expect(traceRank([], []).index).toBe(0n)
  })
  it('returns immutable snapshots without modifying inputs', () => {
    const canonical = [0, 1, 2]
    const permutation = [2, 1, 0]
    const trace = traceRank(canonical, permutation)
    expect(canonical).toEqual([0, 1, 2])
    expect(permutation).toEqual([2, 1, 0])
    for (const value of [
      trace,
      trace.canonical,
      trace.permutation,
      trace.steps,
      ...trace.steps,
      ...trace.steps.map((step) => step.poolBefore),
    ])
      expect(Object.isFrozen(value)).toBe(true)
  })
})
