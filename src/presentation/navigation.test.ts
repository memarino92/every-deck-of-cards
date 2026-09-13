import { describe, expect, it } from 'vite-plus/test'
import { advancePosition } from './navigation.ts'

describe('presentation steps', () => {
  const counts = [1, 3, 2]
  it('exhausts steps before changing slides and goes back to the previous final step', () => {
    expect(advancePosition(counts, { slide: 1, step: 1 }, 1)).toEqual({
      slide: 1,
      step: 2,
    })
    expect(advancePosition(counts, { slide: 1, step: 2 }, 1)).toEqual({
      slide: 2,
      step: 0,
    })
    expect(advancePosition(counts, { slide: 2, step: 0 }, -1)).toEqual({
      slide: 1,
      step: 2,
    })
    expect(advancePosition(counts, { slide: 1, step: 1 }, -1)).toEqual({
      slide: 1,
      step: 0,
    })
  })
  it('stays at the presentation boundaries', () => {
    expect(advancePosition(counts, { slide: 0, step: 0 }, -1)).toEqual({
      slide: 0,
      step: 0,
    })
    expect(advancePosition(counts, { slide: 2, step: 1 }, 1)).toEqual({
      slide: 2,
      step: 1,
    })
  })
})
