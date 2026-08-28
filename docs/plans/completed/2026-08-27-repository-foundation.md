---
title: Repository foundation
status: completed
created: 2026-08-27
updated: 2026-08-27
owners:
  - human
  - opencode
---

# Goal

Create the first verified commit for a secure, public, client-only SolidJS project with durable engineering records and a minimal real domain test.

# Non-Goals

- Implement permutation ranking or unranking.
- Implement workers, virtualization, favorites, charts, or talk mode.
- Configure production credentials or perform a deployment.

# Context

The repository began with no commits and one empty untracked `README.md`. Product and architecture planning established pnpm, MIT, one-based public deck numbers, shareable query parameters, static Cloudflare hosting, repository-native documentation, and explicit OpenCode practices.

# Dependencies

- Node.js 24 or newer
- pnpm 10.15.0
- Current compatible SolidJS, Vite, TypeScript, Vitest, Oxlint, Prettier, and Wrangler releases

# Proposed Changes

- Add the Solid/Vite application shell and strict TypeScript configuration.
- Add a pure factorial function and exact tests, including `52!`.
- Add formatting, linting, type checking, testing, and build scripts.
- Add Cloudflare static asset configuration and security headers.
- Add CI, dependency updates, ignore rules, license, security, and contribution guidance.
- Add architecture, decision, execution-plan, and OpenCode conventions.

# Test Plan

- Verify factorial identities and input validation in Vitest.
- Run formatting, linting, type checking, tests, and a production build.

# Benchmark Plan

No performance implementation is selected in this foundation. Benchmark tooling begins with permutation algorithm work.

# Security Considerations

- Ignore all local environment and Cloudflare credential files.
- Keep the browser free of secrets.
- Use minimal CI permissions and immutable action references.
- Add restrictive static response headers.

# Documentation Changes

Create the README, architecture overview, first decision, project instructions, and plan lifecycle documentation.

# Tasks

- [x] Create repository governance and OpenCode files.
- [x] Create the application and factorial domain seam.
- [x] Configure quality gates, CI, and Cloudflare static assets.
- [x] Install locked dependencies.
- [x] Run all verification.
- [x] Review and create the first conventional commit.

# Decisions Made

- Use the Windows `pnpm.cmd` executable locally because machine policy blocks the PowerShell shim.
- Target Node.js 24 in CI rather than the local non-LTS Node.js 26 runtime.
- Keep Conventional Commits documented without adding commit-hook dependencies in the initial commit.
- Use TypeScript 7.0.2 as an explicit product requirement.
- Use Oxlint's native TypeScript parser instead of routing TypeScript 7 through TypeScript ESLint's unsupported parser. Retain `eslint-plugin-solid` through Oxlint's JS plugin compatibility layer so Solid reactivity rules remain enforced.
- Keep ESLint only as `eslint-plugin-solid`'s compatibility runtime; Oxlint remains the linter and TypeScript parser. Retain the narrow TypeScript peer exception for the plugin's utility dependency until it declares TypeScript 7 support.
- Match `@types/node` to the Node.js 24 CI runtime rather than exposing Node.js 26 APIs to configuration code.
- Configure pnpm through `pnpm-workspace.yaml` and allow dependency lifecycle scripts only for Vite's `esbuild` binary and Wrangler's `workerd` binary.
- Normalize repository text to LF through `.gitattributes` on every development platform.
- Ask before unmatched OpenCode shell commands, explicitly allow routine project checks, and deny known destructive Git forms. Alternate command forms therefore cannot silently bypass commit, push, or deploy confirmation.
- Limit the initial factorial API to the supported card-count domain, 0 through 52, so a safe but impractically large integer cannot block the calling thread.

# Deviations

- The OpenCode executable is not exposed to the PowerShell tool environment, so `opencode debug config` cannot validate the project config during this session. The configuration uses only fields confirmed against the published schema and must be runtime-checked after OpenCode restarts.
- The initial ESLint configuration was replaced with Oxlint after TypeScript 7 became a requirement. Oxlint's JavaScript plugin compatibility is currently alpha, so the pinned Solid rules are verified directly in CI.

# Verification Evidence

- `pnpm.cmd install --frozen-lockfile`: passed with the committed lockfile.
- `pnpm.cmd format:check`: passed.
- `pnpm.cmd lint`: passed with 196 Oxlint and Solid rules, zero warnings and zero errors.
- `pnpm.cmd typecheck`: passed with TypeScript 7.0.2.
- `pnpm.cmd test`: passed 11 factorial tests.
- `pnpm.cmd build`: passed; the initial JavaScript bundle is 4.55 kB gzip.
- `pnpm.cmd audit --audit-level high`: found no known vulnerabilities after the final toolchain adjustment.
- `pnpm.cmd exec wrangler deploy --dry-run`: read the built static assets, found no bindings, and exited without deployment.

# Outcome

The project foundation is implemented, verified, committed, and published in the public GitHub repository.

# Related Commits

- `0e46493` `chore(repo): establish project foundation`
