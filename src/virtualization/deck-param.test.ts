import { describe, expect, it } from 'vitest'

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
    expect(parseDeckNumberParam('12 34')).toBe(0n)
  })
})
