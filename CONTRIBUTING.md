# Contributing

## Setup

Use Node.js 24 or newer and the pnpm version declared in `package.json`. The
toolchain is Vite+ (the `vp` CLI); install it per https://vite.plus and ensure
it is on `PATH`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Before Submitting Changes

Run (`vp check` is Oxfmt format + Oxlint lint; `tsc --noEmit` is stricter and
stays a separate step):

```sh
vp check
pnpm typecheck
vp test run
vp build
```

The package.json equivalents (`pnpm format:check`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`) run the same tools.

If your change touches scrolling, virtualization, pointer capture, touch
gesture arbitration, native animations, reduced motion, cancellation, or
other behavior that is emergent between the browser and the app, also run the end-to-end suite
(install the browser first with `pnpm exec playwright install chromium`):

```sh
pnpm test:e2e
```

Behavior changes require tests. Performance claims require a reproducible benchmark and documented methodology. Architecture changes require an updated or new decision record.

Substantial work must have an execution plan in `docs/plans/active/`. Update it as work proceeds and move it to `docs/plans/completed/` after verification.

## Commits

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>(<optional-scope>): <imperative description>
```

Common types are `feat`, `fix`, `docs`, `test`, `bench`, `perf`, `refactor`, `build`, `ci`, and `chore`.

Keep commits cohesive. Do not mix unrelated formatting, generated benchmark noise, or local configuration into a behavior change.

## Pull Requests

- Link the relevant execution plan and decision records.
- Explain behavior and architectural consequences.
- Include verification commands and results.
- Call out security, accessibility, and performance effects.
- Never include credentials, private logs, or local machine paths.
