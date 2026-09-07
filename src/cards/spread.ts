/** CSS slot contract shared by passive and interactive spreads. */
export function spreadSlotStyle(position: number, count: number) {
  return {
    '--position': position,
    '--card-count': count,
    'z-index': count - position,
  }
}

/** Inverse of cards/styles.css placement: slot zero is rightmost. */
export function positionFromPointer(
  pointerX: number,
  trackLeft: number,
  trackWidth: number,
  cardWidth: number,
  itemCount: number,
): number {
  if (itemCount < 1) {
    throw new RangeError('A spread must contain at least one card')
  }

  if (itemCount === 1 || trackWidth <= cardWidth) {
    return 0
  }

  const step = (trackWidth - cardWidth) / (itemCount - 1)
  const slotFromLeft = Math.round((pointerX - trackLeft) / step)
  return Math.max(0, Math.min(itemCount - 1, itemCount - 1 - slotFromLeft))
}
