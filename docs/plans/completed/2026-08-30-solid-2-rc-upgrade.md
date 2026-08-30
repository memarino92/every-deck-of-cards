---
title: Upgrade to Solid 2.0 RC
status: completed
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Move the app from the Solid 1.x line to the Solid 2.0 release candidate line, landing green on all quality gates with no behavior change.

# Non-Goals

- The Vite+ toolchain migration (separate plan: `2026-08-30-vite-plus-migration.md`).
- Any UI, routing, or copy changes.

# Context

- Solid 2.0 RC is published on the npm `next` dist-tag: `solid-js@2.0.0-rc.4`, `@solidjs/router@2.0.0-next.19`, `vite-plugin-solid@3.0.0-next.27`, `@solidjs/testing-library@1.0.0-beta.2`. The project currently pins `solid-js 1.9.15`, `@solidjs/router 1.0.0`, `vite-plugin-solid 2.11.14`, `@solidjs/testing-library 0.8.10`.
- The plan's "expected API churn is low" assumption held for core reactivity but not elsewhere. Actual API churn found during execution:
  - `solid-js` 2.0 splits the DOM renderer into `@solidjs/web` (pinned `2.0.0-rc.4`); `solid-js/web`, `solid-js/jsx-runtime`, and `solid-js`-exported `JSX` types are gone. `jsxImportSource` moves to `@solidjs/web`.
  - `onMount` → `onSettled` (cleanup returned from the callback); `on(...)` → two-arg `createEffect(compute, apply)`; `Index` → `<For keyed={false}>`; `classList` → `class` object/array form. Source: the `CHEATSHEET.md` shipped in `solid-js@2.0.0-rc.4`.
  - `@solidjs/router` 2.0 is a ground-up rewrite: `createRouter({ routes })` config object replaces `<Router>`/`<Route>` components, plain `<a>` replaces `<A>` (active state via `data-active`/`aria-current` attributes), `memoryHistory(url)` replaces `<MemoryRouter>`/`createMemoryHistory`. Source: router README's "Migration from 0.x".
- Riding a pre-release line is a policy choice; recorded as decision 0010.

# Dependencies

None beyond the npm `next` dist-tags above. Other plans (explorer redesign, editor) build on this once landed but do not block it.

# Proposed Changes

- `package.json`: bump the four Solid packages to the RC line, pinned exactly while pre-release.
- Fix any compile/test fallout from removed or changed APIs.
- No source changes beyond what the upgrade requires.

# Test Plan

- Existing unit and e2e suites pass unchanged — they are the regression net.
- `pnpm dev` smoke check that the explorer, `/why`, `/how`, and `/talk` render.

# Benchmark Plan

None — no performance claim is made.

# Security Considerations

- Pre-release line: pin exact versions (no `^` range while RC), review release notes for advisory flags, and expect to bump RC revisions until GA per decision 0010.
- Lockfile updated via pnpm; one new runtime dependency (`@solidjs/web`), the renderer half of the split `solid-js` package — not a third-party addition.

# Documentation Changes

- Decision 0010 (Solid 2.0 RC adoption and RC-tracking policy).
- AGENTS.md "Language and Toolchain" if the Solid version is stated there after the upgrade.

# Tasks

- [x] Bump the four Solid packages to the pinned RC versions.
- [x] Resolve compile/lint/test fallout.
- [x] Run all quality gates plus `pnpm test:e2e`; record evidence.
- [x] Mark decision 0010 accepted.

# Decisions Made

- Ships independently on its own branch/PR; not bundled with the Vite+ migration or any UI work.

# Deviations

- **`vite-plugin-solid` renamed to `@solidjs/vite-plugin`.** The `3.0.0-next.27` release under the old name is the final one and only re-exports the new package; decision 0010's RC-tracking policy is impossible under a name that receives no new versions. Pinned `@solidjs/vite-plugin@3.0.0-next.35` (the `next` dist-tag); imports in `vite.config.ts`/`vitest.config.ts` updated. (`3.0.0-next.36` exists on npm but is not the tagged `next`.)
- **`@solidjs/web` added as a direct dependency.** The router, testing library, and vite plugin all peer-require it; Solid 2.0 splits the renderer out of `solid-js`.
- **Vitest config restructured into two projects.** The plugin derives framework export conditions per project from `test.environment`; the previous global `node` environment + jsdom docblock made every test resolve `@solidjs/web`'s server build ("Client-only API called on the server side" in `PlayingCard.tsx`). Now: `client` project (jsdom, `src/**/*.test.tsx`) and `node` project (node, domain/benchmark tests), per the plugin's documented testing setup. The per-file jsdom docblock was removed as redundant.
- **Nav active-state styling selector changed** (`.site-nav a.active` → `.site-nav a[data-active]`): the new router marks plain anchors with attributes instead of classes. Same semantics (root matches exactly, others prefix).
- **`ExplorerPage` initial `deck` param read wrapped in `untrack`.** It was always a one-time seed read; 2.0 warns on untracked top-level reactive reads in component bodies.

# Verification Evidence

- `pnpm format:check` — clean (Prettier re-flowed one edited line in `UnrankStepper.tsx`).
- `pnpm lint` — 0 warnings, 0 errors (43 files).
- `pnpm typecheck` — clean.
- `pnpm test` — 12 files, 131 tests passed (11 node-project files + `ExplorerPage.ui.test.tsx` on the client project; the two initial-load regression tests pass against the new router/mount path).
- `pnpm build` — clean (`tsc --noEmit && vite build`, 84 modules).
- `pnpm test:e2e` — 5/5 passed (37s), including the end-of-space scroll round trip. First run failed because Playwright's `reuseExistingServer` attached to a stale pre-upgrade dev server on :5173; after killing it the suite ran against a fresh server and passed.
- `pnpm dev` smoke check via a Playwright probe: `/`, `/explore`, `/why`, `/how`, `/talk` all render expected content with no page errors.
- Observed, not blocking: dev-mode `[HUGE_FAN_OUT]` diagnostic ("Signal has 2000 subscribers") from the explorer's 24×52 card fan. Pre-existing render shape (the `rows()` memo re-keys the `For` on every batch, as in 1.x), no behavior or test impact; revisit during the explorer rework.
- Observed, not blocking: the client bundle now carries router server-function chunks (`serverForms`, `decode`, ~12 kB gzip combined). No performance claim either way.

# Outcome

Implemented and verified on branch `chore/solid-2-rc-upgrade`.

- All four packages ride the RC line, pinned exactly: `solid-js@2.0.0-rc.4`,
  `@solidjs/router@2.0.0-next.19`, `@solidjs/testing-library@1.0.0-beta.2`,
  `@solidjs/vite-plugin@3.0.0-next.35` (renamed package; see Deviations), plus
  the new renderer dependency `@solidjs/web@2.0.0-rc.4`.
- Source migrated to 2.0 APIs: router config object (`createRouter`) with
  plain `<a>` links, split `createEffect(compute, apply)`, `onSettled`
  lifecycle, `<For keyed={false}>`, `class` object/array form,
  `jsxImportSource: @solidjs/web`. No behavior change; the unchanged unit and
  e2e suites are the evidence.
- Vitest runs as two projects (`client` jsdom / `node`) per the plugin's
  per-project export-condition model.
- Decision 0010 marked accepted. Start-mode adoption (`index.html` deletion)
  was deliberately scoped out and folded into the Vite+ migration plan.

# Related Commits

On branch `chore/solid-2-rc-upgrade`: the upgrade commit (`chore(solid)`)
carrying package pins, lockfile, configs, and the source migration; the plan
amendment for the Vite+ start-mode fold-in rides the same branch as a separate
`docs(plans)` commit.
