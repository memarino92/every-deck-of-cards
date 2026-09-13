import { describe, expect, it } from 'vite-plus/test'
import { parsePresentationQuery } from './query.ts'

const slides = [{ id: 'intro' }, { id: 'demo', stepCount: 18 }]

describe('presentation query', () => {
  it('restores stable slide IDs and one-based steps', () => {
    expect(parsePresentationQuery(slides, 'demo', '4')).toEqual({
      slide: 1,
      step: 3,
    })
    expect(
      parsePresentationQuery([{ id: 'new' }, ...slides], 'demo', '4'),
    ).toEqual({ slide: 2, step: 3 })
    expect(
      parsePresentationQuery(slides, ['demo', 'intro'], ['18', '1']),
    ).toEqual({ slide: 1, step: 17 })
  })
  it('falls back safely for absent, unknown, and malformed positions', () => {
    expect(parsePresentationQuery(slides, undefined, undefined)).toEqual({
      slide: 0,
      step: 0,
    })
    expect(parsePresentationQuery(slides, 'missing', '4')).toEqual({
      slide: 0,
      step: 0,
    })
    for (const value of [
      undefined,
      '0',
      '-1',
      '1.5',
      'abc',
      '19',
      'Infinity',
      '1e1',
      '999999999999999999999999999',
    ]) {
      expect(parsePresentationQuery(slides, 'demo', value)).toEqual({
        slide: 1,
        step: 0,
      })
    }
    expect(parsePresentationQuery(slides, 'intro', '2')).toEqual({
      slide: 0,
      step: 0,
    })
  })
})
