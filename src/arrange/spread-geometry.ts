import type { CardId } from '../domain/cards.ts'
import { positionFromPointer } from '../cards/spread.ts'

/** Explicit DOM registry: gestures and motion never search markup for card identity. */
export function createSpreadGeometry() {
  let scroller: HTMLDivElement | undefined
  let track: HTMLDivElement | undefined
  const cards = new Map<CardId, HTMLButtonElement>()
  const assignScroller = (element: HTMLDivElement): void => {
    scroller = element
  }
  const assignTrack = (element: HTMLDivElement): void => {
    track = element
  }
  function register(id: CardId, element: HTMLButtonElement): () => void {
    cards.set(id, element)
    return () => {
      if (cards.get(id) === element) cards.delete(id)
    }
  }
  function snapshot(): ReadonlyMap<CardId, DOMRect> {
    return new Map(
      Array.from(cards, ([id, element]) => [
        id,
        element.getBoundingClientRect(),
      ]),
    )
  }
  function positionAt(x: number, count: number): number | undefined {
    if (track === undefined) return undefined
    const rect = track.getBoundingClientRect()
    const width = cards.values().next().value?.offsetWidth ?? 0
    return positionFromPointer(x, rect.left, rect.width, width, count)
  }
  return {
    assignScroller,
    assignTrack,
    register,
    snapshot,
    positionAt,
    scroller: () => scroller,
    track: () => track,
    cards: () => cards as ReadonlyMap<CardId, HTMLButtonElement>,
  }
}
export type SpreadGeometry = ReturnType<typeof createSpreadGeometry>
