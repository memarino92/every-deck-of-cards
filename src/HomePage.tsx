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
          The explorer is live: <a href="/explore">scroll every deck</a>, or
          jump straight to any one of them by number. Curious how that's
          possible? <a href="/why">Read why this exists</a>.
        </p>
      </div>
    </section>
  )
}
