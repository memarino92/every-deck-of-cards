---
title: Permutation domain
status: active
created: 2026-08-28
updated: 2026-08-28
owners:
  - human
  - opencode
---

# Goal

Define the canonical 52-card deck and implement a pure, reversible mapping between every valid zero-based permutation index and exactly one deck ordering.

# Non-Goals

- Worker transport and batching.
- Virtual scrolling and rendering full deck ribbons.
- Curated favorite decks beyond proving arbitrary decks can be ranked.
- A drag-to-reorder deck editor with live number updates.
- Selecting a production batching strategy.

# Context

Public deck numbers will range from `1` through `52!`; domain indices range from `0n` through `52! - 1n`. Direct factoradic ranking and unranking make any permutation independently addressable without enumeration.

# Dependencies

- The bounded pure `factorial` function.
- TypeScript 7 and native `bigint`.

# Proposed Changes

- Publish canonical rank, suit, card ID, and deck definitions.
- Add public-number/index conversion with strict bounds.
- Add generic lexicographic rank and unrank functions for collections up to 52 unique items.
- Link the application shell to the public source repository.
- Compare array selection with an order-statistic Fenwick tree in reproducible benchmarks.

# Test Plan

- Verify the canonical deck contract and card metadata.
- Verify known complete mappings for a three-item collection.
- Exhaustively rank and unrank every permutation for collection sizes zero through eight.
- Exercise representative boundaries and deterministic large indices at 52 cards.
- Reject duplicate canonical values, malformed permutations, and out-of-range indices.
- Verify one-based public conversion boundaries.

# Benchmark Plan

- Benchmark array-splice and Fenwick-tree unranking at representative first, middle, and last 52-card indices.
- Keep benchmark candidates outside production domain modules.
- Test candidate equivalence before comparing timings.
- Make no performance claim until results are recorded with environment and methodology.

# Security Considerations

- Accept no external data without domain validation.
- Do not introduce runtime dependencies or environment variables.
- Keep all arithmetic local and deterministic.

# Documentation Changes

- Record canonical ordering as a compatibility contract.
- Record factoradic lexicographic mapping and alternatives.
- Document verification and benchmark commands in this plan.

# Tasks

- [x] Fast-forward `main` and create the feature branch.
- [x] Archive the verified foundation plan.
- [x] Add canonical cards and public index conversions.
- [x] Add reversible rank and unrank functions.
- [x] Add exhaustive and representative 52-card tests.
- [x] Add verified benchmark candidates and benchmark entry points.
- [x] Link the application to its public source.
- [x] Run all quality gates and record outcomes.

# Decisions Made

- Assign stable card IDs in suit-major order, but use the project's adopted USPCC-style new-deck order as the canonical permutation sequence under decision 0004.
- Define deck `1` as the canonical ordering and deck `52!` as its lexicographic reverse.
- Start with array-splice unranking in production because it is the smallest auditable implementation; benchmark the Fenwick alternative before making speed claims.
- Precompute and freeze factorials from `0!` through `52!`; repeated multiplication obscured selection costs and is unnecessary for immutable domain constants.
- Use SameValueZero-compatible matching for the generic permutation API so `NaN`, signed zero, and duplicate validation use one equality relation.
- Retain the shrinking-array implementation after three standalone benchmark processes ran the mixed corpus in both registration orders and found no stable material Fenwick advantage. Treat simplicity as the primary reason and the timings as order-sensitive observational evidence.

# Deviations

- The initial benchmark used only three fixed indices and a Fenwick prototype with repeated setup work. Review prompted linear tree initialization, cached search state, observable result consumption, a deterministic 64-index corpus, explicit timing options, and 52-card candidate equivalence tests before recording results.
- Runtime validation was strengthened after review to reject coerced card IDs and to freeze exported rank and suit contracts.
- Production launch work superseded the original canonical sequence before public deck-number links shipped. Card IDs remain stable, while deck `1` now follows the project's adopted USPCC-style new-deck order as recorded in decision 0004.

# Verification Evidence

- `pnpm.cmd install --frozen-lockfile`: passed after pulling merged dependency updates.
- `pnpm.cmd format:check`: passed.
- `pnpm.cmd lint`: passed with 196 rules, zero warnings, and zero errors.
- `pnpm.cmd typecheck`: passed with TypeScript 7.0.2.
- `pnpm.cmd test`: passed 58 tests across five files.
- Exhaustive production and candidate checks covered every permutation from zero through eight values; 52-card checks covered boundaries and deterministic samples.
- `pnpm.cmd bench`: passed in three standalone processes with both mixed-corpus task orders; results and limitations are recorded in `docs/benchmarks/permutation-selection.md`.
- `pnpm.cmd build`: passed; production JavaScript is 4.62 kB gzip before the explorer UI is introduced.
- `pnpm.cmd audit --audit-level high`: found no known vulnerabilities.
- Domain, performance, and security subagent reviews completed; all correctness findings were addressed and no security findings remained.
- This evidence predates the canonical-order change. Replacement domain and full-suite verification is recorded in the production launch plan.

# Outcome

The branch now defines and verifies the canonical card contract, one-based public deck numbers, zero-based `bigint` indices, and reversible factoradic ranking. The simpler shrinking-array implementation remains in production; the independently tested Fenwick candidate and transparent benchmark evidence remain available for future browser and worker comparisons. The public site links to its GitHub repository.

# Related Commits

Pending.
