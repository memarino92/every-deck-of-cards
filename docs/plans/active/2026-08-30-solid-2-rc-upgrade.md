---
title: Upgrade to Solid 2.0 RC
status: active
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
- The codebase is small and uses mainstream primitives (`createSignal`, `createMemo`, `createEffect`/`on`, `For`, `Show`, `onMount`/`onCleanup`, router `Route`/`Router`/`A`/`useSearchParams`), so expected API churn is low — but 2.0 removes deprecated 1.x APIs, so typecheck and the full suite are the verification net.
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
- Lockfile updated via pnpm; no new dependencies expected.

# Documentation Changes

- Decision 0010 (Solid 2.0 RC adoption and RC-tracking policy).
- AGENTS.md "Language and Toolchain" if the Solid version is stated there after the upgrade.

# Tasks

- [ ] Bump the four Solid packages to the pinned RC versions.
- [ ] Resolve compile/lint/test fallout.
- [ ] Run all quality gates plus `pnpm test:e2e`; record evidence.
- [ ] Mark decision 0010 accepted.

# Decisions Made

- Ships independently on its own branch/PR; not bundled with the Vite+ migration or any UI work.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
