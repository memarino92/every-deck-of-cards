---
title: Reconcile documentation after Arrange ships
status: completed
created: 2026-09-01
updated: 2026-09-01
owners:
  - human
  - opencode
---

# Goal

Bring repository documentation, plans, and decisions in line with the shipped Arrange experience and preserve accurate architectural boundaries and verification evidence.

# Non-Goals

- Changing Arrange's shipped interaction design.
- Completing the remaining `/why`, explorer-refinement, favorites, or full-talk work.
- Introducing drag-and-drop or motion dependencies.

# Context

Arrange shipped through merged revision `701ced3`, but the README still described it as future work, the execution plan remained active, and existing architecture records did not capture the complete interaction model. The audit also found the production Web Crypto adapter inside `src/domain/`, contrary to the repository's pure-domain invariant.

# Proposed Changes

- Document shipped routes, interaction behavior, URL semantics, browser APIs, and known refinements.
- Complete the Arrange execution plan and add a durable interaction decision.
- Update related explorer, shuffle, contributor, and future-work records.
- Move Web Crypto access to a narrow platform adapter without changing random-selection behavior.
- Add direct browser coverage for keyboard reordering.

# Test Plan

- Run all repository quality gates and the Playwright suite.
- Search for stale active-plan links and future-tense Arrange descriptions.
- Independently review the documentation against production code.

# Security Considerations

- No credentials, remote scripts, analytics, runtime assets, or dependencies are added.
- Web Crypto remains the production entropy source and is now isolated from domain logic.

# Tasks

- [x] Audit documentation against merged Arrange behavior.
- [x] Correct the browser-platform/domain boundary.
- [x] Update README, architecture, plans, contributor guidance, and decisions.
- [x] Add keyboard-only Arrange browser coverage.
- [x] Complete an independent consistency review.
- [x] Run all quality gates.

# Decisions Made

- Preserve feature-completion verification as historical evidence tied to revision `701ced3`; record the later keyboard test separately rather than rewriting the original 28-test result.
- Describe random-index selection as platform-independent and injected-entropy rather than referentially pure.
- Keep the bounded `/why` copy plan separate from full-talk motion evaluation.

# Deviations

- The audit required a small source-boundary correction and regression test in addition to prose changes. Runtime behavior is unchanged.
- On Windows, PowerShell blocked the `pnpm` script shim; the documented `pnpm.cmd` fallback ran successfully.

# Verification Evidence

- `vp check`: all 112 files formatted; no warnings or lint errors in 52 files.
- `pnpm.cmd typecheck`: clean.
- `vp test run`: 13 files and 157 tests passing.
- `vp build`: client and server bundles built successfully.
- `pnpm.cmd test:e2e`: 29 Chromium tests passing, including keyboard-only Arrange reordering.
- Independent documentation review: no blocking findings; precision findings resolved before verification.

# Outcome

The repository now describes Arrange as shipped, records its durable interaction and motion boundary, closes its implementation plan, preserves remaining work in focused active plans, and keeps browser entropy outside the pure domain layer.

# Related Commits

- This plan is completed by the documentation reconciliation commit that contains it.
