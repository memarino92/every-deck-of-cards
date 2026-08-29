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

const geometry = createWindowGeometry(101, 20)

describe('window geometry', () => {
  it('rejects non-positive and non-integer dimensions', () => {
    expect(() => createWindowGeometry(0, 10)).toThrow(RangeError)
    expect(() => createWindowGeometry(101, 0)).toThrow(RangeError)
    expect(() => createWindowGeometry(100.5, 10)).toThrow(RangeError)
    expect(() => createWindowGeometry(101, 10.5)).toThrow(RangeError)
  })

  it('rejects overscan that swallows the window', () => {
    expect(() => createWindowGeometry(40, 20)).toThrow(RangeError)
    expect(() => createWindowGeometry(41, 21)).toThrow(RangeError)
  })
})

describe('anchor clamping', () => {
  it('clamps a negative desired anchor to zero', () => {
    expect(clampAnchor(-5n, geometry)).toBe(0n)
  })

  it('clamps an anchor past the end so the window ends at the last deck', () => {
    const maxAnchor = LAST_INDEX - BigInt(geometry.physicalRowCount - 1)

    expect(clampAnchor(LAST_INDEX, geometry)).toBe(maxAnchor)
    expect(clampAnchor(DECK_COUNT, geometry)).toBe(maxAnchor)
  })

  it('leaves an in-range anchor unchanged', () => {
    expect(clampAnchor(1_000_000n, geometry)).toBe(1_000_000n)
  })

  it('rejects a non-bigint anchor', () => {
    expect(() => clampAnchor(5 as unknown as bigint, geometry)).toThrow(
      RangeError,
    )
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

  it('keeps the anchor while the viewport stays within overscan of center', () => {
    // Center of a 101-row window is scroll row 50. Overscan 20 means no
    // recenter while the viewport top is within [30, 70].
    expect(recenteredAnchor(anchor, 50, geometry)).toBe(anchor)
    expect(recenteredAnchor(anchor, 60, geometry)).toBe(anchor)
    expect(recenteredAnchor(anchor, 40, geometry)).toBe(anchor)
  })

  it('recenters when the viewport drifts past overscan', () => {
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
    const clamped = clampAnchor(-1n, geometry)
    expect(clamped).toBe(0n)
  })

  it('clamps recentering at the end of the space', () => {
    const result = recenteredAnchor(LAST_INDEX, 90, geometry)
    const maxAnchor = LAST_INDEX - BigInt(geometry.physicalRowCount - 1)

    expect(result).toBe(maxAnchor)
  })

  it('rejects an invalid scroll row', () => {
    expect(() => recenteredAnchor(anchor, -1, geometry)).toThrow(RangeError)
    expect(() => recenteredAnchor(anchor, Number.NaN, geometry)).toThrow(
      RangeError,
    )
  })
})
