import { Presentation, type Slide } from './presentation/Presentation.tsx'
import './presentation/styles.css'
import { stepSlide } from './presentation/slide.ts'
import { historySlides } from './presentation/HistorySlides.tsx'
import { PermutationCards } from './presentation/PermutationCards.tsx'
import { AlgorithmWalkthrough } from './presentation/debugger/AlgorithmWalkthrough.tsx'
import {
  FOUR_CARDS,
  rankWalk,
  unrankWalk,
} from './presentation/debugger/frames.ts'

import { DECK_COUNT } from './domain/deck-number.ts'
import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'
import { PermutationTable } from './examples/PermutationTable.tsx'
import { exampleTitle } from './examples/walkthrough.ts'

const atomsComparison = compareDeckCountToAtomsOnEarth()

export function TalkPage() {
  const debuggerSlides = [
    unrankWalk(0n),
    unrankWalk(14n),
    rankWalk(FOUR_CARDS.toReversed()),
  ].map((walk) =>
    stepSlide({
      id: walk.mode === 'unrank' ? `deal-index-${walk.index}` : 'rank-cards',
      title:
        walk.mode === 'unrank'
          ? `Deal index ${walk.index}`
          : 'Read the cards. Find the index.',
      steps: walk.frames,
      render: (frame) => <AlgorithmWalkthrough walk={walk} frame={frame()} />,
    }),
  )

  const slides: Slide[] = [
    ...historySlides,
    {
      id: 'two-cards',
      title: exampleTitle(2),
      body: () => (
        <div class="talk-permutations">
          <div>
            <p>Every shuffle of two cards fits in one table.</p>
            <PermutationTable size={2} />
          </div>
          <PermutationCards size={2} />
        </div>
      ),
    },
    {
      id: 'three-cards',
      title: exampleTitle(3),
      body: () => (
        <div class="talk-permutations">
          <div>
            <p>
              Three choices for the first card, two for the next: all six
              orderings.
            </p>
            <PermutationTable size={3} />
          </div>
          <PermutationCards size={3} />
        </div>
      ),
    },
    ...debuggerSlides,
    {
      id: 'fifty-two-cards',
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
