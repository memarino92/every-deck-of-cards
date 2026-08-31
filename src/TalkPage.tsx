import { Show, createSignal, onSettled } from 'solid-js'
import type { JSX } from '@solidjs/web'

import { DECK_COUNT } from './domain/deck-number.ts'
import { factorial } from './domain/factorial.ts'
import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'
import { PermutationTable } from './PermutationTable.tsx'
import { UnrankStepper } from './UnrankStepper.tsx'

const atomsComparison = compareDeckCountToAtomsOnEarth()

interface Slide {
  readonly title: string
  readonly body: () => JSX.Element
}

export function TalkPage() {
  const [fourCardIndex, setFourCardIndex] = createSignal(0n)

  const slides: Slide[] = [
    {
      title: '52 cards. 80 unvigintillion possibilities.',
      body: () => (
        <p>
          Every ordering of a 52-card deck has exactly one number. No list, no
          storage — a reversible recipe. Here's the recipe, built up with decks
          small enough to see whole.
        </p>
      ),
    },
    {
      title: `2 cards, ${factorial(2).toString()} orderings`,
      body: () => (
        <>
          <p>Every shuffle of two cards fits in one table.</p>
          <PermutationTable size={2} />
        </>
      ),
    },
    {
      title: `3 cards, ${factorial(3).toString()} orderings`,
      body: () => (
        <>
          <p>
            The first pick splits {factorial(3).toString()} orderings into 3
            blocks of {factorial(2).toString()}. Index 4 ÷ 2 = 2, so card 2
            leads. Watch:
          </p>
          <UnrankStepper size={3} initialIndex={4n} />
        </>
      ),
    },
    {
      title: `4 cards, ${factorial(4).toString()} orderings`,
      body: () => (
        <>
          <p>Twenty-four orderings, still one screen. Click a row.</p>
          <PermutationTable
            size={4}
            onSelect={(index) => setFourCardIndex(index)}
          />
          <UnrankStepper size={4} index={fourCardIndex()} />
        </>
      ),
    },
    {
      title: `5 cards, ${factorial(5).toString()} orderings`,
      body: () => (
        <>
          <p>
            120 rows is where printing the table stops being useful. Index 73:
            73 ÷ 24 = 3 remainder 1, and the recipe keeps going.
          </p>
          <UnrankStepper size={5} initialIndex={73n} />
        </>
      ),
    },
    {
      title: 'Then 52 cards',
      body: () => (
        <p>
          The same recipe, 52 picks, {DECK_COUNT.toLocaleString('en-US')}{' '}
          orderings — about{' '}
          {atomsComparison.timesLarger.toLocaleString('en-US')} decks for every
          atom on Earth. The table can never exist. The recipe doesn't care.
          Every number deals its exact deck; every deck hands its number back.
        </p>
      ),
    },
  ]

  const [current, setCurrent] = createSignal(0)

  function advance(delta: number) {
    setCurrent((value) =>
      Math.min(slides.length - 1, Math.max(0, value + delta)),
    )
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault()
      advance(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      advance(-1)
    }
  }

  onSettled(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div class="talk">
      <Show when={slides[current()]} keyed>
        {(slide) => (
          <section class="talk-slide" aria-labelledby="talk-slide-title">
            <p class="talk-progress">
              {current() + 1} / {slides.length}
            </p>
            <h1 id="talk-slide-title">{slide.title}</h1>
            <div class="talk-body">{slide.body()}</div>
          </section>
        )}
      </Show>
      <div class="talk-controls">
        <button
          type="button"
          onClick={() => advance(-1)}
          disabled={current() === 0}
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => advance(1)}
          disabled={current() === slides.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
