export function moveCard<T>(
  ordering: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    fromIndex >= ordering.length ||
    toIndex < 0 ||
    toIndex >= ordering.length
  ) {
    throw new RangeError('Card positions must be within the deck')
  }

  const next = [...ordering]
  const [card] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, card as T)
  return next
}
