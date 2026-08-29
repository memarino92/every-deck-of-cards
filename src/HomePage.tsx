import { A } from '@solidjs/router'

import { factorial } from './domain/factorial.ts'

const deckCount = factorial(52).toLocaleString('en-US')

export function HomePage() {
  return (
    <section class="hero" aria-labelledby="hero-title">
      <p class="eyebrow">One number. One exact shuffle.</p>
      <h1 id="hero-title">
        Every deck
        <span>of cards.</span>
      </h1>
      <p class="count" aria-label={`${deckCount} possible decks`}>
        {deckCount}
      </p>
      <div class="introduction">
        <p>
          A standard deck has more possible orderings than we could ever
          enumerate. This site will make every one of them addressable.
        </p>
        <p class="construction">
          The explorer is being built in public. The reversible mathematics,
          workers, virtual scrolling, tests, and benchmarks will be part of the
          exhibit. Curious how that's possible?{' '}
          <A href="/why">Read why this exists</A>.
        </p>
      </div>
    </section>
  )
}
