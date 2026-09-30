import { expect, test } from 'vite-plus/test'

import { CANONICAL_DECK } from '../src/domain/cards.ts'
import { DECK_COUNT } from '../src/domain/deck-number.ts'
import { unrankPermutation } from '../src/domain/permutation.ts'
import { unrankPermutationWithFenwick } from './fenwick-unrank.ts'

const CASES = [
  ['first', 0n],
  ['middle', DECK_COUNT / 2n],
  ['last', DECK_COUNT - 1n],
] as const

const BENCHMARK_OPTIONS = {
  iterations: 100,
  time: 750,
  warmupIterations: 20,
  warmupTime: 250,
} as const

const MIXED_CORPUS = (() => {
  const indexes: bigint[] = [0n, DECK_COUNT / 2n, DECK_COUNT - 1n]
  let index = 7_654_321n

  for (let sample = 0; sample < 61; sample += 1) {
    index =
      (index * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) %
      DECK_COUNT
    indexes.push(index)
  }

  return indexes
})()

let resultSink = 0

function consumeResult(deck: readonly number[]): void {
  resultSink = (resultSink + (deck[0] ?? 0) + (deck[51] ?? 0)) & 0xffff
}

for (const [name, index] of CASES) {
  test(`unrank 52-card ${name} index`, async ({ bench }) => {
    const arrayResult = await bench('shrinking array', () => {
      consumeResult(unrankPermutation(CANONICAL_DECK, index))
    }).run(BENCHMARK_OPTIONS)
    const fenwickResult = await bench('Fenwick tree', () => {
      consumeResult(unrankPermutationWithFenwick(CANONICAL_DECK, index))
    }).run(BENCHMARK_OPTIONS)

    expect(arrayResult.throughput.mean).toBeGreaterThan(0)
    expect(fenwickResult.throughput.mean).toBeGreaterThan(0)
  })
}

test(`unrank mixed ${MIXED_CORPUS.length}-index corpus, array first`, async ({
  bench,
}) => {
  const arrayResult = await bench('shrinking array', () => {
    for (const index of MIXED_CORPUS) {
      consumeResult(unrankPermutation(CANONICAL_DECK, index))
    }
  }).run(BENCHMARK_OPTIONS)

  const fenwickResult = await bench('Fenwick tree', () => {
    for (const index of MIXED_CORPUS) {
      consumeResult(unrankPermutationWithFenwick(CANONICAL_DECK, index))
    }
  }).run(BENCHMARK_OPTIONS)

  expect(arrayResult.throughput.mean).toBeGreaterThan(0)
  expect(fenwickResult.throughput.mean).toBeGreaterThan(0)
})

test(`unrank mixed ${MIXED_CORPUS.length}-index corpus, Fenwick first`, async ({
  bench,
}) => {
  const fenwickResult = await bench('Fenwick tree', () => {
    for (const index of MIXED_CORPUS) {
      consumeResult(unrankPermutationWithFenwick(CANONICAL_DECK, index))
    }
  }).run(BENCHMARK_OPTIONS)

  const arrayResult = await bench('shrinking array', () => {
    for (const index of MIXED_CORPUS) {
      consumeResult(unrankPermutation(CANONICAL_DECK, index))
    }
  }).run(BENCHMARK_OPTIONS)

  expect(arrayResult.throughput.mean).toBeGreaterThan(0)
  expect(fenwickResult.throughput.mean).toBeGreaterThan(0)
})
