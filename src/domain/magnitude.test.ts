import { describe, expect, it } from 'vitest'

import { DECK_COUNT } from './deck-number.ts'
import { factorial } from './factorial.ts'
import { ATOMS_ON_EARTH, compareDeckCountToAtomsOnEarth } from './magnitude.ts'

describe('magnitude comparisons', () => {
  it('pins the atoms-on-Earth estimate to its cited value', () => {
    // Order-of-magnitude estimate (~1.3e50); the test exists so the
    // published claim cannot silently drift from its source.
    expect(ATOMS_ON_EARTH.toString()).toBe(`13${'0'.repeat(49)}`)
  })

  it('compares 52! to atoms on Earth with exact integer arithmetic', () => {
    const comparison = compareDeckCountToAtomsOnEarth()

    expect(comparison.decks).toBe(DECK_COUNT)
    expect(comparison.decks).toBe(factorial(52))
    expect(comparison.atoms).toBe(ATOMS_ON_EARTH)

    // 52! ≈ 8.07e67 and the estimate is 1.3e50, so the integer ratio
    // is roughly 6.2e17: about 620 quadrillion decks per atom.
    expect(comparison.timesLarger).toBe(DECK_COUNT / ATOMS_ON_EARTH)
    expect(comparison.timesLarger).toBe(620_447_501_314_952_912n)
  })

  it('reports a ratio consistent with the deck count itself', () => {
    const comparison = compareDeckCountToAtomsOnEarth()

    expect(comparison.atoms * comparison.timesLarger).toBeLessThanOrEqual(
      comparison.decks,
    )
    expect(comparison.atoms * (comparison.timesLarger + 1n)).toBeGreaterThan(
      comparison.decks,
    )
  })
})
