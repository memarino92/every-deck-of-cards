import { Show, createSignal, onSettled } from 'solid-js'
import type { JSX } from '@solidjs/web'

import { isNavigationKey } from '../platform/keyboard.ts'

export interface Slide {
  readonly title: string
  readonly body: () => JSX.Element
}

/** Presentation navigation is scoped to this surface, not the browser window. */
export function Presentation(props: { readonly slides: readonly Slide[] }) {
  const [current, setCurrent] = createSignal(0)
  let surface: HTMLElement | undefined
  const assignSurface = (element: HTMLElement): void => {
    surface = element
  }

  function advance(delta: number): void {
    setCurrent((value) =>
      Math.min(props.slides.length - 1, Math.max(0, value + delta)),
    )
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!isNavigationKey(event)) return
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault()
      advance(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      advance(-1)
    }
  }

  onSettled(() => {
    surface?.focus({ preventScroll: true })
  })

  return (
    // The presentation surface provides slide navigation independently of its controls.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      class="talk"
      aria-label="Presentation"
      ref={assignSurface}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabindex="0"
      onKeyDown={handleKeyDown}
    >
      <Show when={props.slides[current()]} keyed>
        {(slide) => (
          <section class="talk-slide" aria-labelledby="talk-slide-title">
            <p class="talk-progress">
              {current() + 1} / {props.slides.length}
            </p>
            <h1 id="talk-slide-title">{slide.title}</h1>
            <div class="talk-body">{slide.body()}</div>
          </section>
        )}
      </Show>
      <div class="talk-controls">
        <button
          class="action-button"
          type="button"
          onClick={() => advance(-1)}
          disabled={current() === 0}
        >
          ← Prev
        </button>
        <button
          class="action-button"
          type="button"
          onClick={() => advance(1)}
          disabled={current() === props.slides.length - 1}
        >
          Next →
        </button>
      </div>
    </section>
  )
}
