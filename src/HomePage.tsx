import { factorial } from './domain/factorial.ts'
import { ExplorerPage } from './ExplorerPage.tsx'

const deckCount = factorial(52).toLocaleString('en-US')

export function HomePage() {
  return (
    <div class="home-page">
      <section class="hero home-hero" aria-labelledby="hero-title">
        <p class="eyebrow">52 cards. 80 unvigintillion possibilities.</p>
        <h1 id="hero-title">
          Every deck
          <span>of cards.</span>
        </h1>
        <p>
          Every possible ordering of a standard 52-card deck, addressed by
          number. Scroll to start exploring.
        </p>
        <p class="count" aria-label={`${deckCount} possible decks`}>
          {deckCount}
        </p>
      </section>

      <ExplorerPage />
    </div>
  )
}
