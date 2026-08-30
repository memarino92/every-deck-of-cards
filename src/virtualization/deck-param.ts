import {
  FIRST_DECK_NUMBER,
  publicDeckNumberToIndex,
} from '../domain/deck-number.ts'

/**
 * Thousands separators accepted in pasted input: every deck number the site
 * displays is grouped (comma via `toLocaleString('en-US')`), and visitors
 * paste those strings back into the jump box. Also covers the other common
 * grouping characters: space and narrow no-break space (French locale),
 * underscore, and apostrophe (Swiss convention). The period is deliberately
 * excluded: it is a decimal point to most visitors, so `1.5` must stay
 * malformed rather than silently becoming fifteen.
 */
const GROUPING_SEPARATORS = /[,\s_'’  ]/g

/**
 * Parse an untrusted deck-number URL parameter into a zero-based permutation
 * index. Grouping separators are stripped first. Absent, malformed,
 * non-numeric, or out-of-range input falls back to the first deck rather
 * than throwing, so a bad link still opens the explorer.
 */
export function parseDeckNumberParam(raw: string | undefined): bigint {
  const digits = raw?.replaceAll(GROUPING_SEPARATORS, '')

  if (digits === undefined || !/^[0-9]+$/.test(digits)) {
    return publicDeckNumberToIndex(FIRST_DECK_NUMBER)
  }

  try {
    return publicDeckNumberToIndex(BigInt(digits))
  } catch {
    return publicDeckNumberToIndex(FIRST_DECK_NUMBER)
  }
}
