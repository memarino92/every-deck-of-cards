import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { ArrangePage, moveCard, positionFromPointer } from './ArrangePage.tsx'
import { CANONICAL_DECK } from './domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from './domain/deck-number.ts'
import { rankPermutation } from './domain/permutation.ts'

afterEach(cleanup)

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

describe('ArrangePage', () => {
  it('moves a selected card and displays its exact public deck number', async () => {
    render(() => <ArrangePage />)

    await fireEvent.click(
      screen.getByRole('button', { name: 'Select ace of spades' }),
    )
    await fireEvent.click(
      screen.getByRole('button', {
        name: /Move selected card to position 2, before two of spades/,
      }),
    )

    const expectedOrdering = moveCard(CANONICAL_DECK, 0, 1)
    const expectedNumber = permutationIndexToPublicDeckNumber(
      rankPermutation(CANONICAL_DECK, expectedOrdering),
    )

    expect(screen.getByRole('status').textContent).toContain(
      expectedNumber.toLocaleString('en-US'),
    )
    expect(
      screen
        .getByRole('button', { name: 'Select ace of spades' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })

  it('cancels a selection and resets the ordering', async () => {
    render(() => <ArrangePage />)

    const ace = screen.getByRole('button', { name: 'Select ace of spades' })
    await fireEvent.click(ace)
    await fireEvent.click(
      screen.getByRole('button', { name: 'Cancel moving ace of spades' }),
    )
    expect(ace.getAttribute('aria-pressed')).toBe('false')

    await fireEvent.click(ace)
    await fireEvent.click(
      screen.getByRole('button', {
        name: /Move selected card to position 2, before two of spades/,
      }),
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Reset deck' }))

    expect(screen.getByRole('status').textContent).toBe('Deck number1')
  })
})
