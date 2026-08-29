# everydeckof.cards

Every possible ordering of a standard 52-card deck, addressed by number.

There are exactly:

```text
80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000
```

possible orderings. This project will make any one of them directly reachable without storing or enumerating the others.

## Status

The application shell, quality gates, production target, and reversible permutation indexing are in place. Next up: a [Why page](docs/plans/active/2026-08-28-why-page.md) to answer "how does this work?" while the explorers are built, an [interactive factoradic explainer](docs/plans/active/2026-08-28-factoradic-explainer.md) that walks the algorithm with 2–5 card decks, then worker computation, astronomical virtualization, favorites, the [deck editor](docs/plans/active/2026-08-28-deck-editor.md), and the public technical talk.

## Inspiration

This project is inspired by playful attempts to make impossibly large spaces feel explorable, including [Every UUID](https://everyuuid.com/) and [Every Rubik's Cube](https://everycube.alen.is/).

## Future Interaction

A later interactive mode will let visitors drag cards into any ordering and watch its exact deck number update live. A randomize action will animate a visual shuffle from the current deck to a uniformly random one, always settling on a real, shareable deck number. The editor will use the same reversible ranking function as the explorer, while remaining a separate UI milestone from the initial virtualized feed.

## Technology

- SolidJS and strict TypeScript
- Vite for the client-only application and Web Worker bundles
- Oxlint and Prettier for static analysis and formatting
- Vitest for domain tests and benchmarks
- Playwright for browser behavior and rendering performance (planned)
- Cloudflare Workers Static Assets at `everydeckof.cards` with no application Worker runtime
- pnpm for dependency management

## Development

Requirements:

- Node.js 24 or newer
- pnpm 10.15.0

```sh
pnpm install
pnpm dev
```

Run all current quality gates:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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

The deployed site will eventually expose the technical material in normal documentation and conference-talk modes. Repository Markdown remains the durable record of plans and decisions.

## Secrets

The browser application requires no secrets. Values prefixed with `VITE_` are compiled into public client code and must never contain credentials. Cloudflare deployment credentials belong only in protected CI environment secrets or local ignored configuration.

## License

[MIT](LICENSE)
