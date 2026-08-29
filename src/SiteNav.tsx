import { A } from '@solidjs/router'

export function SiteNav() {
  return (
    <nav class="site-nav" aria-label="Site">
      <A href="/" end>
        Home
      </A>
      <A href="/why">Why?</A>
    </nav>
  )
}
