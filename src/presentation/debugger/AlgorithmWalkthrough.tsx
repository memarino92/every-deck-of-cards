import { For, createEffect, onSettled, untrack } from 'solid-js'
import type { CardId } from '../../domain/cards.ts'
import { PlayingCard } from '../../PlayingCard.tsx'
import { createLayoutTransition } from '../layout-transition.ts'
import { cardLabel, type DebugFrame, type DebugWalk } from './frames.ts'
import './styles.css'

function CardTrays(props: {
  readonly walk: DebugWalk
  readonly frame: DebugFrame
}) {
  let surface!: HTMLDivElement
  const cards = new Map<CardId, HTMLElement>()
  const slots: HTMLElement[][] = [[], []]
  const motion = createLayoutTransition()

  function place(
    frame: DebugFrame,
    input: readonly CardId[],
    animate: boolean,
  ): void {
    const placements = new Map<HTMLElement, HTMLElement>()
    const source = input.filter((card) => !frame.processed.includes(card))
    for (const [card, element] of cards) {
      const outputPosition = frame.processed.indexOf(card)
      const row = outputPosition === -1 ? 0 : 1
      const column =
        outputPosition === -1 ? source.indexOf(card) : outputPosition
      const slot = slots[row]?.[column]
      if (slot) placements.set(element, slot)
    }
    motion.place(surface, placements, animate)
  }

  createEffect(
    () => ({ frame: props.frame, input: props.walk.input }),
    ({ frame, input }) => place(frame, input, frame.id !== 'start'),
  )
  onSettled(() => {
    const observer = new ResizeObserver(() =>
      untrack(() => place(props.frame, props.walk.input, false)),
    )
    observer.observe(surface)
    return () => observer.disconnect()
  })

  return (
    <div
      class="debug-trays"
      ref={(element) => {
        surface = element
      }}
      aria-label="Card walkthrough"
    >
      <For each={[0, 1]}>
        {(row) => (
          <section
            class="debug-tray"
            data-tray={row === 0 ? 'source' : 'output'}
          >
            <h2>
              {row === 0
                ? props.walk.mode === 'unrank'
                  ? 'Remaining pool'
                  : 'Input permutation'
                : props.walk.mode === 'unrank'
                  ? 'Output permutation'
                  : 'Processed cards'}
            </h2>
            <div class="debug-slots">
              <For each={props.walk.input}>
                {(_, column) => (
                  <div class="debug-slot-column">
                    <div
                      class="debug-slot"
                      ref={(element) => {
                        slots[row]![untrack(column)] = element
                      }}
                      aria-hidden="true"
                    />
                    <span class="debug-slot-index">{column()}</span>
                  </div>
                )}
              </For>
            </div>
          </section>
        )}
      </For>
      <For each={props.walk.input}>
        {(card) => (
          <div
            ref={(element) => {
              cards.set(card, element)
            }}
            class={[
              'debug-moving-card',
              { 'is-selected': props.frame.selected === card },
            ]}
            data-card={cardLabel(card)}
            data-location={
              props.frame.processed.includes(card) ? 'output' : 'source'
            }
            aria-label={`${cardLabel(card)}: ${props.frame.processed.includes(card) ? 'output' : 'source'}`}
          >
            <PlayingCard id={card} />
          </div>
        )}
      </For>
    </div>
  )
}

export function AlgorithmWalkthrough(props: {
  readonly walk: DebugWalk
  readonly frame: DebugFrame
  readonly announce?: boolean
}) {
  return (
    <div class="algorithm-walk" data-frame={props.frame.id}>
      <p class="debug-kicker">
        {props.walk.mode === 'unrank'
          ? `NUMBER → CARDS · INDEX ${props.walk.index}`
          : 'CARDS → NUMBER · [4, 3, 2, A]'}{' '}
        <span>Zero-based indices · 0–23</span>
      </p>
      <div class="debug-columns">
        <div class="debug-program">
          <div class="debug-panel-heading">
            <span>{props.walk.mode === 'unrank' ? 'unrank' : 'rank'}.ts</span>
            <span>Algorithm · validation omitted</span>
          </div>
          <pre class="debug-code" aria-label="Algorithm code">
            <code>
              <For each={props.walk.code}>
                {(line, index) => (
                  <span
                    class={[
                      'debug-line',
                      { 'is-active': props.frame.line === index() + 1 },
                    ]}
                    aria-current={
                      props.frame.line === index() + 1 ? 'step' : undefined
                    }
                  >
                    <span class="debug-line-number" aria-hidden="true">
                      {index() + 1}
                    </span>
                    {line}
                    {'\n'}
                  </span>
                )}
              </For>
            </code>
          </pre>
          <div class="debug-panel-heading">Watch</div>
          <dl class="debug-watches">
            <For each={Object.keys(props.frame.watches)}>
              {(name) => (
                <div>
                  <dt>{name}</dt>
                  <dd data-watch={name}>{props.frame.watches[name]}</dd>
                </div>
              )}
            </For>
          </dl>
        </div>
        <div class="debug-visual">
          <CardTrays walk={props.walk} frame={props.frame} />
          <p class="debug-slot-note">
            {props.walk.mode === 'unrank'
              ? 'Remaining cards slide left into their new pool indices.'
              : 'Unread cards slide left. Tray labels are unread positions; watch “remaining” for canonical-pool indices.'}
          </p>
          <p class="debug-equation">{props.frame.equation}</p>
        </div>
      </div>
      <output
        class="debug-narration"
        aria-live={props.announce === false ? 'off' : 'polite'}
      >
        {props.frame.narration}
      </output>
    </div>
  )
}
