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
