---
title: Migrate to Vite+ and replace Prettier with Oxfmt
status: active
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Adopt the Vite+ unified toolchain (the `vp` CLI) for dev/build/check/test, and replace Prettier with Oxfmt — with the reformat landed as its own format-only commit.

# Non-Goals

- The Solid 2.0 RC upgrade (separate plan: `2026-08-30-solid-2-rc-upgrade.md`). Either can land first; whichever lands second rebases.
- Any application behavior change.
- Adopting `vp env` runtime/package-manager management — keep the pinned `packageManager` pnpm field unless a recorded decision says otherwise.

# Context

- Vite+ (VoidZero, beta) unifies Vite, Rolldown, Vitest, Oxlint, Oxfmt, tsgo, and Vite Task behind the `vp` CLI: `vp dev`, `vp build`, `vp check` (format + lint + type-check), `vp test`. This project already uses Vite 8, Vitest 4, and Oxlint, so the migration consolidates existing tools rather than adding new ones; the one real swap is Prettier → Oxfmt (`oxfmt@0.65.0`, advertised as Prettier-compatible).
- Migration path: install `vp` per the official docs, run `vp migrate` against the existing Vite project (or hand-edit: scripts to `vp` commands, `vite.config.ts` stays the config entry), then delete `prettier`, `prettier.config.js`, and `.prettierignore`.
- Durable toolchain choice; recorded as decision 0011.

# Dependencies

- Vite+ beta CLI availability on Windows (PowerShell installer) and in CI (`setup-vp` action or equivalent pinned install).

# Proposed Changes

- `package.json` scripts: `dev`/`build`/`test`/`check` mapped to the Vite+ equivalents; `format`/`format:check` pointed at oxfmt (directly or via `vp check`); drop the `prettier` devDependency; add whatever `vp` expects locally.
- Delete `prettier.config.js` and `.prettierignore`; add oxfmt config only if defaults diverge from current style.
- One format-only commit reformatting the repo with oxfmt, verified semantically empty by the full test suite and a build.
- CI workflow updated to the Vite+ flow; `pnpm-lock.yaml` preserved (keep pnpm as the package manager).

# Test Plan

- After migration: `vp check`, `vp test`, `vp build` all pass.
- Format-only commit: full unit suite + `pnpm test:e2e` pass, proving the reformat changed no behavior.
- Confirm oxfmt output diff versus Prettier is cosmetic-only (spot-check the reformatted files).

# Benchmark Plan

None required. If a build-speed claim is made later (Vite+ advertises large speedups), it gets its own documented measurement.

# Security Considerations

- The `vp` installer is a remote shell script (`irm https://vite.plus/ps1 | iex` on Windows): install once per official docs, never commit it, and keep CI installs pinned.
- Oxfmt reformat: verify no semantic change via the full suite before merging the format-only commit.
- Vite+ is beta: pin versions, recorded in decision 0011.

# Documentation Changes

- `AGENTS.md` and `CONTRIBUTING.md`: verification commands move from `pnpm format:check` / `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` to the adopted `vp`/`pnpm` split; note the oxfmt formatter.
- Decision 0011.
- `.github` workflow docs if CI steps change shape.

# Tasks

- [ ] Install `vp`; run `vp migrate` or hand-migrate scripts and config.
- [ ] Remove Prettier (dependency, config, ignore file); wire oxfmt.
- [ ] Format-only commit; verify suite + e2e green.
- [ ] Update CI, AGENTS.md, CONTRIBUTING.md.
- [ ] Mark decision 0011 accepted; run all quality gates and record evidence.

# Decisions Made

- Ships independently on its own branch/PR. The reformat is a separate commit from the tooling change so behavior diffs stay reviewable.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
