import { createMemo, createSignal } from 'solid-js'

import { factorial } from '../domain/factorial.ts'
import { traceUnrank } from '../domain/trace.ts'

export interface Example {
  readonly size: 2 | 3 | 4 | 5
  readonly initialIndex: bigint
}

export const THREE_CARD_EXAMPLE = { size: 3, initialIndex: 4n } as const
export const FIVE_CARD_EXAMPLE = { size: 5, initialIndex: 73n } as const

export function exampleTitle(size: Example['size']): string {
  return `${size} cards, ${factorial(size)} orderings`
}

/** One owner for selection and replay; its lifetime is chosen by the composer. */
export function createWalkthrough(example: Example) {
  const canonical = Array.from({ length: example.size }, (_, value) => value)
  const count = factorial(example.size)
  const [index, setIndex] = createSignal(example.initialIndex)
  const [position, setPosition] = createSignal(0)
  const trace = createMemo(() => traceUnrank(canonical, index()))

  function select(value: bigint): void {
    if (value < 0n || value >= count) {
      throw new RangeError('Index must be within the example')
    }
    setIndex(value)
    setPosition(0)
  }

  function advance(delta: number): void {
    setPosition((value) =>
      Math.max(0, Math.min(example.size - 1, value + delta)),
    )
  }

  return { index, position, trace, count, select, advance }
}

export type Walkthrough = ReturnType<typeof createWalkthrough>
