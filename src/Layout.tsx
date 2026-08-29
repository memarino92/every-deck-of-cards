import type { ParentProps } from 'solid-js'

import { SiteNav } from './SiteNav.tsx'

export function Layout(props: ParentProps) {
  return (
    <main>
      <header class="masthead">
        <a class="wordmark" href="/" aria-label="Every Deck of Cards home">
          everydeckof.cards
        </a>
        <SiteNav />
        <span class="status">Foundation · 001</span>
      </header>

      {props.children}

      <footer>
        <span>52! possibilities</span>
        <a
          href="https://github.com/memarino92/every-deck-of-cards"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
      </footer>
    </main>
  )
}
