# Project Instructions

## Product

`everydeckof.cards` is a client-only SolidJS application that addresses every permutation of a standard 52-card deck. It is also executable technical documentation suitable for a conference talk.

## Invariants

- Domain modules are pure TypeScript and do not import Solid or browser APIs.
- Internal permutation indices are zero-based `bigint` values.
- Public deck numbers are one-based values from `1` through `52!`.
- Canonical card ordering is a published compatibility contract once defined.
- Never represent a permutation index with JavaScript `number`.
- Rendering, worker transport, virtualization, and domain logic have explicit boundaries.
- The production application remains client rendered and deployable as static assets.

## Workflow

- Use pnpm and preserve `pnpm-lock.yaml`.
- Inspect the worktree before editing; do not overwrite unrelated changes.
- Create or update a plan under `docs/plans/active/` for substantial work.
- Record discoveries, decisions, deviations, and verification while work proceeds.
- Move verified plans to `docs/plans/completed/`; never delete completed plans.
- Add or update a decision record for durable architectural choices.
- Add tests with behavior. Add reproducible benchmarks before performance claims.
- Run focused checks during development and all quality gates before proposing a commit.
- Do not commit, amend, push, or deploy unless the user explicitly requests it.

## Git

- Use Conventional Commits: `<type>(<scope>): <imperative description>`.
- Keep commits cohesive and stage only intended files.
- Before committing, inspect `git status`, the complete diff, and recent history.
- Never use destructive Git commands to discard work without explicit approval.
- Never force-push.

## Security

- Never place credentials in source, examples, fixtures, plans, logs, or documentation.
- Treat every `VITE_*` environment variable as public.
- Keep deployment credentials outside the repository.
- Do not add remote scripts, analytics, or third-party assets without a security and privacy review.

## Verification

Run before a commit:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

On Windows where PowerShell blocks package-manager shims, use `pnpm.cmd`.
