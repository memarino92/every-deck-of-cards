import { factorial } from './factorial.ts'

export interface UnrankStep<T> {
  /** Zero-based position in the output permutation. */
  readonly position: number
  /** The factoradic digit: which remaining value was selected. */
  readonly digit: number
  /** `(n-1)!` for the remaining pool size at this step. */
  readonly blockSize: bigint
  /** Running total of the reconstructed index after this step. */
  readonly indexSoFar: bigint
  /** Index remainder still to be placed after this step. */
  readonly remainder: bigint
  /** Values still available before this step's selection. */
  readonly poolBefore: readonly T[]
  /** The value selected this step. */
  readonly selected: T
}

export interface UnrankTrace<T> {
  readonly canonical: readonly T[]
  readonly index: bigint
  readonly permutationCount: bigint
  readonly steps: readonly UnrankStep<T>[]
  /** The reconstructed permutation; identical to unrankPermutation. */
  readonly permutation: readonly T[]
}

/**
 * Reproduce unrankPermutation while recording every factoradic digit
 * selection, so documentation can show exactly how an index becomes a
 * permutation. Pure and deterministic; SameValueZero semantics match
 * the production rank/unrank pair.
 */
export function traceUnrank<T>(
  canonical: readonly T[],
  index: bigint,
): UnrankTrace<T> {
  if (new Set(canonical).size !== canonical.length) {
    throw new RangeError('Canonical values must be unique')
  }

  const permutationCount = factorial(canonical.length)

  if (typeof index !== 'bigint' || index < 0n || index >= permutationCount) {
    throw new RangeError(
      `Permutation index must be from 0 through ${permutationCount - 1n}`,
    )
  }

  const remaining = [...canonical]
  const permutation: T[] = []
  const steps: UnrankStep<T>[] = []
  let remainder = index
  let indexSoFar = 0n

  while (remaining.length > 0) {
    const blockSize = factorial(remaining.length - 1)
    const digit = Number(remainder / blockSize)
    const poolBefore = Object.freeze([...remaining])
    const selectedValues = remaining.splice(digit, 1)

    if (selectedValues.length !== 1) {
      throw new Error('Factoradic digit selected a missing value')
    }

    const selected = selectedValues[0] as T

    indexSoFar += BigInt(digit) * blockSize
    remainder %= blockSize

    steps.push(
      Object.freeze({
        position: permutation.length,
        digit,
        blockSize,
        indexSoFar,
        remainder,
        poolBefore,
        selected,
      }),
    )
    permutation.push(selected)
  }

  return Object.freeze({
    canonical: Object.freeze([...canonical]),
    index,
    permutationCount,
    steps: Object.freeze(steps),
    permutation: Object.freeze(permutation),
  })
}
