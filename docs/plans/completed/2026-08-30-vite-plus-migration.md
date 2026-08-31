---
title: Migrate to Vite+, adopt vite-plugin start mode, and replace Prettier with Oxfmt
status: completed
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Adopt the Vite+ unified toolchain (the `vp` CLI) for dev/build/check/test, replace Prettier with Oxfmt — with the reformat landed as its own format-only commit — and adopt `@solidjs/vite-plugin` start mode so the plugin owns the document shell and entries (`index.html` is deleted).

# Non-Goals

- The Solid 2.0 RC upgrade (completed plan: `docs/plans/completed/2026-08-30-solid-2-rc-upgrade.md`). That plan is now a hard predecessor: start mode requires `@solidjs/vite-plugin` 3.x and the `@solidjs/web` split it introduces.
- Any application behavior change.
- SSR start mode (`ssr: true`). The project invariant is client-rendered static assets; start mode is adopted in client posture only.
- Adopting `vp env` runtime/package-manager management — keep the pinned `packageManager` pnpm field unless a recorded decision says otherwise.
- Start-mode extras we do not need: `env` schema virtual modules, server functions, middleware, devtools toolbar.

# Context

- Vite+ (VoidZero, beta) unifies Vite, Rolldown, Vitest, Oxlint, Oxfmt, tsgo, and Vite Task behind the `vp` CLI: `vp dev`, `vp build`, `vp check` (format + lint + type-check), `vp test`. This project already uses Vite 8, Vitest 4, and Oxlint, so the migration consolidates existing tools rather than adding new ones; the one real swap is Prettier → Oxfmt (`oxfmt@0.65.0`, advertised as Prettier-compatible).
- Migration path: install `vp` per the official docs, run `vp migrate` against the existing Vite project (or hand-edit: scripts to `vp` commands, `vite.config.ts` stays the config entry), then delete `prettier`, `prettier.config.js`, and `.prettierignore`.
- Start mode (`solid({ start: true })`, client posture) makes the plugin own entries, dev serving, and the build — no entry files, no `index.html`, no dev server script. The document shell comes from `src/Document.tsx` (ours must be custom: the hand-authored `<head>` carries OG/Twitter meta, canonical, favicon, and theme-color), and an authored `src/entry-client.tsx` stands alone and owns the mount (today's `src/main.tsx`, renamed).
- Start mode changes the build layout: `vite build` emits a purely static `dist/client` with the shell prerendered into `dist/client/index.html`. `wrangler.jsonc` currently serves `./dist` and moves to `./dist/client`; `not_found_handling: single-page-application` already matches the plugin's history-fallback behavior in dev/preview.
- Client start mode is marked experimental by the plugin. That is accepted risk, recorded in decision 0011, with the same mitigation as the rest of the pre-release stack: exact pins plus the full gate suite.
- Folding start mode into this plan (rather than its own) avoids two successive rewrites of the serving/build layer (`vite.config.ts`, `wrangler.jsonc`, docs) and re-verifies the site once.
- Durable toolchain choices; recorded as decision 0011.

# Dependencies

- The Solid 2.0 RC upgrade landed (plugin 3.x, `@solidjs/web`).
- Vite+ beta CLI availability on Windows (PowerShell installer) and in CI (`setup-vp` action or equivalent pinned install).

# Proposed Changes

- `package.json` scripts: `dev`/`build`/`test`/`check` mapped to the Vite+ equivalents; `format`/`format:check` pointed at oxfmt (directly or via `vp check`); drop the `prettier` devDependency; add whatever `vp` expects locally.
- Delete `prettier.config.js` and `.prettierignore`; add oxfmt config only if defaults diverge from current style.
- One format-only commit reformatting the repo with oxfmt, verified semantically empty by the full test suite and a build.
- Start mode, as one behavior-preserving commit separate from the format-only commit:
  - `vite.config.ts`: `solid({ start: true })` (no `ssr`).
  - New `src/Document.tsx`: port the current `index.html` `<head>` exactly (charset, viewport, description, robots, theme-color, canonical, favicon, OG, Twitter, title) and render the full `<html>` document.
  - `src/main.tsx` → `src/entry-client.tsx` (authored entry owns the mount; the generated error-boundary codegen does not apply to authored entries).
  - Delete `index.html`.
  - `wrangler.jsonc`: `assets.directory` → `./dist/client`.
- CI workflow updated to the Vite+ flow; `pnpm-lock.yaml` preserved (keep pnpm as the package manager).

# Test Plan

- After migration: `vp check`, `vp test`, `vp build` all pass.
- Format-only commit: full unit suite + `pnpm test:e2e` pass, proving the reformat changed no behavior.
- Confirm oxfmt output diff versus Prettier is cosmetic-only (spot-check the reformatted files).
- Start-mode commit:
  - Full gate suite plus `pnpm test:e2e` (the explorer is the heavy page).
  - Inspect `dist/client`: prerendered `index.html` contains the full ported `<head>`; `favicon.svg` and `social-card.png` land from `public/`; hashed entry and CSS links resolve.
  - `vite preview` (or the Vite+ equivalent): `/`, `/explore`, `/why`, `/how`, `/talk`, and a deep-link reload all serve and render.
  - `wrangler deploy --dry-run` (or `wrangler dev`) against `dist/client` to catch asset-directory misconfiguration before a real deploy.

# Benchmark Plan

None required. If a build-speed claim is made later (Vite+ advertises large speedups), it gets its own documented measurement.

# Security Considerations

- The `vp` installer is a remote shell script (`irm https://vite.plus/ps1 | iex` on Windows): install once per official docs, never commit it, and keep CI installs pinned.
- Oxfmt reformat: verify no semantic change via the full suite before merging the format-only commit.
- Vite+ is beta and client start mode is experimental: pin versions, recorded in decision 0011.
- Start mode adds no remote scripts or third-party assets; the document shell is generated from our own `Document.tsx`. Ensure no stray `env.ts` appears at the project root — start mode probes for it automatically.
- No new runtime dependencies expected from start mode itself.

# Documentation Changes

- `AGENTS.md` and `CONTRIBUTING.md`: verification commands move from `pnpm format:check` / `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` to the adopted `vp`/`pnpm` split; note the oxfmt formatter; note that `index.html` is gone and the document shell lives in `src/Document.tsx`.
- Decision 0011 (covers both the toolchain consolidation and start-mode adoption).
- `.github` workflow docs if CI steps change shape.

# Tasks

- [x] Install `vp`; run `vp migrate` or hand-migrate scripts and config.
- [x] Remove Prettier (dependency, config, ignore file); wire oxfmt.
- [x] Format-only commit; verify suite + e2e green. (Became a no-op — see Deviations.)
- [x] Adopt start mode: `Document.tsx`, `entry-client.tsx`, `solid({ start: true })`, delete `index.html`, `wrangler.jsonc` → `dist/client`; verify per the test plan.
- [x] Update CI, AGENTS.md, CONTRIBUTING.md.
- [x] Mark decision 0011 accepted; run all quality gates and record evidence.

# Decisions Made

- Ships independently on its own branch/PR. The reformat is a separate commit from the tooling change so behavior diffs stay reviewable. (In practice the reformat produced no source diff; see Deviations.)
- Start mode is adopted in client posture only, preserving the client-rendered static-assets invariant; it lands as its own commit, separate from both the tooling swap and the format-only commit.

# Deviations

- Scope grew: start-mode adoption folded in after the Solid 2.0 RC upgrade introduced `@solidjs/vite-plugin` 3.x (the rename made start mode the maintained path for document/entry ownership). Recorded here and in decision 0011.
- **No separate format-only commit.** Oxfmt's effective default `printWidth` is 80, identical to the retired Prettier config (`semi: false`, `singleQuote: true`, width 80). The repo-wide reformat therefore produced zero source diff beyond the `vitest` → `vite-plus/test` import rewrites and a single union-type wrap in `batch.test.ts`, both of which rode along in the tooling commit. A standalone format-only commit would have been empty, so the two-commit plan collapsed to tooling + start-mode.
- **`typeAware`/`typeCheck` lint options dropped.** `vp migrate` enabled oxlint's type-aware checking, which flagged ~40 pre-existing patterns (intentional test-boundary assertions such as `as unknown as bigint`; `process.env` in `playwright.config.ts`). To keep the migration behavior-preserving, these were removed so `vp check` matches the prior oxlint strictness. Adopting type-aware linting is a separate future decision.
- **`lazyPlugins` not used.** The migrator wrapped plugins in `lazyPlugins`, but its `PluginOption[] | undefined` type fails `tsc --noEmit` under `exactOptionalPropertyTypes`. Plain `plugins: [...]` is used instead; `vp check` passes either way.
- **`fmt.ignorePatterns` restored.** A re-run of `vp migrate` reset the ignore globs to `[]`; they were restored to the former `.prettierignore` contents, and `.prettierignore` was deleted (Oxfmt reads ignores from `fmt.ignorePatterns`).
- **Dev-only `/__health` endpoint added.** Start mode's dev history fallback only answers HTML-accepting GETs; Playwright's `webServer` readiness probe sends no `Accept` header and would 404/time out. The probe now targets a plain-200 `/__health` endpoint (`playwright.config.ts`); browser tests still exercise real routes.

# Verification Evidence

- Tooling commit `e7455b9`: `vp check` (fmt + lint) pass, `vp test run` 131/131, `vp build` ok, `pnpm test:e2e` 5/5 — on the exact staged tree.
- Start-mode commit `fb9683a`: `vp check`, `tsc --noEmit`, `vp test run` 131/131, `vp build` (emits `dist/client` with prerendered `index.html` carrying the full ported `<head>`; `favicon.svg` and `social-card.png` land from `public/`; hashed entry JS/CSS resolve), `pnpm test:e2e` 5/5.
- `vp dev` serves `/`, `/explore`, `/why`, `/how`, `/talk` (200 with the shell for HTML-accepting GETs) and `/__health` (200 without an `Accept` header).
- `vp preview` serves all routes from `dist/client` with history fallback; entry JS, CSS, favicon, and social-card all return 200.
- `wrangler deploy --dry-run` reads 14 files from `dist/client`.
- CI: `.github/workflows/ci.yml` installs Vite+ via `voidzero-dev/setup-vp` (pinned SHA, vite-plus 0.3.0 auto-detected from the pnpm catalog) with `node-manager: false` (keeps runner Node 24); gates run `vp check`, `pnpm typecheck`, `vp test run`, `vp build`, plus `pnpm test:e2e`.

# Outcome

Vite+ (vp 0.3.0) is the unified toolchain for dev/build/check/test; Prettier is replaced by Oxfmt; and `@solidjs/vite-plugin` start mode (client posture) owns the document shell (`src/Document.tsx`) and authored client entry (`src/entry-client.tsx`), with `index.html` deleted and the build emitting `dist/client`. The site remains client-rendered static assets. Decision 0011 accepted. All quality gates and the e2e suite pass; wrangler dry-run confirms the asset directory.

# Related Commits

- `e7455b9` build(tooling): migrate to the Vite+ unified toolchain
- `fb9683a` feat(build): adopt vite-plugin start mode (client posture)
