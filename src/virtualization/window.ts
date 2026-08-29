import { DECK_COUNT } from '../domain/deck-number.ts'

/**
 * Pure virtualization math for the explorer.
 *
 * The browser cannot create a scroll region of `DECK_COUNT` rows, so the
 * explorer renders a bounded physical window of rows that is recentered
 * around a logical `bigint` anchor. The logical index of any rendered row is
 * `anchorIndex + physicalRowOffset`. All cross-window arithmetic is `bigint`;
 * JavaScript `number` is used only inside a single physical window, whose row
 * count is far below `Number.MAX_SAFE_INTEGER`.
 */

export const LAST_INDEX = DECK_COUNT - 1n

export interface WindowGeometry {
  /** Total rows kept in the DOM, including overscan. */
  readonly physicalRowCount: number
  /** Rows of overscan above and below the visible area. */
  readonly overscan: number
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

export function createWindowGeometry(
  physicalRowCount: number,
  overscan: number,
): WindowGeometry {
  assertPositiveInteger(physicalRowCount, 'Physical row count')
  assertPositiveInteger(overscan, 'Overscan')

  if (overscan * 2 >= physicalRowCount) {
    throw new RangeError(
      'Overscan must leave room for visible rows within the window',
    )
  }

  return Object.freeze({ physicalRowCount, overscan })
}

function assertIndex(index: bigint): void {
  if (typeof index !== 'bigint' || index < 0n || index > LAST_INDEX) {
    throw new RangeError(`Index must be from 0 through ${LAST_INDEX}`)
  }
}

/**
 * Clamp a desired anchor so the full physical window stays within
 * `0..LAST_INDEX`. Anchoring near the end pulls the anchor back so the
 * window's last row never passes the final deck.
 */
export function clampAnchor(desired: bigint, geometry: WindowGeometry): bigint {
  if (typeof desired !== 'bigint') {
    throw new RangeError('Anchor must be a bigint')
  }

  const windowSpan = BigInt(geometry.physicalRowCount - 1)
  const maxAnchor = LAST_INDEX - windowSpan
  const lowerBounded = desired < 0n ? 0n : desired

  return lowerBounded > maxAnchor ? maxAnchor : lowerBounded
}

/**
 * The logical index of the first row of the physical window, given an anchor.
 * The anchor is the logical index the window is centered on, so the window
 * starts half a window before it, clamped to the valid range.
 */
export function windowStart(anchor: bigint, geometry: WindowGeometry): bigint {
  assertIndex(anchor)

  const halfWindow = BigInt(Math.floor(geometry.physicalRowCount / 2))
  const desired = anchor - halfWindow

  return clampAnchor(desired, geometry)
}

/**
 * The logical deck index for a physical row position within the window.
 * `physicalOffset` is the row's index within the rendered window (0-based).
 */
export function logicalIndexAt(
  anchor: bigint,
  physicalOffset: number,
  geometry: WindowGeometry,
): bigint {
  assertIndex(anchor)
  assertPositiveInteger(physicalOffset + 1, 'Physical offset')

  const start = windowStart(anchor, geometry)
  const index = start + BigInt(physicalOffset)

  return index > LAST_INDEX ? LAST_INDEX : index
}

/**
 * Given the current scroll position within the physical window, decide
 * whether the window should recenter and, if so, the new anchor.
 *
 * `scrollRow` is the fractional row at the top of the viewport, expressed in
 * window coordinates (scrollTop / rowHeight). The window is `physicalRowCount`
 * rows tall, so its center row sits at `physicalRowCount / 2`. When the
 * viewport top drifts more than `overscan` rows from that center, the anchor
 * moves to the logical row now under the viewport's center; otherwise the
 * anchor is unchanged.
 *
 * The viewport's own height is not modeled: we treat the viewport's center as
 * sitting `physicalRowCount / 4` rows below its top, a stable midpoint for a
 * window that is roughly half visible. This keeps recentering symmetric in
 * both scroll directions.
 */
export function recenteredAnchor(
  anchor: bigint,
  scrollRow: number,
  geometry: WindowGeometry,
): bigint {
  assertIndex(anchor)

  if (!Number.isFinite(scrollRow) || scrollRow < 0) {
    throw new RangeError('Scroll row must be a non-negative finite number')
  }

  const center = geometry.physicalRowCount / 2
  const viewportCenterOffset = geometry.physicalRowCount / 4
  const drift = scrollRow - center

  if (Math.abs(drift) <= geometry.overscan) {
    return anchor
  }

  const rowAtViewportCenter = Math.round(scrollRow + viewportCenterOffset)
  const start = windowStart(anchor, geometry)
  const desired = start + BigInt(rowAtViewportCenter)

  return clampAnchor(desired, geometry)
}
