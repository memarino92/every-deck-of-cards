import type { JSX } from '@solidjs/web'

export interface Slide {
  readonly id: string
  readonly title: string
  readonly body: (step: () => number) => JSX.Element
  readonly stepCount?: number
}

/** The visual stays mounted as its current snapshot changes. */
export function stepSlide<T>(options: {
  readonly id: string
  readonly title: string
  readonly steps: readonly [T, ...T[]]
  readonly render: (step: () => T) => JSX.Element
}): Slide {
  return {
    id: options.id,
    title: options.title,
    stepCount: options.steps.length,
    body: (position) =>
      options.render(() => options.steps[position()] ?? options.steps[0]),
  }
}
