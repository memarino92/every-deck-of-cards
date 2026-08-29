import { factorial } from './factorial.ts'

function permutationCountFor<T>(canonical: readonly T[]): bigint {
  if (new Set(canonical).size !== canonical.length) {
    throw new RangeError('Canonical values must be unique')
  }

  return factorial(canonical.length)
}

function assertIndex(index: bigint, permutationCount: bigint): void {
  if (typeof index !== 'bigint' || index < 0n || index >= permutationCount) {
    throw new RangeError(
      `Permutation index must be from 0 through ${permutationCount - 1n}`,
    )
  }
}

export function unrankPermutation<T>(
  canonical: readonly T[],
  index: bigint,
): T[] {
  assertIndex(index, permutationCountFor(canonical))

  const remaining = [...canonical]
  const permutation: T[] = []
  let remainder = index

  while (remaining.length > 0) {
    const blockSize = factorial(remaining.length - 1)
    const selectedIndex = Number(remainder / blockSize)
    const selectedValues = remaining.splice(selectedIndex, 1)

    if (selectedValues.length !== 1) {
      throw new Error('Factoradic digit selected a missing value')
    }

    permutation.push(selectedValues[0] as T)
    remainder %= blockSize
  }

  return permutation
}

export function rankPermutation<T>(
  canonical: readonly T[],
  permutation: readonly T[],
): bigint {
  permutationCountFor(canonical)

  if (permutation.length !== canonical.length) {
    throw new RangeError('Permutation length must match canonical length')
  }

  const remaining = [...canonical]
  let index = 0n

  for (const value of permutation) {
    const selectedIndex = remaining.findIndex(
      (candidate) => candidate === value || Object.is(candidate, value),
    )

    if (selectedIndex === -1) {
      throw new RangeError(
        'Permutation must contain each canonical value exactly once',
      )
    }

    index += BigInt(selectedIndex) * factorial(remaining.length - 1)
    remaining.splice(selectedIndex, 1)
  }

  return index
}

/**
 * Advance `permutation` to the next ordering in the same lexicographic
 * sequence `unrankPermutation` produces — that is, from index `i` to index
 * `i + 1` — using the standard in-place algorithm. Mutates and returns the
 * given array; returns `false` (leaving the array as the final ordering) when
 * already at the last permutation.
 *
 * This is the cheap way to walk consecutive decks while scrolling: stepping
 * costs one comparison sweep and a suffix reversal with no bigint division,
 * versus a full factoradic unrank per deck. Stepping requires that array
 * order matches canonical order, so it is typed on the numeric card-ID deck.
 */
export function nextPermutation(permutation: number[]): boolean {
  let pivot = permutation.length - 2

  while (
    pivot >= 0 &&
    (permutation[pivot] as number) > (permutation[pivot + 1] as number)
  ) {
    pivot -= 1
  }

  if (pivot < 0) {
    return false
  }

  let successor = permutation.length - 1

  while ((permutation[successor] as number) < (permutation[pivot] as number)) {
    successor -= 1
  }

  ;[permutation[pivot], permutation[successor]] = [
    permutation[successor] as number,
    permutation[pivot] as number,
  ]

  let left = pivot + 1
  let right = permutation.length - 1

  while (left < right) {
    ;[permutation[left], permutation[right]] = [
      permutation[right] as number,
      permutation[left] as number,
    ]
    left += 1
    right -= 1
  }

  return true
}
