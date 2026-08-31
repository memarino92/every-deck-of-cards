import { describe, expect, it } from 'vite-plus/test'

import { CANONICAL_DECK } from '../src/domain/cards.ts'
import { DECK_COUNT } from '../src/domain/deck-number.ts'
import { factorial } from '../src/domain/factorial.ts'
import { unrankPermutation } from '../src/domain/permutation.ts'
import { unrankPermutationWithFenwick } from './fenwick-unrank.ts'

describe('Fenwick unranking benchmark candidate', () => {
  it('matches array selection for every permutation through eight values', () => {
    for (let size = 0; size <= 8; size += 1) {
      const canonical = Array.from({ length: size }, (_, value) => value)

      for (let index = 0n; index < factorial(size); index += 1n) {
        expect(unrankPermutationWithFenwick(canonical, index)).toEqual(
          unrankPermutation(canonical, index),
        )
      }
    }
  })

  it('matches array selection across the 52-card index space', () => {
    const indexes = [0n, 1n, DECK_COUNT / 2n, DECK_COUNT - 2n, DECK_COUNT - 1n]
    let index = 7_654_321n

    for (let sample = 0; sample < 128; sample += 1) {
      index =
        (index * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) %
        DECK_COUNT
      indexes.push(index)
    }

    for (const candidateIndex of indexes) {
      expect(
        unrankPermutationWithFenwick(CANONICAL_DECK, candidateIndex),
      ).toEqual(unrankPermutation(CANONICAL_DECK, candidateIndex))
    }
  })
})
