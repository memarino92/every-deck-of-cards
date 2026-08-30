import { createSignal } from 'solid-js'

import { DECK_COUNT } from './domain/deck-number.ts'
import { factorial } from './domain/factorial.ts'
import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'
import { PermutationTable } from './PermutationTable.tsx'
import { UnrankStepper } from './UnrankStepper.tsx'

const atomsComparison = compareDeckCountToAtomsOnEarth()
const deckCountText = DECK_COUNT.toLocaleString('en-US')

export function HowPage() {
  const [fourCardIndex, setFourCardIndex] = createSignal(0n)

  return (
    <article class="why how" aria-labelledby="how-title">
      <p class="eyebrow">How it works</p>
      <h1 id="how-title" class="why-title">
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
          build it up with decks small enough to see whole.
        </p>
      </section>

      <section aria-labelledby="how-two">
        <h2 id="how-two">2 cards, {factorial(2).toString()} orderings</h2>
        <p>
          With two cards there are only two orders. Index 0 is the deck as
          dealt; index 1 swaps them. Every possible shuffle of this tiny deck
          fits in one table — and every larger deck is just this idea with more
          picks.
        </p>
        <PermutationTable size={2} />
      </section>

      <section aria-labelledby="how-three">
        <h2 id="how-three">3 cards, {factorial(3).toString()} orderings</h2>
        <p>
          Now the interesting part. The first pick splits the{' '}
          {factorial(3).toString()} orderings into 3 blocks of{' '}
          {factorial(2).toString()} — one block for each possible first card.
          Index 4 lands in the third block (4 ÷ 2 = 2), so the first card is the
          one at pool position 2: card 2. Two steps later the deck is 2 0 1.
          Watch it happen:
        </p>
        <UnrankStepper size={3} initialIndex={4n} />
      </section>

      <section aria-labelledby="how-four">
        <h2 id="how-four">4 cards, {factorial(4).toString()} orderings</h2>
        <p>
          Twenty-four orderings still fit on one screen. Click any row to replay
          exactly how its index dealt the cards.
        </p>
        <PermutationTable
          size={4}
          onSelect={(index) => setFourCardIndex(index)}
        />
        <UnrankStepper size={4} index={fourCardIndex()} />
      </section>

      <section aria-labelledby="how-five">
        <h2 id="how-five">5 cards, {factorial(5).toString()} orderings</h2>
        <p>
          A hundred and twenty rows is where printing the table stops being
          useful — and that's the point. You never need the table. Try index 73:
          the first digit is 73 ÷ 24 = 3 with remainder 1, and the recipe keeps
          going from there.
        </p>
        <UnrankStepper size={5} initialIndex={73n} />
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
