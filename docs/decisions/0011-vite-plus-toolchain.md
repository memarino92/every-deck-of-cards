# 0011: Adopt Vite+ as the unified toolchain

- Status: proposed
- Date: 2026-08-30

## Context

The project runs Vite 8, Vitest 4, Oxlint, Prettier, and TypeScript as separate tools with separate configs and CI steps. Vite+ (VoidZero, beta) unifies exactly this stack — Vite, Rolldown, Vitest, Oxlint, Oxfmt, and tsgo — behind the `vp` CLI with one config and one `vp check` pass for format + lint + type-check. The project already chose Oxlint over ESLint, so the migration mostly consolidates existing choices; the one real swap is Prettier → Oxfmt (advertised as Prettier-compatible).

## Decision

Adopt Vite+ for dev, build, check, and test. Replace Prettier with Oxfmt; delete `prettier.config.js` and `.prettierignore`. Land the repo-wide reformat as a standalone format-only commit, verified semantically empty by the full suite and a build. Keep pnpm as the package manager and the pinned `packageManager` field; do not adopt `vp env` runtime management without a later decision. Keep Playwright as the e2e runner (outside Vite+'s scope).

## Alternatives Considered

- **Stay on separate tools.** Works, but the project already picked half the Vite+ stack à la carte; consolidation reduces config surface and CI time, and the stack is maintained by the same team.
- **Oxfmt without Vite+.** Possible (oxfmt is a standalone package), but then lint/format/type-check stay three commands instead of one `vp check`.
- **Wait for Vite+ GA.** The project is pre-launch; beta risk is mitigated by pinning and by the fact that the underlying tools (Vite, Vitest, Oxlint) are the same ones already in use.

## Consequences

- Verification commands in AGENTS.md, CONTRIBUTING.md, and CI change to the adopted `vp`/`pnpm` split.
- Vite+ is beta: the `vp` CLI version is pinned, CI installs it reproducibly, and regressions can be worked around by falling back to the underlying tools' CLIs, which remain standard.
- The format-only commit touches most files; it must stay free of behavior changes and land separately from any feature work.

## Evidence

- viteplus.dev documentation inspected 2026-08-30 (commands, migration path, `vp check` scope); `oxfmt@0.65.0` on npm.
- Migration verification evidence: recorded in the plan.

## Related Material

- Plan: `docs/plans/active/2026-08-30-vite-plus-migration.md`.
