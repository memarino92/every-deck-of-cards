import { For, createMemo } from 'solid-js'

import { factorial } from '../domain/factorial.ts'
import { traceUnrank } from '../domain/trace.ts'

export function PermutationTable(props: {
  /** Tables are deliberately limited to at most 24 rows. */
  readonly size: 1 | 2 | 3 | 4
  readonly onSelect?: (index: bigint) => void
}) {
  const canonical = createMemo(() =>
    Array.from({ length: props.size }, (_, value) => value),
  )
  const rows = createMemo(() => {
    if (!Number.isInteger(props.size) || props.size < 1 || props.size > 4) {
      throw new RangeError('Example tables support one through four cards')
    }
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
            <tr class={{ selectable: props.onSelect !== undefined }}>
              <td class="index">
                {props.onSelect === undefined ? (
                  row.index.toString()
                ) : (
                  <button
                    type="button"
                    class="permutation-select"
                    aria-label={`Replay index ${row.index}`}
                    onClick={() => props.onSelect?.(row.index)}
                  >
                    {row.index.toString()}
                  </button>
                )}
              </td>
              <td>{row.permutation.join(' ')}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}
