import { Index, Show, createMemo, createSignal } from 'solid-js'

import { traceUnrank } from './domain/trace.ts'

function label(value: number): string {
  return String(value)
}

export function UnrankStepper(props: {
  readonly size: number
  readonly index?: bigint
  readonly initialIndex?: bigint
}) {
  const canonical = createMemo(() =>
    Array.from({ length: props.size }, (_, value) => value),
  )
  const permutationCount = createMemo(
    () => traceUnrank(canonical(), 0n).permutationCount,
  )

  const [chosenIndex, setChosenIndex] = createSignal(props.initialIndex ?? 0n)
  const index = createMemo(() => props.index ?? chosenIndex())
  const [position, setPosition] = createSignal(0)

  const trace = createMemo(() => traceUnrank(canonical(), index()))
  const step = createMemo(() => trace().steps[position()])

  function chooseIndex(value: bigint) {
    setChosenIndex(value)
    setPosition(0)
  }

  return (
    <div class="stepper">
      <div class="stepper-controls">
        <label>
          Index{' '}
          <input
            type="number"
            min="0"
            max={(permutationCount() - 1n).toString()}
            value={index().toString()}
            onInput={(event) => {
              const parsed = BigInt(event.currentTarget.value || '0')
              if (parsed >= 0n && parsed < permutationCount()) {
                chooseIndex(parsed)
              }
            }}
          />{' '}
          of {permutationCount().toLocaleString('en-US')}
        </label>
        <button
          type="button"
          disabled={position() === 0}
          onClick={() => setPosition((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        <span class="stepper-progress">
          step {position() + 1} of {trace().steps.length}
        </span>
        <button
          type="button"
          disabled={position() === trace().steps.length - 1}
          onClick={() =>
            setPosition((value) =>
              Math.min(trace().steps.length - 1, value + 1),
            )
          }
        >
          Next
        </button>
      </div>

      <Show when={step()} keyed>
        {(current) => (
          <div class="stepper-stage">
            <p class="stepper-pool">
              Remaining pool:{' '}
              <Index each={[...current.poolBefore]}>
                {(value, i) => (
                  <span
                    class="stepper-card"
                    classList={{ selected: i === current.digit }}
                  >
                    {label(value())}
                  </span>
                )}
              </Index>
            </p>
            <p class="stepper-math">
              digit {current.digit} × {current.blockSize.toString()}! ={' '}
              {(BigInt(current.digit) * current.blockSize).toString()} · running
              index {current.indexSoFar.toString()} · remainder{' '}
              {current.remainder.toString()}
            </p>
            <p class="stepper-result">
              Permutation so far:{' '}
              {trace()
                .permutation.slice(0, position() + 1)
                .map(label)
                .join(' ')}
            </p>
          </div>
        )}
      </Show>
    </div>
  )
}
