import { factorial } from '../src/domain/factorial.ts'

class FenwickTree {
  readonly #highestStep: number
  readonly #tree: Int16Array

  constructor(size: number) {
    this.#tree = new Int16Array(size + 1)

    for (let index = 1; index <= size; index += 1) {
      this.#tree[index] = index & -index
    }

    this.#highestStep = 2 ** Math.floor(Math.log2(Math.max(size, 1)))
  }

  #add(index: number, change: number): void {
    for (
      let current = index;
      current < this.#tree.length;
      current += current & -current
    ) {
      this.#tree[current] = (this.#tree[current] ?? 0) + change
    }
  }

  takeByOrder(order: number): number {
    let index = 0
    let target = order + 1

    for (let step = this.#highestStep; step > 0; step = Math.floor(step / 2)) {
      const next = index + step

      if (next < this.#tree.length && (this.#tree[next] as number) < target) {
        index = next
        target -= this.#tree[next] as number
      }
    }

    this.#add(index + 1, -1)
    return index
  }
}

export function unrankPermutationWithFenwick<T>(
  canonical: readonly T[],
  index: bigint,
): T[] {
  if (new Set(canonical).size !== canonical.length) {
    throw new RangeError('Canonical values must be unique')
  }

  const permutationCount = factorial(canonical.length)

  if (typeof index !== 'bigint' || index < 0n || index >= permutationCount) {
    throw new RangeError(
      `Permutation index must be from 0 through ${permutationCount - 1n}`,
    )
  }

  const available = new FenwickTree(canonical.length)
  const permutation: T[] = []
  let remainder = index

  for (let remaining = canonical.length; remaining > 0; remaining -= 1) {
    const blockSize = factorial(remaining - 1)
    const selectedIndex = available.takeByOrder(Number(remainder / blockSize))

    permutation.push(canonical[selectedIndex] as T)
    remainder %= blockSize
  }

  return permutation
}
