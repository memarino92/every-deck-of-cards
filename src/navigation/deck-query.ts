import { useSearchParams } from '@solidjs/router'
import { createEffect, untrack } from 'solid-js'

import { permutationIndexToPublicDeckNumber } from '../domain/deck-number.ts'
import { parseDeckNumberParam } from './deck-param.ts'

export function firstSearchParam(
  raw: string | string[] | undefined,
): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

/** Shares the query contract; each feature decides when an interaction commits. */
export function createDeckQuery(onExternal: (index: bigint) => void) {
  const [params, setParams] = useSearchParams()
  const initialParam = untrack(() => firstSearchParam(params['deck']))
  const initialIndex = parseDeckNumberParam(initialParam)
  let ownParam: string | undefined
  let observed = false

  createEffect(
    () => firstSearchParam(params['deck']),
    (param) => {
      if (!observed) {
        observed = true
        return
      }
      if (ownParam !== undefined && param === ownParam) {
        ownParam = undefined
        return
      }
      ownParam = undefined
      untrack(() => onExternal(parseDeckNumberParam(param)))
    },
  )

  function commit(index: bigint): void {
    const param = permutationIndexToPublicDeckNumber(index).toString()
    if (firstSearchParam(params['deck']) === param) return
    ownParam = param
    setParams({ deck: param })
  }

  return { initialIndex, initialParam, commit }
}
