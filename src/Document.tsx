import type { ParentProps } from 'solid-js'

/**
 * The document shell for vite-plugin start mode (client posture). The plugin
 * prerenders this once into dist/client/index.html and injects the hashed
 * entry script and CSS links into <head>. The <head> below is a verbatim port
 * of the retired hand-authored index.html: charset, viewport, description,
 * robots, theme-color, canonical, favicon, Open Graph, Twitter, and title.
 */
export default function Document(props: ParentProps) {
  return (
    <html lang="en" prefix="og: https://ogp.me/ns#">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Every possible 52-card deck has an exact number. Explore the mathematics behind 52! shuffles and find any one without enumerating the rest."
        />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#0d3326" />
        <link rel="canonical" href="https://everydeckof.cards/" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Every Deck of Cards" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:url" content="https://everydeckof.cards/" />
        <meta
          property="og:title"
          content="Every Deck of Cards | 52 Cards. 80 Unvigintillion Possibilities."
        />
        <meta
          property="og:description"
          content="52 cards. 80 unvigintillion possibilities. Every possible deck has an exact number."
        />
        <meta
          property="og:image"
          content="https://everydeckof.cards/social-card.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Every Deck of Cards title and the tagline 52 cards. 80 unvigintillion possibilities. beside a fan of playing cards led by an ace of spades and the number 52 factorial on a deep green background."
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Every Deck of Cards | 52 Cards. 80 Unvigintillion Possibilities."
        />
        <meta
          name="twitter:description"
          content="52 cards. 80 unvigintillion possibilities. Every possible deck has an exact number."
        />
        <meta
          name="twitter:image"
          content="https://everydeckof.cards/social-card.png"
        />
        <meta
          name="twitter:image:alt"
          content="Every Deck of Cards title and the tagline 52 cards. 80 unvigintillion possibilities. beside a fan of playing cards led by an ace of spades and the number 52 factorial on a deep green background."
        />

        <title>
          Every Deck of Cards | 52 Cards. 80 Unvigintillion Possibilities.
        </title>
      </head>
      <body>{props.children}</body>
    </html>
  )
}
