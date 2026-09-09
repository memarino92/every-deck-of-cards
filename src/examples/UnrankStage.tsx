import { For } from 'solid-js'

import type { UnrankStep } from '../domain/trace.ts'

export function UnrankStage(props: {
  readonly step: UnrankStep<number>
  readonly permutation: readonly number[]
}) {
  return (
    <div class="stepper-stage">
      <p class="stepper-pool">
        Remaining pool:{' '}
        <For each={props.step.poolBefore} keyed={false}>
          {(value, i) => (
            <span
              class={['stepper-card', { selected: i === props.step.digit }]}
            >
              {value()}
            </span>
          )}
        </For>
      </p>
      <p class="stepper-math">
        digit {props.step.digit} × {props.step.blockSize.toString()} ={' '}
        {(BigInt(props.step.digit) * props.step.blockSize).toString()} · running
        index {props.step.indexSoFar.toString()} · remainder{' '}
        {props.step.remainder.toString()}
      </p>
      <p class="stepper-result">
        Permutation so far: {props.permutation.join(' ')}
      </p>
    </div>
  )
}
