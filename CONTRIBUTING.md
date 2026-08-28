# Contributing

## Setup

Use Node.js 24 or newer and the pnpm version declared in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Before Submitting Changes

Run:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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
