---
title: Benchmark the deck-card hover animation
status: active
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Answer with data: does the `.deck-card` mouseover lift animation measurably cost scroll/frame performance in the explorer? Keep it or remove it based on a reproducible A/B benchmark — no claim either way without numbers.

# Non-Goals

- Redesigning the explorer's scroll model or layout (separate plans); this benchmark runs against the explorer as it exists when the plan starts.
- Optimizing anything else the benchmark happens to reveal; new findings get their own plans.

# Context

- `.deck-card` carries `transition: transform 140ms ease, box-shadow 140ms ease` and a `:hover` rule that lifts the card and adds a shadow. The explorer renders up to 24 rows × 52 cards ≈ 1,248 card nodes, each hoverable.
- The interaction value is low (decorative lift on a non-interactive card), so if a measurable cost exists, removal is the likely outcome — but per repo policy, performance claims require a reproducible benchmark with documented methodology first.
- Accessibility note: the cards are not interactive elements (no focus, no click), so removing a hover-only effect has no keyboard/AT impact.

# Dependencies

None. Independent of the toolchain and redesign plans, though whichever explorer rework lands first changes the file this benchmark measures.

# Proposed Changes

1. **Benchmark first, on the unmodified explorer.** A Playwright-driven scripted scroll (fixed input: wheel/scrollbar script, fixed viewport, warmed worker) with frame-time and long-task collection, run A/B:
   - A: current CSS.
   - B: identical build with the `.deck-card` transition and `:hover` rules removed (build-time CSS flag or a query-param-gated class — not a hand edit between runs).
2. Methodology documented under `docs/benchmarks/` (input script, collection method, hardware, run count, variance).
3. Decision on the numbers: if B shows a real improvement, remove the animation in the same PR; if not, keep it and record the null result so the question stays answered.

# Test Plan

- If removed: existing unit + e2e suites still pass (no behavior depends on the hover effect); visual spot-check of the fan.
- If kept: no code change; the benchmark doc is the deliverable.

# Benchmark Plan

The benchmark **is** the deliverable: `docs/benchmarks/explorer-hover-animation.md` with methodology and results, plus the harness under `benchmarks/` or `e2e/` so it is reproducible.

# Security Considerations

None — local measurement only; no new runtime dependencies.

# Documentation Changes

- New `docs/benchmarks/explorer-hover-animation.md`.
- If removed, note it in the benchmark doc's outcome section.

# Tasks

- [ ] Build the A/B scroll harness with frame-time/long-task capture.
- [ ] Run both variants; record methodology and results.
- [ ] Keep or remove per the data; update the benchmark doc with the outcome.
- [ ] Run quality gates (plus e2e if removed) and record evidence.

# Decisions Made

- The hover effect's fate is decided by measurement, not preference.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
