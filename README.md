# [everydeckof.cards](https://everydeckof.cards)

Every possible ordering of a standard 52-card deck, addressed by number.

There are exactly:

```text
80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000
```

possible orderings. This project makes any one of them directly reachable without storing or enumerating the others.

## Status

The live [Why page](https://everydeckof.cards/why) explains the premise. The [factoradic explainer](https://everydeckof.cards/how) walks the ranking algorithm with 2–5 card decks and has a full-screen [talk mode](https://everydeckof.cards/talk). The [home page explorer](https://everydeckof.cards/) scrolls the complete `52!` space as fans of real playing cards, while [Arrange](https://everydeckof.cards/arrange) edits one exact deck interactively. Next up: favorites and the full technical talk.

## Inspiration

This project is inspired by playful attempts to make impossibly large spaces feel explorable, including [Every UUID](https://everyuuid.com/) and [Every Rubik's Cube](https://everycube.alen.is/).

## Arrange

[Arrange](https://everydeckof.cards/arrange) presents one rightmost-first 52-card spread and its exact one-based deck number. Reorder cards with mouse or pen drag, a touch long press, or keyboard/tap select-then-insert; the number updates from the same reversible ranking function used by the explorer. Settled decks synchronize to the explorer-compatible `?deck=` query parameter, so links are exact and browser Back/Forward restores earlier orderings.

**Shuffle** draws an unbiased target with Web Crypto, then moves the cards to that exact permutation with the native Web Animations API. Intermediate geometry displays `Shuffling...`; reduced-motion preferences settle immediately. No drag-and-drop or motion package is required. On touch, movement before the long-press threshold pans the spread manually and a quick release continues with bounded momentum.

## Technology

- SolidJS and strict TypeScript
- `@solidjs/router` for client-side navigation between pages
- Vite+ (the `vp` CLI) unifying Vite, Vitest, Oxlint, and Oxfmt for the client-only application, Web Worker bundles, tests, and static analysis
- Web Workers, Pointer Events, Web Crypto, Web Animations, and the Vibration API for browser-native computation and interaction
- Playwright for end-to-end tests of emergent browser behavior
- Cloudflare Workers Static Assets at `everydeckof.cards` with no application Worker runtime
- pnpm for dependency management

## Development

Requirements:

- Node.js 24 or newer
- The pnpm version declared in `package.json`
- The Vite+ CLI (`vp`), installed per https://vite.plus and on `PATH`

```sh
pnpm install
pnpm dev
```

Run all current quality gates (`vp check` is Oxfmt format + Oxlint lint):

```sh
vp check
pnpm typecheck
vp test run
vp build
```

The `pnpm` package scripts (`format:check`, `lint`, `typecheck`, `test`,
`build`) invoke the same tools.

End-to-end tests run in a real browser against the dev server. They cover
behavior that is emergent between the browser and the app (for example,
scrolling the explorer to the very last deck), which unit tests cannot
reproduce faithfully. Install the browser once, then run the suite:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

`wrangler.jsonc` is the Cloudflare deployment source of truth. [Cloudflare recommends JSONC for new projects](https://developers.cloudflare.com/workers/wrangler/configuration/); it configures the production custom domain and SPA fallback without an application Worker. Run `pnpm deploy` only with an authenticated Cloudflare account that controls the `everydeckof.cards` zone.

Run reproducible development benchmarks separately from correctness gates:

```sh
pnpm bench
```

Benchmark methodology and machine-specific results live under `docs/benchmarks/`. Timings are not portable CI assertions.

On Windows systems that block PowerShell script shims, use `pnpm.cmd` instead of changing the machine execution policy.

## Documentation

- [Architecture](docs/architecture.md)
- [Architecture decisions](docs/decisions/README.md)
- [Execution plans](docs/plans/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

The deployed site exposes the premise, factoradic explainer, and current presentation material in documentation and talk modes. Repository Markdown remains the durable record of plans, decisions, architecture, and work still planned for the full technical talk.

## Secrets

The browser application requires no secrets. Values prefixed with `VITE_` are compiled into public client code and must never contain credentials. Cloudflare deployment credentials belong only in protected CI environment secrets or local ignored configuration.

## License

[MIT](LICENSE)
