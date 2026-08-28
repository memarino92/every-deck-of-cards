# everydeckof.cards

Every possible ordering of a standard 52-card deck, addressed by number.

There are exactly:

```text
80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000
```

possible orderings. This project will make any one of them directly reachable without storing or enumerating the others.

## Status

The repository is at its foundation stage. The application shell, quality gates, project documentation, and deployment target are in place. Reversible permutation indexing, worker computation, astronomical virtualization, favorites, and the public technical talk are planned next.

## Technology

- SolidJS and strict TypeScript
- Vite for the client-only application and Web Worker bundles
- Oxlint and Prettier for static analysis and formatting
- Vitest for domain tests and benchmarks
- Playwright for browser behavior and rendering performance (planned)
- Cloudflare Workers Static Assets with no application Worker runtime
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
