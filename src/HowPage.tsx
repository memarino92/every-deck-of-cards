import { DECK_COUNT } from './domain/deck-number.ts'
import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'
import { PermutationTable } from './examples/PermutationTable.tsx'
import { PermutationCards } from './presentation/PermutationCards.tsx'
import { AutoplayAlgorithmWalkthrough } from './presentation/debugger/AutoplayAlgorithmWalkthrough.tsx'
import {
  FOUR_CARDS,
  rankWalk,
  unrankWalk,
} from './presentation/debugger/frames.ts'
import './how.css'

const atomsComparison = compareDeckCountToAtomsOnEarth()
const deckCountText = DECK_COUNT.toLocaleString('en-US')
const indexFourteenWalk = unrankWalk(14n)
const reverseWalk = rankWalk(FOUR_CARDS.toReversed())

export function HowPage() {
  return (
    <article class="article-layout how-page" aria-labelledby="how-title">
      <p class="eyebrow">How it works</p>
      <h1 id="how-title" class="article-title">
        Every number, one exact shuffle
      </h1>

      <section aria-labelledby="how-idea">
        <h2 id="how-idea">The idea</h2>
        <p>
          Every ordering of a deck gets exactly one number, and every number
          gives back exactly one ordering — no list, no storage, just a
          reversible recipe. The recipe is the{' '}
          <strong>factorial number system</strong>: an index tells you which
          card to pick next from a shrinking pool, one digit at a time. Let's
          build it up with decks small enough to see whole. The examples use
          zero-based indices, so the first ordering is index 0.
        </p>
      </section>

      <section aria-labelledby="how-one">
        <h2 id="how-one">1 card, 1 ordering</h2>
        <p>
          With one card, there is nothing to choose. There is one possible
          ordering, so index 0 can only mean the card already in our pool.
        </p>
        <div class="how-permutations">
          <PermutationTable size={1} />
          <PermutationCards size={1} />
        </div>
      </section>

      <section aria-labelledby="how-two">
        <h2 id="how-two">2 cards, 2 orderings</h2>
        <p>
          Add a second card and there are two choices for the first position.
          Index 0 takes the first card from the pool; index 1 takes the second.
          The unchosen card is the only one left to follow it.
        </p>
        <div class="how-permutations">
          <PermutationTable size={2} />
          <PermutationCards size={2} />
        </div>
      </section>

      <section aria-labelledby="how-three">
        <h2 id="how-three">3 cards, 6 orderings</h2>
        <p>
          Three choices for the first card and two for the next make six
          orderings. They fall into three blocks of two: indices 0–1 start with
          card 0, 2–3 with card 1, and 4–5 with card 2. That block structure is
          what lets division find any ordering directly.
        </p>
        <div class="how-permutations">
          <PermutationTable size={3} />
          <PermutationCards size={3} />
        </div>
      </section>

      <section class="how-algorithm" aria-labelledby="how-index-fourteen">
        <h2 id="how-index-fourteen">Deal index 14</h2>
        <p>
          Four cards make 24 orderings. To deal index 14, divide by the next
          factorial place value, use the quotient to pick from the remaining
          pool, and carry the remainder forward. The same operation repeats
          until every card has moved into the result.
        </p>
        <AutoplayAlgorithmWalkthrough walk={indexFourteenWalk} />
      </section>

      <section class="how-algorithm" aria-labelledby="how-reverse">
        <h2 id="how-reverse">Reverse the recipe</h2>
        <p>
          Start with the four cards reversed — 4, 3, 2, A — and the calculation
          runs the other way. Each card's position in the remaining canonical
          pool tells us how many blocks came before it. Add those blocks and we
          recover index 23, the final four-card ordering.
        </p>
        <AutoplayAlgorithmWalkthrough walk={reverseWalk} />
      </section>

      <section aria-labelledby="how-fiftytwo">
        <h2 id="how-fiftytwo">Then 52 cards</h2>
        <p>
          The same recipe, 52 picks, {deckCountText} possible orderings. The
          table can never exist — there are about{' '}
          {atomsComparison.timesLarger.toLocaleString('en-US')} decks for every
          atom on Earth — but the recipe doesn't care. Any number from 1 to 52!
          deals its exact deck in 52 steps, and any deck hands its number back.
          That's the whole trick: nothing is stored, everything is computable,
          and every shareable link is just a number waiting for the recipe.
        </p>
        <p class="construction">
          Presenting this material? <a href="/talk">Open talk mode</a> — the
          same walkthrough, full-screen, one idea per screen.
        </p>
      </section>
    </article>
  )
}
