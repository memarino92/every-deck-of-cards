import { describe, expect, it } from 'vite-plus/test'
import { createPosition } from './position.ts'
import { advanceSurface } from './surface.ts'

describe('finite intro and exact feed position', () => {
  it('carries input across the intro/feed seam in both directions', () => {
    const moved = advanceSurface(
      { feed: createPosition(0n), introOffset: 0 },
      275,
      200,
      100,
      4,
      0,
    )
    expect(moved).toEqual({
      feed: createPosition(0n, 75, 100),
      introOffset: 200,
    })
    expect(advanceSurface(moved, -100, 200, 100, 4, 0)).toEqual({
      feed: createPosition(0n),
      introOffset: 175,
    })
  })
  it('keeps deep-space indices exact without exposing the intro', () => {
    const index = 10n ** 60n
    const moved = advanceSurface(
      { feed: createPosition(index), introOffset: 200 },
      -125,
      200,
      100,
      4,
      0,
    )
    expect(moved).toEqual({
      feed: createPosition(index - 2n, 75, 100),
      introOffset: 200,
    })
  })
})
