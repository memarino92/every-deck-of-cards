import { Show } from 'solid-js'

import { UnrankStage } from './UnrankStage.tsx'
import type { Walkthrough } from './walkthrough.ts'

export function UnrankStepper(props: { readonly model: Walkthrough }) {
  return (
    <div class="stepper">
      <div class="stepper-controls">
        <label>
          Index{' '}
          <input
            type="number"
            min="0"
            max={(props.model.count - 1n).toString()}
            value={props.model.index().toString()}
            onInput={(event) => {
              const raw = event.currentTarget.value
              const parsed = /^\d+$/.test(raw) ? BigInt(raw) : undefined
              if (parsed !== undefined && parsed < props.model.count) {
                props.model.select(parsed)
              } else {
                event.currentTarget.value = props.model.index().toString()
              }
            }}
          />{' '}
          of {props.model.count.toLocaleString('en-US')}
        </label>
        <button
          type="button"
          disabled={props.model.position() === 0}
          onClick={() => props.model.advance(-1)}
        >
          Back
        </button>
        <span class="stepper-progress">
          step {props.model.position() + 1} of{' '}
          {props.model.trace().steps.length}
        </span>
        <button
          type="button"
          disabled={
            props.model.position() === props.model.trace().steps.length - 1
          }
          onClick={() => props.model.advance(1)}
        >
          Next
        </button>
      </div>
      <Show when={props.model.trace().steps[props.model.position()]} keyed>
        {(step) => (
          <UnrankStage
            step={step}
            permutation={props.model
              .trace()
              .permutation.slice(0, props.model.position() + 1)}
          />
        )}
      </Show>
    </div>
  )
}
