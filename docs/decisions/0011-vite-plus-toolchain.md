# 0011: Adopt Vite+ as the unified toolchain and vite-plugin start mode

- Status: accepted
- Date: 2026-08-30

## Context

The project runs Vite 8, Vitest 4, Oxlint, Prettier, and TypeScript as separate tools with separate configs and CI steps. Vite+ (VoidZero, beta) unifies exactly this stack — Vite, Rolldown, Vitest, Oxlint, Oxfmt, and tsgo — behind the `vp` CLI with one config and one `vp check` pass for format + lint + type-check. The project already chose Oxlint over ESLint, so the migration mostly consolidates existing choices; the one real swap is Prettier → Oxfmt (advertised as Prettier-compatible).

Separately, `@solidjs/vite-plugin` 3.x (adopted with the Solid 2.0 RC line, decision 0010) introduces start mode: `solid({ start: true })` makes the plugin own entries, dev serving, and the build — no entry files and no `index.html`. The document shell becomes a `src/Document.tsx` component, which is where this site's hand-authored `<head>` (OG/Twitter meta, canonical, favicon, theme-color) would live. Client-posture start mode is marked experimental by the plugin.

## Decision

Adopt Vite+ for dev, build, check, and test. Replace Prettier with Oxfmt; delete `prettier.config.js` and `.prettierignore`. Land the repo-wide reformat as a standalone format-only commit, verified semantically empty by the full suite and a build. Keep pnpm as the package manager and the pinned `packageManager` field; do not adopt `vp env` runtime management without a later decision. Keep Playwright as the e2e runner (outside Vite+'s scope).

Also adopt start mode in client posture (no `ssr`): delete `index.html`, port its `<head>` to `src/Document.tsx`, and rename `src/main.tsx` to an authored `src/entry-client.tsx` that keeps owning the mount. Update `wrangler.jsonc` to serve `./dist/client`. Do not adopt SSR start mode, server functions, or the env schema layer; the site remains client-rendered static assets.

## Alternatives Considered

- **Stay on separate tools.** Works, but the project already picked half the Vite+ stack à la carte; consolidation reduces config surface and CI time, and the stack is maintained by the same team.
- **Oxfmt without Vite+.** Possible (oxfmt is a standalone package), but then lint/format/type-check stay three commands instead of one `vp check`.
- **Wait for Vite+ GA.** The project is pre-launch; beta risk is mitigated by pinning and by the fact that the underlying tools (Vite, Vitest, Oxlint) are the same ones already in use.
- **Keep the hand-authored `index.html` (classic plugin mode).** Supported and stable, but it strands the project on the legacy integration shape while the plugin's maintained direction is start mode; migrating now, while the `<head>` and entry are small, is cheaper than after the explorer/editor work grows them. The experimental flag is accepted with the same mitigation as the rest of the pre-release stack (exact pins, full gates, e2e).
- **SSR start mode.** Rejected by the project invariant: client-rendered, static-asset deployment.

## Consequences

- Verification commands in AGENTS.md, CONTRIBUTING.md, and CI change to the adopted `vp`/`pnpm` split.
- Vite+ is beta: the `vp` CLI version is pinned, CI installs it reproducibly, and regressions can be worked around by falling back to the underlying tools' CLIs, which remain standard.
- The format-only commit touches most files; it must stay free of behavior changes and land separately from any feature work.
- `index.html` disappears as a source file; the document shell is code (`src/Document.tsx`) and the build output moves to `dist/client`, which the deploy config must match.
- Start mode is experimental in client posture: plugin RC bumps may change its behavior; the full gate suite plus e2e is the regression net on each bump.

## Evidence

- viteplus.dev documentation inspected 2026-08-30 (commands, migration path, `vp check` scope). The bundled formatter resolved to `oxfmt@0.64.0` under `vite-plus@0.3.0`, not the `0.65.0` originally noted.
- `@solidjs/vite-plugin` README inspected 2026-08-30 (start mode options, client-mode output layout, authored-entry contract).
- Migration landed and verified; evidence recorded in the plan
  (`docs/plans/completed/2026-08-30-vite-plus-migration.md`). Toolchain and
  start-mode commits: `e7455b9` (tooling), `fb9683a` (start mode).
- Notable deviations from the proposed shape, accepted here:
  - **No separate format-only commit.** Oxfmt's effective default `printWidth`
    is 80, identical to the retired Prettier config, so the repo-wide reformat
    produced zero source diff beyond the import rewrites and one union-type
    wrap that rode along in the tooling commit. A standalone format commit
    would have been empty.
  - **`typeAware`/`typeCheck` lint options dropped.** `vp migrate` enabled
    oxlint's type-aware checking, which flagged ~40 findings (intentional
    test-boundary assertions like `as unknown as bigint`, `process.env` in
    Playwright config). Removed to preserve the prior lint strictness;
    adopting type-aware linting is a separate future decision.
  - **`lazyPlugins` not used.** Its `PluginOption[] | undefined` type fails
    `tsc` under `exactOptionalPropertyTypes`; plain `plugins: [...]` is used.
  - **Dev-only `/__health` endpoint added.** Start mode's history fallback
    only answers HTML-accepting GETs, so Playwright's `webServer` readiness
    probe (no `Accept` header) 404s and times out. The probe now targets a
    plain-200 health endpoint instead.

## Related Material

- Plan: `docs/plans/completed/2026-08-30-vite-plus-migration.md`.
