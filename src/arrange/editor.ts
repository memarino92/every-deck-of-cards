import { createMemo, createSignal } from 'solid-js'

import { CANONICAL_DECK, type CardId } from '../domain/cards.ts'
import { rankPermutation, unrankPermutation } from '../domain/permutation.ts'
import { permutationIndexToPublicDeckNumber } from '../domain/deck-number.ts'
import { moveCard } from './reorder.ts'

/** Local deck transactions; browser interactions decide when previews settle. */
export function createDeckEditor(
  initialIndex: bigint,
  commit: (index: bigint) => void,
) {
  const [ordering, setOrdering] = createSignal<readonly CardId[]>(
    unrankPermutation(CANONICAL_DECK, initialIndex),
  )
  const [selectedIndex, setSelectedIndex] = createSignal<number>()
  const index = createMemo(() => rankPermutation(CANONICAL_DECK, ordering()))
  const number = createMemo(() => permutationIndexToPublicDeckNumber(index()))
  function clearSelection(): void {
    setSelectedIndex(undefined)
  }
  function settle(cards: readonly CardId[] = ordering()): void {
    // Commands can settle their returned ordering before Solid flushes writes.
    commit(rankPermutation(CANONICAL_DECK, cards))
  }
  function replace(cards: readonly CardId[]): void {
    clearSelection()
    setOrdering(cards)
  }
  function restore(value: bigint): readonly CardId[] {
    const next = unrankPermutation(CANONICAL_DECK, value)
    replace(next)
    return next
  }
  function move(from: number, to: number): readonly CardId[] {
    const next = moveCard(ordering(), from, to)
    setOrdering(next)
    return next
  }
  function select(position: number): void {
    const selected = selectedIndex()
    if (selected === undefined) {
      setSelectedIndex(position)
      return
    }
    clearSelection()
    if (selected !== position) {
      settle(move(selected, position))
    }
  }
  return {
    ordering,
    selectedIndex,
    number,
    clearSelection,
    settle,
    replace,
    restore,
    move,
    select,
  }
}
export type DeckEditor = ReturnType<typeof createDeckEditor>
