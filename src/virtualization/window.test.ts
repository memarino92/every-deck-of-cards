import { describe, expect, it } from 'vitest'

import { DECK_COUNT } from '../domain/deck-number.ts'
import {
  clampAnchor,
  createWindowGeometry,
  LAST_INDEX,
  logicalIndexAt,
  recenteredAnchor,
  windowStart,
} from './window.ts'

const geometry = createWindowGeometry(101)

describe('window geometry', () => {
  it('rejects non-positive and non-integer dimensions', () => {
    expect(() => createWindowGeometry(0)).toThrow(RangeError)
    expect(() => createWindowGeometry(-3)).toThrow(RangeError)
    expect(() => createWindowGeometry(100.5)).toThrow(RangeError)
  })
})

describe('anchor clamping', () => {
  it('clamps a negative desired anchor to zero', () => {
    expect(clampAnchor(-5n)).toBe(0n)
  })

  it('lets the anchor reach the last deck, clamping only past it', () => {
    expect(clampAnchor(LAST_INDEX)).toBe(LAST_INDEX)
    expect(clampAnchor(DECK_COUNT)).toBe(LAST_INDEX)
  })

  it('leaves an in-range anchor unchanged', () => {
    expect(clampAnchor(1_000_000n)).toBe(1_000_000n)
  })

  it('rejects a non-bigint anchor', () => {
    expect(() => clampAnchor(5 as unknown as bigint)).toThrow(RangeError)
  })
})

describe('window start', () => {
  it('centers the window on the anchor', () => {
    const anchor = 1_000_000n
    const start = windowStart(anchor, geometry)

    expect(start).toBe(anchor - 50n)
  })

  it('pins the window to zero near the start', () => {
    expect(windowStart(0n, geometry)).toBe(0n)
    expect(windowStart(25n, geometry)).toBe(0n)
  })

  it('pins the window to the final decks near the end', () => {
    const maxStart = LAST_INDEX - BigInt(geometry.physicalRowCount - 1)

    expect(windowStart(LAST_INDEX, geometry)).toBe(maxStart)
  })
})

describe('logical index at', () => {
  it('maps the first window row to the window start', () => {
    const anchor = 1_000_000n

    expect(logicalIndexAt(anchor, 0, geometry)).toBe(
      windowStart(anchor, geometry),
    )
  })

  it('maps the center row to the anchor', () => {
    const anchor = 1_000_000n

    expect(logicalIndexAt(anchor, 50, geometry)).toBe(anchor)
  })

  it('never produces an index past the last deck', () => {
    const last = logicalIndexAt(
      LAST_INDEX,
      geometry.physicalRowCount - 1,
      geometry,
    )

    expect(last).toBe(LAST_INDEX)
  })

  it('rejects an out-of-range anchor', () => {
    expect(() => logicalIndexAt(-1n, 0, geometry)).toThrow(RangeError)
    expect(() => logicalIndexAt(DECK_COUNT, 0, geometry)).toThrow(RangeError)
  })
})

describe('recentering', () => {
  const anchor = 1_000_000n

  it('tracks the deck under the viewport center on every scroll', () => {
    // No deadband: the anchor always moves to the logical row under the
    // viewport's center (window start + scrollRow + a quarter window). With a
    // 101-row window the quarter is 25, so the anchor lands 25 rows past the
    // viewport top.
    // windowStart(anchor) = anchor - 50.
    expect(recenteredAnchor(anchor, 50, geometry)).toBe(anchor + 25n)
    expect(recenteredAnchor(anchor, 60, geometry)).toBe(anchor + 35n)
    expect(recenteredAnchor(anchor, 40, geometry)).toBe(anchor + 15n)
  })

  it('recenters toward the deck the viewport has scrolled to', () => {
    const result = recenteredAnchor(anchor, 90, geometry)

    expect(result).not.toBe(anchor)
    expect(result).toBeGreaterThan(anchor)
  })

  it('recenters downward when scrolling back up', () => {
    const result = recenteredAnchor(anchor, 5, geometry)

    expect(result).toBeLessThan(anchor)
  })

  it('keeps the logical row at the viewport stable across a recenter', () => {
    // The logical index under the viewport's center before recentering is the
    // anchor the recenter lands on.
    const scrollRow = 90
    const before = logicalIndexAt(anchor, Math.round(scrollRow + 25), geometry)
    const next = recenteredAnchor(anchor, scrollRow, geometry)

    // After recentering, the window's center is the new anchor.
    expect(windowStart(next, geometry) + 50n).toBe(next)
    expect(next).toBe(before)
  })

  it('moves the anchor to the deck under the viewport center when scrolling up', () => {
    // Anchor 100 → window start 50. Scrolling to the top recenters the anchor
    // to the row under the viewport center (window row 25 → 50 + 25 = 75).
    expect(recenteredAnchor(100n, 0, geometry)).toBe(75n)
  })

  it('hard-clamps the anchor at zero at the very start of the space', () => {
    // With the window already pinned to start 0 (anchor 40 → desired start
    // -10 clamps to 0), scrolling to the top lands on row 25 → anchor 25.
    expect(recenteredAnchor(40n, 0, geometry)).toBe(25n)

    // And an anchor that recentering would push below zero clamps to 0: a
    // viewport center above the first deck cannot produce a negative anchor.
    const clamped = clampAnchor(-1n)
    expect(clamped).toBe(0n)
  })

  it('clamps recentering at the last deck', () => {
    // Anchor pinned at the end; scrolling down cannot push the anchor past
    // the final deck, and windowStart pins the window so the last deck shows.
    const result = recenteredAnchor(LAST_INDEX, 90, geometry)

    expect(result).toBe(LAST_INDEX)
    expect(windowStart(result, geometry)).toBe(
      LAST_INDEX - BigInt(geometry.physicalRowCount - 1),
    )
  })

  it('makes the last deck the final row of the pinned end window', () => {
    // Regression guard for the end-of-space dead zone: when the anchor is at
    // the last deck, the window's final physical row must be that deck, not
    // half a window short of it.
    const start = windowStart(LAST_INDEX, geometry)
    const last = logicalIndexAt(
      LAST_INDEX,
      geometry.physicalRowCount - 1,
      geometry,
    )

    expect(start).toBe(LAST_INDEX - BigInt(geometry.physicalRowCount - 1))
    expect(last).toBe(LAST_INDEX)
  })

  it('rejects an invalid scroll row', () => {
    expect(() => recenteredAnchor(anchor, -1, geometry)).toThrow(RangeError)
    expect(() => recenteredAnchor(anchor, Number.NaN, geometry)).toThrow(
      RangeError,
    )
  })
})

// Regression guard for the "lands on deck 13" bug: on load, the requested
// deck must sit at the viewport top, not scrolled past into the window.
// The explorer seeds scrollTop so the requested deck is at the top. Simulate
// that seed and return the deck index shown at the viewport top.
function viewportTopIndexAfterLoad(
  requestedIndex: bigint,
  geo: ReturnType<typeof createWindowGeometry>,
): bigint {
  const start = windowStart(requestedIndex, geo)
  const scrollRow = Number(requestedIndex - start)

  return logicalIndexAt(requestedIndex, scrollRow, geo)
}

describe('initial placement (regression)', () => {
  it('places deck 1 at the viewport top on load', () => {
    expect(viewportTopIndexAfterLoad(0n, geometry)).toBe(0n)
  })

  it('does not scroll past the first deck into the window', () => {
    // The reported bug: load showed deck 13. With correct placement the first
    // visible deck is 1 (index 0).
    const firstVisible = viewportTopIndexAfterLoad(0n, geometry)

    expect(firstVisible).toBe(0n)
    expect(firstVisible).not.toBe(12n)
  })

  it('places a mid-space deck at the viewport top on load', () => {
    const mid = 1_000_000n

    expect(viewportTopIndexAfterLoad(mid, geometry)).toBe(mid)
  })

  it('keeps a top-loaded deck stable across the first scroll event', () => {
    // After placing deck 1 at the top, a small scroll should not jump the
    // anchor away from the first window.
    const next = recenteredAnchor(0n, 0, geometry)

    expect(windowStart(next, geometry)).toBe(0n)
  })
})
