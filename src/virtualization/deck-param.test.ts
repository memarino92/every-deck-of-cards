import { describe, expect, it } from 'vite-plus/test'

import { DECK_COUNT } from '../domain/deck-number.ts'
import { parseDeckNumberParam } from './deck-param.ts'

describe('parseDeckNumberParam', () => {
  it('anchors to the first deck when the parameter is absent', () => {
    expect(parseDeckNumberParam(undefined)).toBe(0n)
  })

  it('parses a valid deck number to its zero-based index', () => {
    expect(parseDeckNumberParam('1')).toBe(0n)
    expect(parseDeckNumberParam('2')).toBe(1n)
    expect(
      parseDeckNumberParam(
        '80658175170943878571660636856403766975289505440883277824000000000000',
      ),
    ).toBe(DECK_COUNT - 1n)
  })

  it('rejects zero and numbers past the last deck', () => {
    expect(parseDeckNumberParam('0')).toBe(0n)
    expect(
      parseDeckNumberParam(
        '80658175170943878571660636856403766975289505440883277824000000000001',
      ),
    ).toBe(0n)
  })

  it('rejects malformed and non-numeric input', () => {
    expect(parseDeckNumberParam('abc')).toBe(0n)
    expect(parseDeckNumberParam('-5')).toBe(0n)
    expect(parseDeckNumberParam('1.5')).toBe(0n)
    expect(parseDeckNumberParam('1e3')).toBe(0n)
    expect(parseDeckNumberParam('')).toBe(0n)
  })

  it('accepts common thousands separators', () => {
    // Every deck number the site displays is comma-grouped, and visitors
    // paste those strings back into the jump box.
    expect(parseDeckNumberParam('1,234,567')).toBe(1234566n)
    expect(parseDeckNumberParam('1 234 567')).toBe(1234566n)
    expect(parseDeckNumberParam('1 234 567')).toBe(1234566n)
    expect(parseDeckNumberParam('1 234 567')).toBe(1234566n)
    expect(parseDeckNumberParam('1_234_567')).toBe(1234566n)
    expect(parseDeckNumberParam("1'234'567")).toBe(1234566n)

    // The formatted last deck number round-trips to the last index.
    expect(
      parseDeckNumberParam(
        '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000',
      ),
    ).toBe(DECK_COUNT - 1n)
  })

  it('still rejects input that is not digits once separators are stripped', () => {
    expect(parseDeckNumberParam(',,,')).toBe(0n)
    expect(parseDeckNumberParam('1,2,3,')).toBe(122n)
    expect(parseDeckNumberParam('12a,345')).toBe(0n)
  })
})
