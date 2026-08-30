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
  /**
   * Total rows kept in the DOM. Larger than the visible area so there is
   * margin to scroll into before the window recenters, but small enough to
   * bound DOM weight (each row renders 52 cards).
   */
  readonly physicalRowCount: number
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }
}

export function createWindowGeometry(physicalRowCount: number): WindowGeometry {
  assertPositiveInteger(physicalRowCount, 'Physical row count')

  return Object.freeze({ physicalRowCount })
}

function assertIndex(index: bigint): void {
  if (typeof index !== 'bigint' || index < 0n || index > LAST_INDEX) {
    throw new RangeError(`Index must be from 0 through ${LAST_INDEX}`)
  }
}

/**
 * Clamp a desired anchor into the valid deck range `0..LAST_INDEX`. The
 * anchor names a logical deck (the one the viewport is centered on), so it is
 * allowed to reach the very last deck; keeping the window on-screen is
 * `windowStart`'s job, not the anchor's.
 */
export function clampAnchor(desired: bigint): bigint {
  if (typeof desired !== 'bigint') {
    throw new RangeError('Anchor must be a bigint')
  }

  const lowerBounded = desired < 0n ? 0n : desired

  return lowerBounded > LAST_INDEX ? LAST_INDEX : lowerBounded
}

/**
 * The logical index of the first row of the physical window, given an anchor.
 * The window normally starts half a window before the anchor so the anchor
 * sits centered with scroll margin on both sides. Both ends pin the window to
 * the boundary instead of over-shooting it: at the start the window clamps to
 * row 0 (anchor rides partway in), and at the end the window clamps to
 * `maxStart`
 * so the final window covers exactly the last `physicalRowCount` decks. The
 * end clamp is what makes the last deck reachable — without it the window
 * would stop half a window short of the boundary.
 */
export function windowStart(anchor: bigint, geometry: WindowGeometry): bigint {
  assertIndex(anchor)

  const halfWindow = BigInt(Math.floor(geometry.physicalRowCount / 2))
  const windowSpan = BigInt(geometry.physicalRowCount - 1)
  const maxStart = LAST_INDEX - windowSpan

  // Center the window on the anchor, then clamp into [0, maxStart]. The lower
  // clamp pins the first window to row 0; the upper clamp pins the final
  // window so its last row is exactly the last deck, making the end of the
  // space reachable.
  const desired = anchor - halfWindow

  if (desired < 0n) {
    return 0n
  }

  return desired > maxStart ? maxStart : desired
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
 * window coordinates (scrollTop / rowHeight). The anchor follows the logical
 * row under the viewport's center on every scroll event, so the window always
 * tracks the viewport instead of lagging behind a deadband.
 *
 * A deadband (only recentering once the viewport drifts far enough from the
 * window center) was tried and rejected: near the content boundary the
 * browser clamps `scrollTop`, which wraps `scrollRow` back toward the window
 * center
 * before the drift can exceed the deadband. The window then re-anchors by
 * only a few rows per scroll gesture and the explorer crawls toward — but
 * never reaches — the end of the space. Recentering every event keeps the
 * window glued to the viewport; `windowStart`'s boundary clamps keep the
 * final window pinned so the last deck is reachable.
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

  const viewportCenterOffset = geometry.physicalRowCount / 4
  const rowAtViewportCenter = Math.round(scrollRow + viewportCenterOffset)
  const start = windowStart(anchor, geometry)
  const desired = start + BigInt(rowAtViewportCenter)

  return clampAnchor(desired)
}
