import {
  advancePosition,
  createPosition,
  type FeedPosition,
} from './position.ts'

export interface SurfacePosition {
  readonly feed: FeedPosition
  readonly introOffset: number
}

/** Consume finite intro pixels before advancing the exact deck position. */
export function advanceSurface(
  current: SurfacePosition,
  deltaPx: number,
  introHeight: number,
  rowHeight: number,
  visibleRows: number,
  endOffset: number,
): SurfacePosition {
  if (deltaPx === 0) return current
  if (deltaPx > 0) {
    const introDelta = Math.min(deltaPx, introHeight - current.introOffset)
    return {
      introOffset: current.introOffset + introDelta,
      feed: advancePosition(
        current.feed,
        deltaPx - introDelta,
        rowHeight,
        visibleRows,
        endOffset,
      ),
    }
  }
  const requestedPx = -deltaPx
  const requestedRows = Math.floor(requestedPx / rowHeight)
  if (!Number.isSafeInteger(requestedRows))
    return { feed: createPosition(0n, 0), introOffset: 0 }
  const rows = BigInt(requestedRows)
  const remainder = requestedPx - requestedRows * rowHeight
  if (
    rows > current.feed.topIndex ||
    (rows === current.feed.topIndex && remainder > current.feed.offsetPx)
  ) {
    // This difference is bounded by the safe, viewport-local requestedRows above.
    const introDelta =
      Number(rows - current.feed.topIndex) * rowHeight +
      remainder -
      current.feed.offsetPx
    return {
      feed: createPosition(0n, 0),
      introOffset: Math.max(0, current.introOffset - introDelta),
    }
  }
  return {
    ...current,
    feed: advancePosition(
      current.feed,
      deltaPx,
      rowHeight,
      visibleRows,
      endOffset,
    ),
  }
}
