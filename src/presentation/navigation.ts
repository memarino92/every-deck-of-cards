export interface SlidePosition {
  readonly slide: number
  readonly step: number
}

/** Step numbers are presentation positions, never permutation indices. */
export function advancePosition(
  counts: readonly number[],
  position: SlidePosition,
  direction: -1 | 1,
): SlidePosition {
  const lastStep = (counts[position.slide] ?? 1) - 1
  if (direction === 1) {
    if (position.step < lastStep)
      return { ...position, step: position.step + 1 }
    if (position.slide < counts.length - 1)
      return { slide: position.slide + 1, step: 0 }
  } else {
    if (position.step > 0) return { ...position, step: position.step - 1 }
    if (position.slide > 0)
      return {
        slide: position.slide - 1,
        step: (counts[position.slide - 1] ?? 1) - 1,
      }
  }
  return position
}
