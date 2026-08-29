import { compareDeckCountToAtomsOnEarth } from './domain/magnitude.ts'

const comparison = compareDeckCountToAtomsOnEarth()
const timesLarger = comparison.timesLarger.toLocaleString('en-US')

export function WhyPage() {
  return (
    <article class="why" aria-labelledby="why-title">
      <p class="eyebrow">Wait, how does this work?</p>
      <h1 id="why-title" class="why-title">
        Why does this exist?
      </h1>

      <section aria-labelledby="why-challenge">
        <h2 id="why-challenge">An interesting technical challenge</h2>
        <p>
          This project is inspired by playful attempts to make impossibly large
          spaces feel explorable, like{' '}
          <a href="https://everyuuid.com/" rel="noreferrer">
            Every UUID
          </a>{' '}
          and{' '}
          <a href="https://everycube.alen.is/" rel="noreferrer">
            Every Rubik's Cube
          </a>
          . The immediate sense of "wait, how does this work?" gnaws at me.
        </p>
        <p>
          Obviously it's impossible to compute every deck ahead of time. But
          let's sit with that for a second — why is it obvious? Because of just
          how large 52! really is: it dwarfs the estimated number of atoms on
          Earth. Take that as a thought experiment. If one shuffled deck were
          represented by one atom, we'd run out of atoms on Earth long before we
          ran out of decks — roughly {timesLarger} decks for every single atom —
          with nothing left over to build the Earth, the people, or the
          computers meant to store the data.
        </p>
        <p>
          So instead of storing the decks, we assign each one a number. The
          mapping has to be deterministic and reversible, so that you can share
          a link to one specific shuffle out of all 52! and anyone can recover
          exactly that deck.
        </p>
      </section>

      <section aria-labelledby="why-rendering">
        <h2 id="why-rendering">Rendering is its own challenge</h2>
        <p>
          You can't keep every deck in memory, for obvious reasons, so decks
          have to be generated on demand, at a very high rate, and rendered only
          as needed — a technique called virtualization. The mathematics, the
          workers, and the scrolling machinery are all part of the exhibit.
        </p>
      </section>

      <section aria-labelledby="why-personal">
        <h2 id="why-personal">And honestly?</h2>
        <p>
          It's the kind of thing you can show off, write conference talks about,
          or just use as motivation to actually ship something and see it
          through. It's a chance to explore a space other than what I do in my
          day job. It seemed like fun. Also, I have a thing for cards.
        </p>
        <figure class="card-spring">
          <img
            src="/card-spring.jpg"
            alt="The author performing a card spring for his senior photos, circa 2009."
            width="320"
            height="400"
          />
          <figcaption>circa 2009</figcaption>
        </figure>
        <p>But mostly, just to prove that I could.</p>
      </section>
    </article>
  )
}
