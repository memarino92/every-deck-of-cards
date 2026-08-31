import { describe, expect, it } from 'vite-plus/test'

import { DECK_COUNT } from '../domain/deck-number.ts'
import {
  advancePosition,
  clampPosition,
  createPosition,
  easeInOutCubic,
  fractionAtPosition,
  interpolatePosition,
  LAST_INDEX,
  maxTopIndex,
  positionAtFraction,
  stripRange,
  visibleRowCount,
} from './position.ts'

const ROW = 148
/** A 800px viewport shows ceil(800/148) = 6 rows. */
const VIEWPORT = 800
const VISIBLE = 6
const MAX_TOP = LAST_INDEX - BigInt(VISIBLE) + 1n

describe('createPosition', () => {
  it('accepts a valid position', () => {
    expect(createPosition(1000n, 40, ROW)).toEqual({
      topIndex: 1000n,
      offsetPx: 40,
    })
  })

  it('rejects out-of-range indices and bad offsets', () => {
    expect(() => createPosition(-1n)).toThrow(RangeError)
    expect(() => createPosition(DECK_COUNT)).toThrow(RangeError)
    expect(() => createPosition(0 as unknown as bigint)).toThrow(RangeError)
    expect(() => createPosition(0n, -1)).toThrow(RangeError)
    expect(() => createPosition(0n, Number.NaN)).toThrow(RangeError)
    expect(() => createPosition(0n, ROW, ROW)).toThrow(RangeError)
    expect(() => createPosition(0n, 1)).toThrow(RangeError)
  })
})

describe('visibleRowCount', () => {
  it('counts partially visible rows', () => {
    expect(visibleRowCount(VIEWPORT, ROW)).toBe(VISIBLE)
    expect(visibleRowCount(2 * ROW, ROW)).toBe(2)
  })

  it('always shows at least one row, even at zero viewport height', () => {
    expect(visibleRowCount(0, ROW)).toBe(1)
  })
})

describe('maxTopIndex', () => {
  it('pins the last deck as the bottom visible row', () => {
    expect(maxTopIndex(VISIBLE)).toBe(MAX_TOP)
    // From the max top, exactly `visible` rows remain.
    expect(LAST_INDEX - maxTopIndex(VISIBLE)).toBe(BigInt(VISIBLE) - 1n)
  })

  it('clamps to zero when the viewport covers the whole space', () => {
    expect(maxTopIndex(1)).toBe(LAST_INDEX)
  })
})

describe('clampPosition', () => {
  it('leaves mid-space positions untouched', () => {
    const position = createPosition(1000n, 40, ROW)
    expect(clampPosition(position, VISIBLE)).toEqual(position)
  })

  it('pins past-the-end positions to the last full viewport', () => {
    expect(clampPosition(createPosition(LAST_INDEX, 0), VISIBLE)).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 0,
    })
  })

  it('uses a sub-row end offset to align the last row to the bottom', () => {
    expect(
      clampPosition(createPosition(LAST_INDEX, 0), VISIBLE, 40, ROW),
    ).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 40,
    })
  })

  it('aligns the last deck in a viewport shorter than one row', () => {
    expect(clampPosition(createPosition(LAST_INDEX, 0), 1, 40, ROW)).toEqual({
      topIndex: LAST_INDEX,
      offsetPx: 40,
    })
  })
})

describe('advancePosition', () => {
  it('moves whole rows on large deltas', () => {
    expect(
      advancePosition(createPosition(100n, 0), 2 * ROW, ROW, VISIBLE),
    ).toEqual({
      topIndex: 102n,
      offsetPx: 0,
    })
  })

  it('keeps sub-row deltas as the offset', () => {
    expect(advancePosition(createPosition(100n, 0), 50, ROW, VISIBLE)).toEqual({
      topIndex: 100n,
      offsetPx: 50,
    })
  })

  it('carries a full row out of a combined offset', () => {
    expect(
      advancePosition(createPosition(100n, 100, ROW), 100, ROW, VISIBLE),
    ).toEqual({
      topIndex: 101n,
      offsetPx: 52,
    })
  })

  it('borrows a row when scrolling up past the row boundary', () => {
    expect(
      advancePosition(createPosition(100n, 30, ROW), -50, ROW, VISIBLE),
    ).toEqual({
      topIndex: 99n,
      offsetPx: ROW - 20,
    })
  })

  it('keeps sub-row offset when scrolling within the first row', () => {
    // Regression: scrolling down inside deck 1 must not lose the offset.
    expect(
      advancePosition(createPosition(0n, 30, ROW), 50, ROW, VISIBLE),
    ).toEqual({ topIndex: 0n, offsetPx: 80 })
    expect(
      advancePosition(createPosition(0n, 30, ROW), -10, ROW, VISIBLE),
    ).toEqual({ topIndex: 0n, offsetPx: 20 })
  })

  it('pins the start of the space at exactly {0, 0}', () => {
    expect(
      advancePosition(createPosition(0n, 30, ROW), -50, ROW, VISIBLE),
    ).toEqual({ topIndex: 0n, offsetPx: 0 })
    expect(advancePosition(createPosition(0n, 0), -10, ROW, VISIBLE)).toEqual({
      topIndex: 0n,
      offsetPx: 0,
    })
  })

  it('pins the end of the space with the last deck at the bottom', () => {
    expect(
      advancePosition(createPosition(MAX_TOP, 0), 500, ROW, VISIBLE),
    ).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 0,
    })
  })

  it('pins the end exactly when a delta would land past it', () => {
    // One row short of the end plus a sub-row offset; scrolling down must
    // pin to {maxTop, 0}, not stop at a dangling offset.
    expect(
      advancePosition(
        createPosition(MAX_TOP - 1n, 100, ROW),
        100,
        ROW,
        VISIBLE,
      ),
    ).toEqual({ topIndex: MAX_TOP, offsetPx: 0 })
  })

  it('can move upward from a sub-row end offset', () => {
    expect(
      advancePosition(createPosition(MAX_TOP, 40, ROW), -10, ROW, VISIBLE, 40),
    ).toEqual({ topIndex: MAX_TOP, offsetPx: 30 })
  })

  it('rejects non-finite deltas and bad row heights', () => {
    expect(() =>
      advancePosition(createPosition(0n, 0), Number.NaN, ROW, VISIBLE),
    ).toThrow(RangeError)
    expect(() =>
      advancePosition(createPosition(0n, 0), 10, 0, VISIBLE),
    ).toThrow(RangeError)
  })
})

describe('rail fraction mapping', () => {
  it('maps fraction 0 to the first deck and 1 to the end', () => {
    expect(positionAtFraction(0, VISIBLE)).toEqual({
      topIndex: 0n,
      offsetPx: 0,
    })
    expect(positionAtFraction(1, VISIBLE)).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 0,
    })
  })

  it('maps fraction 1 to an exact sub-row end offset', () => {
    expect(positionAtFraction(1, VISIBLE, 40, ROW)).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 40,
    })
  })

  it('resolves fractions to exact integer positions', () => {
    const position = positionAtFraction(0.5, VISIBLE)

    expect(typeof position.topIndex).toBe('bigint')
    // Within rounding granularity of half the space.
    const half = MAX_TOP / 2n
    const drift =
      position.topIndex > half
        ? position.topIndex - half
        : half - position.topIndex
    expect(drift).toBeLessThan(10n)
  })

  it('clamps out-of-range fractions', () => {
    expect(positionAtFraction(-0.2, VISIBLE)).toEqual({
      topIndex: 0n,
      offsetPx: 0,
    })
    expect(positionAtFraction(1.2, VISIBLE)).toEqual({
      topIndex: MAX_TOP,
      offsetPx: 0,
    })
    expect(() => positionAtFraction(Number.NaN, VISIBLE)).toThrow(RangeError)
  })

  it('maps positions back to fractions for the thumb', () => {
    expect(fractionAtPosition(createPosition(0n, 0), VISIBLE)).toBe(0)
    expect(fractionAtPosition(createPosition(MAX_TOP, 0), VISIBLE)).toBe(1)
    expect(
      fractionAtPosition(createPosition(MAX_TOP / 2n, 0), VISIBLE),
    ).toBeCloseTo(0.5, 6)
  })

  it('quantizes the final sub-row interval to the rail endpoint', () => {
    expect(fractionAtPosition(createPosition(MAX_TOP, 40, ROW), VISIBLE)).toBe(
      1,
    )
  })

  it('round-trips a dragged fraction to the same stop', () => {
    const fraction = 0.25
    const roundTripped = fractionAtPosition(
      positionAtFraction(fraction, VISIBLE),
      VISIBLE,
    )

    expect(roundTripped).toBeCloseTo(fraction, 6)
  })

  it('maps an unclamped past-the-end position onto the rail', () => {
    // Before the viewport is measured, the position may exceed maxTop; the
    // thumb must still render at the end, not past it.
    expect(fractionAtPosition(createPosition(LAST_INDEX, 0), VISIBLE)).toBe(1)
  })
})

describe('easeInOutCubic', () => {
  it('hits the endpoints and midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBe(0.5)
    expect(easeInOutCubic(1)).toBe(1)
  })

  it('eases in slower than linear', () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25)
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75)
  })
})

describe('interpolatePosition', () => {
  it('returns the exact endpoints at t = 0 and t = 1', () => {
    const from = createPosition(1000n, 20, ROW)
    const to = createPosition(MAX_TOP, 0)

    expect(interpolatePosition(from, to, 0, ROW, VISIBLE)).toEqual(from)
    expect(interpolatePosition(from, to, 1, ROW, VISIBLE)).toEqual(to)
  })

  it('interpolates small spans row by row', () => {
    const from = createPosition(1000n, 0)
    const to = createPosition(1010n, 0)

    expect(interpolatePosition(from, to, 0.5, ROW, VISIBLE)).toEqual({
      topIndex: 1005n,
      offsetPx: 0,
    })
  })

  it('interpolates sub-row motion for single-row jumps', () => {
    const from = createPosition(1000n, 0)
    const to = createPosition(1001n, 0)

    expect(interpolatePosition(from, to, 0.5, ROW, VISIBLE)).toEqual({
      topIndex: 1000n,
      offsetPx: ROW / 2,
    })
  })

  it('interpolates astronomical spans without losing the endpoints', () => {
    const from = createPosition(0n, 0)
    const to = createPosition(MAX_TOP, 0)
    const midway = interpolatePosition(from, to, 0.5, ROW, VISIBLE)

    // Somewhere near half the space, and monotonic per quarter.
    const quarter = interpolatePosition(from, to, 0.25, ROW, VISIBLE)
    const threeQuarter = interpolatePosition(from, to, 0.75, ROW, VISIBLE)
    expect(quarter.topIndex).toBeLessThan(midway.topIndex)
    expect(midway.topIndex).toBeLessThan(threeQuarter.topIndex)
    expect(threeQuarter.topIndex).toBeLessThan(MAX_TOP)
  })

  it('handles astronomical spans in reverse without overshooting', () => {
    const from = createPosition(MAX_TOP, 0)
    const to = createPosition(0n, 0)
    const midway = interpolatePosition(from, to, 0.5, ROW, VISIBLE)

    expect(midway.topIndex).toBeGreaterThan(0n)
    expect(midway.topIndex).toBeLessThan(MAX_TOP)
    expect(interpolatePosition(from, to, 1, ROW, VISIBLE)).toEqual(to)
  })

  it('rejects non-finite progress', () => {
    expect(() =>
      interpolatePosition(
        createPosition(0n, 0),
        createPosition(1n, 0),
        Number.NaN,
        ROW,
        VISIBLE,
      ),
    ).toThrow(RangeError)
  })

  it('keeps pixel interpolation inside the safe-number boundary', () => {
    const safeRows = BigInt(Math.floor(Number.MAX_SAFE_INTEGER / ROW))
    const from = createPosition(0n, 0)
    const to = createPosition(safeRows, 0)
    const midway = interpolatePosition(from, to, 0.5, ROW, VISIBLE)

    expect(midway.topIndex).toBe(safeRows / 2n)
  })
})

describe('stripRange', () => {
  it('renders the visible span plus overscan on both sides', () => {
    const strip = stripRange(createPosition(1000n, 40, ROW), VIEWPORT, ROW, 8)

    expect(strip.start).toBe(992n)
    expect(strip.count).toBe(8 + VISIBLE + 8)
    expect(strip.shiftPx).toBe(8 * ROW + 40)
  })

  it('clips overscan at the start of the space', () => {
    const strip = stripRange(createPosition(2n, 10, ROW), VIEWPORT, ROW, 8)

    expect(strip.start).toBe(0n)
    expect(strip.shiftPx).toBe(2 * ROW + 10)
    expect(strip.count).toBe(2 + VISIBLE + 8)
  })

  it('clips overscan at the end of the space', () => {
    const strip = stripRange(createPosition(MAX_TOP, 0), VIEWPORT, ROW, 8)

    // The last rendered row is exactly the last deck.
    expect(strip.start).toBe(MAX_TOP - 8n)
    expect(strip.start + BigInt(strip.count) - 1n).toBe(LAST_INDEX)
    expect(strip.shiftPx).toBe(8 * ROW)
  })

  it('includes the bottom partial row introduced by a sub-row offset', () => {
    const position = advancePosition(createPosition(1000n, 0), 1, ROW, VISIBLE)
    const strip = stripRange(position, 2 * ROW, ROW, 0)

    expect(strip.start).toBe(1000n)
    expect(strip.count).toBe(3)
  })

  it('rejects bad geometry', () => {
    expect(() => stripRange(createPosition(0n, 0), -1, ROW, 8)).toThrow(
      RangeError,
    )
    expect(() => stripRange(createPosition(0n, 0), VIEWPORT, 0, 8)).toThrow(
      RangeError,
    )
    expect(() => stripRange(createPosition(0n, 0), VIEWPORT, ROW, -1)).toThrow(
      RangeError,
    )
  })
})
