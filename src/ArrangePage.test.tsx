import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { createRouter, memoryHistory } from '@solidjs/router'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { ArrangePage } from './ArrangePage.tsx'
import { moveCard } from './arrange/reorder.ts'
import { CANONICAL_DECK } from './domain/cards.ts'
import { permutationIndexToPublicDeckNumber } from './domain/deck-number.ts'
import { rankPermutation, unrankPermutation } from './domain/permutation.ts'

afterEach(cleanup)

function renderArrange(
  options: {
    readonly path?: string
    readonly drawPermutationIndex?: () => bigint
    readonly reducedMotion?: boolean
  } = {},
): void {
  const Router = createRouter({
    routes: [
      {
        path: '/arrange',
        component: () => (
          <ArrangePage
            {...(options.drawPermutationIndex === undefined
              ? {}
              : { drawPermutationIndex: options.drawPermutationIndex })}
            {...(options.reducedMotion === undefined
              ? {}
              : { reducedMotion: options.reducedMotion })}
          />
        ),
      },
    ],
    history: memoryHistory(options.path ?? '/arrange'),
  })

  render(() => <Router>{(props) => props.children}</Router>)
}

describe('ArrangePage', () => {
  it('moves a selected card and displays its exact public deck number', async () => {
    renderArrange()

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
    renderArrange()

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

  it('settles a reduced-motion shuffle on the exact drawn deck', async () => {
    renderArrange({ drawPermutationIndex: () => 42n, reducedMotion: true })

    await fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))

    expect(screen.getByRole('status').textContent).toBe('Deck number43')
    expect(
      document.querySelector('.arrange')?.hasAttribute('data-shuffling'),
    ).toBe(false)
    const expectedOrdering = unrankPermutation(CANONICAL_DECK, 42n)
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('.arrange-card')).map(
        (element) => Number(element.dataset['cardId']),
      ),
    ).toEqual(expectedOrdering)
  })

  it('opens a shared deck query at its exact ordering', () => {
    renderArrange({ path: '/arrange?deck=43' })

    expect(screen.getByRole('status').textContent).toBe('Deck number43')
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('.arrange-card')).map(
        (element) => Number(element.dataset['cardId']),
      ),
    ).toEqual(unrankPermutation(CANONICAL_DECK, 42n))
  })
})
