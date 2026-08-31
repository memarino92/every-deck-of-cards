import { describe, expect, it } from 'vite-plus/test'

import { DECK_COUNT } from './deck-number.ts'
import { randomPermutationIndex, type EntropySource } from './random.ts'

/** Build an entropy source that returns the same fixed bytes every draw. */
function fixedEntropy(bytes: readonly number[]): EntropySource {
  return (target: Uint8Array) => {
    target.set(bytes)
    return target
  }
}

/** An entropy source that returns increasing values, cycling the last byte. */
function countingEntropy(start = 0): EntropySource {
  let counter = start
  return (target: Uint8Array) => {
    target.fill(0)
    target[target.length - 1] = counter & 0xff
    target[target.length - 2] = (counter >> 8) & 0xff
    counter += 1
    return target
  }
}

describe('randomPermutationIndex', () => {
  it('returns the index for an all-zero draw', () => {
    expect(
      randomPermutationIndex(fixedEntropy(Array.from({ length: 32 }, () => 0))),
    ).toBe(0n)
  })

  it('maps a small draw to itself', () => {
    const bytes = Array.from({ length: 32 }, () => 0)
    bytes[31] = 42

    expect(randomPermutationIndex(fixedEntropy(bytes))).toBe(42n)
  })

  it('always lands within the index range', () => {
    const draw = randomPermutationIndex(countingEntropy())

    expect(draw).toBeGreaterThanOrEqual(0n)
    expect(draw).toBeLessThan(DECK_COUNT)
  })

  it('rejects out-of-range draws until an acceptable one appears', () => {
    // 0xFF…FF is at the very top of the 256-bit draw space, above the accept
    // limit, so it must be rejected; the follow-up zero draw is accepted.
    let call = 0
    const entropy: EntropySource = (target) => {
      target.fill(call === 0 ? 0xff : 0x00)
      call += 1
      return target
    }

    expect(randomPermutationIndex(entropy)).toBe(0n)
    expect(call).toBe(2)
  })

  it('throws when the source never yields an acceptable draw', () => {
    expect(() =>
      randomPermutationIndex(
        fixedEntropy(Array.from({ length: 32 }, () => 0xff)),
      ),
    ).toThrow(/never produced/)
  })

  it('produces varied draws across a deterministic corpus', () => {
    const seen = new Set<bigint>()

    for (let index = 0; index < 256; index += 1) {
      seen.add(randomPermutationIndex(countingEntropy(index * 65_537)))
    }

    // Observational sanity check: 256 distinct seeds should not collapse to a
    // single value. Not a statistical proof of uniformity.
    expect(seen.size).toBeGreaterThan(1)
  })
})
