import { DECK_COUNT } from '../domain/deck-number.ts'

/**
 * Pure virtual-position math for the explorer (decision 0009).
 *
 * The browser cannot create a scroll region of `DECK_COUNT` rows, and a
 * recentering window cannot offer an end-to-end scrollbar. Instead the
 * explorer holds its scroll position as application state: a `FeedPosition`
 * naming the deck at the viewport's top edge plus a sub-row pixel offset.
 * Wheel, keyboard, touch-drag, and scrollbar-rail input all advance this
 * position directly — the position never waits on the worker, so input can
 * never hit a data wall. Only the card faces load asynchronously; deck
 * numbers always render synchronously from the position.
 *
 * All cross-space arithmetic is `bigint`; JavaScript `number` is used only
 * for pixel offsets and row counts within a single viewport, both far below
 * `Number.MAX_SAFE_INTEGER`.
 */

export const LAST_INDEX = DECK_COUNT - 1n

/** The deck at the viewport's top edge, plus sub-row scroll within it. */
export interface FeedPosition {
  /** Zero-based permutation index of the deck under the top edge. */
  readonly topIndex: bigint
  /** Pixels the top row is scrolled up out of view; `0 <= offsetPx < rowHeight`. */
  readonly offsetPx: number
}

export function createPosition(topIndex: bigint, offsetPx = 0): FeedPosition {
  assertIndex(topIndex)

  if (!Number.isFinite(offsetPx) || offsetPx < 0) {
    throw new RangeError('Offset must be a non-negative finite number')
  }

  return Object.freeze({ topIndex, offsetPx })
}

function assertIndex(index: bigint): void {
  if (typeof index !== 'bigint' || index < 0n || index > LAST_INDEX) {
    throw new RangeError(`Index must be from 0 through ${LAST_INDEX}`)
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

function assertViewport(viewportHeightPx: number, rowHeightPx: number): void {
  if (!Number.isFinite(viewportHeightPx) || viewportHeightPx < 0) {
    throw new RangeError('Viewport height must be a non-negative finite number')
  }
  if (!Number.isFinite(rowHeightPx) || rowHeightPx <= 0) {
    throw new RangeError('Row height must be a positive finite number')
  }
}

/** Rows at least partially visible in a viewport; always at least one. */
export function visibleRowCount(
  viewportHeightPx: number,
  rowHeightPx: number,
): number {
  assertViewport(viewportHeightPx, rowHeightPx)

  return Math.max(1, Math.ceil(viewportHeightPx / rowHeightPx))
}

/**
 * The largest top-edge index: the position where the last deck is the bottom
 * visible row. Scrolling further would show void past the end of the space.
 */
export function maxTopIndex(visibleRows: number): bigint {
  assertPositiveInteger(visibleRows, 'Visible row count')

  const maxTop = LAST_INDEX - BigInt(visibleRows) + 1n

  return maxTop < 0n ? 0n : maxTop
}

/**
 * Clamp a position into the scrollable range. At the end of the space the
 * last deck pins to the bottom row, so the offset is zeroed at `maxTopIndex`.
 */
export function clampPosition(
  position: FeedPosition,
  visibleRows: number,
): FeedPosition {
  const maxTop = maxTopIndex(visibleRows)

  if (position.topIndex >= maxTop) {
    return createPosition(maxTop, 0)
  }

  return position
}

/**
 * Advance the position by a pixel delta (positive = scroll down). Whole rows
 * move `topIndex`; the remainder stays as the sub-row offset, so smooth
 * trackpad and wheel input is lossless. Both ends of the space pin: scrolling
 * up past deck 1 lands on `{0, 0}`; scrolling down pins the last deck to the
 * bottom row with zero offset.
 */
export function advancePosition(
  position: FeedPosition,
  deltaPx: number,
  rowHeightPx: number,
  visibleRows: number,
): FeedPosition {
  if (!Number.isFinite(deltaPx)) {
    throw new RangeError('Delta must be a finite number')
  }
  if (!Number.isFinite(rowHeightPx) || rowHeightPx <= 0) {
    throw new RangeError('Row height must be a positive finite number')
  }

  const totalPx = position.offsetPx + deltaPx
  const rowDelta = Math.floor(totalPx / rowHeightPx)
  const offsetPx = totalPx - rowDelta * rowHeightPx
  const top = position.topIndex + BigInt(rowDelta)
  const maxTop = maxTopIndex(visibleRows)

  if (top < 0n) {
    return createPosition(0n, 0)
  }

  if (top >= maxTop) {
    return createPosition(maxTop, 0)
  }

  return createPosition(top, offsetPx)
}

/**
 * Scale for fraction mapping. A float fraction cannot name a specific deck
 * (decision 0007's argument stands for _addressing_); the rail uses percent
 * of space only as _input_, resolving to an exact integer position. 1e9
 * granularity far exceeds any rail's pixel resolution.
 */
const FRACTION_SCALE = 1_000_000_000n

/** Map a fraction of the space (0 = first deck, 1 = end) to a position. */
export function positionAtFraction(
  fraction: number,
  visibleRows: number,
): FeedPosition {
  if (!Number.isFinite(fraction)) {
    throw new RangeError('Fraction must be a finite number')
  }

  const clamped = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction
  const maxTop = maxTopIndex(visibleRows)
  const scaled = BigInt(Math.round(clamped * Number(FRACTION_SCALE)))

  return createPosition((maxTop * scaled) / FRACTION_SCALE, 0)
}

/** Map a position back to a fraction of the space, for the rail thumb. */
export function fractionAtPosition(
  position: FeedPosition,
  visibleRows: number,
): number {
  const maxTop = maxTopIndex(visibleRows)

  if (maxTop === 0n) {
    return 0
  }

  // A position past the end clamp (e.g. before the viewport is measured)
  // still maps onto the rail.
  const top = position.topIndex > maxTop ? maxTop : position.topIndex
  const scaled = (top * FRACTION_SCALE) / maxTop

  return Number(scaled) / Number(FRACTION_SCALE)
}

/** Classic ease-in-out cubic; pure so animation timing is testable. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * Interpolate between two positions at eased progress `t` in [0, 1]. Exact
 * at the ends (`t <= 0` returns `from`, `t >= 1` returns `to`) so animated
 * navigation always lands exactly on the requested deck.
 *
 * Two regimes: spans that fit in a `number` interpolate in pixels, giving
 * smooth sub-row motion for short jumps; astronomical spans interpolate the
 * `bigint` index at 1e9 granularity, where sub-row pixels are meaningless.
 */
export function interpolatePosition(
  from: FeedPosition,
  to: FeedPosition,
  t: number,
  rowHeightPx: number,
  visibleRows: number,
): FeedPosition {
  if (!Number.isFinite(t)) {
    throw new RangeError('Progress must be a finite number')
  }
  if (t <= 0) {
    return from
  }
  if (t >= 1) {
    return to
  }

  const span = to.topIndex - from.topIndex
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)

  if (span < maxSafe && span > -maxSafe) {
    const spanPx = Number(span) * rowHeightPx + (to.offsetPx - from.offsetPx)

    return advancePosition(from, spanPx * t, rowHeightPx, visibleRows)
  }

  // Astronomical span: interpolate the index at fixed granularity and clamp
  // before constructing, since a rounded step can overshoot either boundary.
  const scaled =
    (span * BigInt(Math.round(t * Number(FRACTION_SCALE)))) / FRACTION_SCALE
  const raw = from.topIndex + scaled
  const maxTop = maxTopIndex(visibleRows)
  const clampedTop = raw < 0n ? 0n : raw > maxTop ? maxTop : raw

  return createPosition(clampedTop, 0)
}

/** The rows to render: the visible span plus overscan on both sides. */
export interface StripRange {
  /** Index of the first rendered row. */
  readonly start: bigint
  /** Rendered row count; small enough for safe `number` arithmetic. */
  readonly count: number
  /** Pixels to translate the strip up so `topIndex` sits at the top edge. */
  readonly shiftPx: number
}

export function stripRange(
  position: FeedPosition,
  viewportHeightPx: number,
  rowHeightPx: number,
  overscanRows: number,
): StripRange {
  assertViewport(viewportHeightPx, rowHeightPx)
  if (!Number.isSafeInteger(overscanRows) || overscanRows < 0) {
    throw new RangeError('Overscan must be a non-negative safe integer')
  }

  const visible = visibleRowCount(viewportHeightPx, rowHeightPx)
  const start =
    position.topIndex > BigInt(overscanRows)
      ? position.topIndex - BigInt(overscanRows)
      : 0n
  const lastVisible = position.topIndex + BigInt(visible - 1)
  const end = lastVisible > LAST_INDEX ? LAST_INDEX : lastVisible
  const lastRendered = end + BigInt(overscanRows)
  const last = lastRendered > LAST_INDEX ? LAST_INDEX : lastRendered

  return Object.freeze({
    start,
    count: Number(last - start) + 1,
    shiftPx:
      Number(position.topIndex - start) * rowHeightPx + position.offsetPx,
  })
}
