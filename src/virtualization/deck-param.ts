import {
  FIRST_DECK_NUMBER,
  publicDeckNumberToIndex,
} from '../domain/deck-number.ts'

/**
 * Parse an untrusted deck-number URL parameter into a zero-based permutation
 * index. Absent, malformed, non-numeric, or out-of-range input falls back to
 * the first deck rather than throwing, so a bad link still opens the explorer.
 */
export function parseDeckNumberParam(raw: string | undefined): bigint {
  if (raw === undefined || !/^[0-9]+$/.test(raw)) {
    return publicDeckNumberToIndex(FIRST_DECK_NUMBER)
  }

  try {
    return publicDeckNumberToIndex(BigInt(raw))
  } catch {
    return publicDeckNumberToIndex(FIRST_DECK_NUMBER)
  }
}
