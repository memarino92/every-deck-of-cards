import { describe, expect, it } from 'vite-plus/test'
import { rankPermutation, unrankPermutation } from '../../domain/permutation.ts'
import { FOUR_CARDS, rankWalk, unrankWalk } from './frames.ts'

describe('debugger snapshots', () => {
  it('unranks every four-card index using complete, independently renderable frames', () => {
    for (let index = 0n; index < 24n; index += 1n) {
      const walk = unrankWalk(index)
      expect(walk.frames.at(-1)?.processed).toEqual(
        unrankPermutation(FOUR_CARDS, index),
      )
      expect(walk.frames.at(-1)?.remaining).toEqual([])
      expect(walk.frames.at(-1)?.watches.remainder).toBe('0')
      expect(new Set(walk.frames.map((frame) => frame.id)).size).toBe(
        walk.frames.length,
      )
      for (const frame of walk.frames.toReversed()) {
        expect([...frame.remaining, ...frame.processed].toSorted()).toEqual(
          FOUR_CARDS,
        )
        expect(Number.isInteger(frame.line)).toBe(true)
        expect(frame.line).toBeGreaterThanOrEqual(1)
        expect(frame.line).toBeLessThanOrEqual(walk.code.length)
      }
      expect(walk.frames[0].processed).toEqual([])
    }
  })
  it('shows the index-14 arithmetic at the corresponding code lines', () => {
    const frames = unrankWalk(14n).frames
    expect(frames.find((frame) => frame.id === 'pick-0-digit')).toMatchObject({
      line: 5,
      watches: { remainder: '14', blockSize: '6', digit: '2' },
      equation: '14 ÷ 6 = 2 remainder 2',
    })
    expect(
      frames.find((frame) => frame.id === 'pick-0-move')?.watches,
    ).toMatchObject({ remainder: '14', result: '[3]' })
    expect(
      frames.find((frame) => frame.id === 'pick-0-remainder')?.watches
        .remainder,
    ).toBe('2')
    expect(frames.at(-1)?.watches.result).toBe('[3, 2, A, 4]')
  })
  it('ranks the input cards and exposes partial sums before consuming each card', () => {
    const input = FOUR_CARDS.toReversed()
    const walk = rankWalk(input)
    expect(walk.index).toBe(rankPermutation(FOUR_CARDS, input))
    expect(
      walk.frames
        .filter((frame) => frame.id.endsWith('-add'))
        .map((frame) => frame.watches.index),
    ).toEqual(['18', '22', '23', '23'])
    expect(
      walk.frames.find((frame) => frame.id === 'read-0-add')?.processed,
    ).toEqual([])
    expect(
      walk.frames.find((frame) => frame.id === 'read-0-move')?.processed,
    ).toEqual([input[0]])
    expect(walk.frames.at(-1)?.processed).toEqual(input)
    expect(walk.frames.at(-1)?.remaining).toEqual([])
    expect(walk.frames[0].watches.index).toBe('0')
  })
})
