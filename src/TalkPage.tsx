import { Presentation, type Slide } from './presentation/Presentation.tsx'

import { DECK_COUNT } from './domain/deck-number.ts'
import { factorial } from './domain/factorial.ts'
import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'
import { PermutationTable } from './examples/PermutationTable.tsx'
import { FourCardWalkthrough, UnrankExample } from './examples/CardExamples.tsx'
import {
  createWalkthrough,
  exampleTitle,
  THREE_CARD_EXAMPLE,
  FIVE_CARD_EXAMPLE,
} from './examples/walkthrough.ts'

const atomsComparison = compareDeckCountToAtomsOnEarth()

export function TalkPage() {
  const fourCards = createWalkthrough({ size: 4, initialIndex: 0n })

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
      title: exampleTitle(2),
      body: () => (
        <>
          <p>Every shuffle of two cards fits in one table.</p>
          <PermutationTable size={2} />
        </>
      ),
    },
    {
      title: exampleTitle(3),
      body: () => (
        <>
          <p>
            The first pick splits {factorial(3).toString()} orderings into 3
            blocks of {factorial(2).toString()}. Index 4 ÷ 2 = 2, so card 2
            leads. Watch:
          </p>
          <UnrankExample {...THREE_CARD_EXAMPLE} />
        </>
      ),
    },
    {
      title: exampleTitle(4),
      body: () => (
        <>
          <p>Twenty-four orderings, still one screen. Select an index.</p>
          <FourCardWalkthrough model={fourCards} />
        </>
      ),
    },
    {
      title: exampleTitle(5),
      body: () => (
        <>
          <p>
            120 rows is where printing the table stops being useful. Index 73:
            73 ÷ 24 = 3 remainder 1, and the recipe keeps going.
          </p>
          <UnrankExample {...FIVE_CARD_EXAMPLE} />
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

  return <Presentation slides={slides} />
}
