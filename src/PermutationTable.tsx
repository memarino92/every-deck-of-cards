import { For, createMemo } from 'solid-js'

import { factorial } from './domain/factorial.ts'
import { traceUnrank } from './domain/trace.ts'

export function PermutationTable(props: {
  readonly size: number
  readonly onSelect?: (index: bigint) => void
}) {
  const canonical = createMemo(() =>
    Array.from({ length: props.size }, (_, value) => value),
  )
  const rows = createMemo(() => {
    const count = factorial(props.size)
    const result: { index: bigint; permutation: readonly number[] }[] = []

    for (let index = 0n; index < count; index += 1n) {
      result.push({
        index,
        permutation: traceUnrank(canonical(), index).permutation,
      })
    }

    return result
  })

  return (
    <table class="permutation-table">
      <thead>
        <tr>
          <th scope="col">index</th>
          <th scope="col">permutation</th>
        </tr>
      </thead>
      <tbody>
        <For each={rows()}>
          {(row) => (
            <tr
              onClick={() => props.onSelect?.(row.index)}
              class={{ selectable: props.onSelect !== undefined }}
            >
              <td class="index">{row.index.toString()}</td>
              <td>{row.permutation.join(' ')}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
