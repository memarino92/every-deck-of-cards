import { useSearchParams } from '@solidjs/router'
import { For, Show, createMemo, onSettled } from 'solid-js'
import { isNavigationKey } from '../platform/keyboard.ts'
import { advancePosition, type SlidePosition } from './navigation.ts'
import { parsePresentationQuery } from './query.ts'
import type { Slide } from './slide.ts'
export type { Slide } from './slide.ts'

/** Presentation navigation is scoped to this surface, not the browser window. */
export function Presentation(props: { readonly slides: readonly Slide[] }) {
  const [params, setParams] = useSearchParams()
  const position = createMemo(() =>
    parsePresentationQuery(props.slides, params['slide'], params['step']),
  )
  const current = () => position().slide
  const step = () => position().step
  const counts = () => props.slides.map((slide) => slide.stepCount ?? 1)
  let surface: HTMLElement | undefined
  const assignSurface = (element: HTMLElement): void => {
    surface = element
  }

  function advance(delta: -1 | 1): void {
    setPosition(advancePosition(counts(), position(), delta))
  }

  function setPosition(next: SlidePosition): void {
    if (next.slide === current() && next.step === step()) return
    setParams(
      { slide: props.slides[next.slide]?.id, step: String(next.step + 1) },
      { scroll: false },
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
              Slide {current() + 1} / {props.slides.length}
              {' · '}Step {step() + 1} / {counts()[current()]}
            </p>
            <h1 id="talk-slide-title">{slide.title}</h1>
            <div class="talk-body">{slide.body(step)}</div>
          </section>
        )}
      </Show>
      <div class="talk-controls">
        <button
          class="action-button"
          type="button"
          onClick={() => advance(-1)}
          disabled={current() === 0 && step() === 0}
        >
          ← Prev
        </button>
        <button
          class="action-button"
          type="button"
          onClick={() => setPosition({ slide: current(), step: 0 })}
          disabled={step() === 0}
        >
          Restart slide
        </button>
        <label class="talk-jump">
          Slide
          <select
            aria-label="Jump to slide"
            value={current()}
            onChange={(event) =>
              setPosition({ slide: Number(event.currentTarget.value), step: 0 })
            }
          >
            <For each={props.slides}>
              {(slide, index) => (
                <option value={index()}>
                  {index() + 1}. {slide.title}
                </option>
              )}
            </For>
          </select>
        </label>
        <button
          class="action-button"
          type="button"
          onClick={() => advance(1)}
          disabled={
            current() === props.slides.length - 1 &&
            step() === (counts()[current()] ?? 1) - 1
          }
        >
          Next →
        </button>
      </div>
    </section>
  )
}
