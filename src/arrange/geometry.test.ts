import { describe, expect, it } from 'vite-plus/test'
import { CANONICAL_DECK } from '../domain/cards.ts'
import { moveCard } from './reorder.ts'
import { positionFromPointer } from '../cards/spread.ts'
import { shuffleLiftForCard } from './shuffle-geometry.ts'

describe('moveCard', () => {
  it('moves a card to the selected final position without mutation', () => {
    const original = [0, 1, 2, 3]

    expect(moveCard(original, 0, 2)).toEqual([1, 2, 0, 3])
    expect(original).toEqual([0, 1, 2, 3])
  })

  it('rejects positions outside the ordering', () => {
    expect(() => moveCard([0, 1], -1, 0)).toThrow(RangeError)
    expect(() => moveCard([0, 1], 0, 2)).toThrow(RangeError)
  })
})

describe('positionFromPointer', () => {
  it('maps spread coordinates to the nearest card position', () => {
    expect(positionFromPointer(100, 100, 610, 100, 52)).toBe(51)
    expect(positionFromPointer(350, 100, 610, 100, 52)).toBe(26)
    expect(positionFromPointer(610, 100, 610, 100, 52)).toBe(0)
  })

  it('clamps pointers outside the spread', () => {
    expect(positionFromPointer(-100, 0, 610, 100, 52)).toBe(51)
    expect(positionFromPointer(1_000, 0, 610, 100, 52)).toBe(0)
  })
})

describe('shuffleLiftForCard', () => {
  it('sends exactly half the canonical cards up and half down', () => {
    const lifts = CANONICAL_DECK.map((id) => shuffleLiftForCard(id))

    expect(lifts.filter((lift) => lift < 0)).toHaveLength(26)
    expect(lifts.filter((lift) => lift > 0)).toHaveLength(26)
  })
})
