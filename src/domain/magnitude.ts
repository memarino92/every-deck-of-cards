import { factorial } from './factorial.ts'

/**
 * Estimated number of atoms on Earth, commonly cited from the
 * approximate mass and composition of the planet. Order of magnitude
 * only; used for scale comparison, not precision.
 *
 * Source: frequently reproduced estimate (~1.3 × 10^50), e.g.
 * https://education.jlab.org/qa/mathatom_05.html
 */
export const ATOMS_ON_EARTH =
  130_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000_000n

const DECK_COUNT = factorial(52)

export interface MagnitudeComparison {
  readonly decks: bigint
  readonly atoms: bigint
  /** decks / atoms, rounded down. */
  readonly timesLarger: bigint
}

/**
 * Compare the number of 52-card orderings to the estimated number of
 * atoms on Earth, using exact integer arithmetic.
 */
export function compareDeckCountToAtomsOnEarth(): MagnitudeComparison {
  return {
    decks: DECK_COUNT,
    atoms: ATOMS_ON_EARTH,
    timesLarger: DECK_COUNT / ATOMS_ON_EARTH,
  }
}
