---
title: Explorer scroll and responsive experience refinement
status: active
created: 2026-08-31
updated: 2026-09-05
owners:
  - human
  - opencode
---

# Goal

Revisit the explorer's responsive card presentation, perceived navigation through the early deck numbers, momentum behavior, and transition from the home hero after outside design feedback has been gathered.

# Non-Goals

- Immediate implementation of the broader visual and navigation experiments; sequencing will follow outside design feedback and current product priorities.
- Changing permutation indexing or the exact relationship between a deck number and its ordering.
- Committing to the explorer remaining on the home page. Returning it to a separate page remains an option.

# Context

The explorer-first home and virtual-position scroll model are accurate and provide exact end-to-end navigation, but the current experience has several unresolved issues:

- On narrow/mobile screens, 52 cards are compressed enough that their faces and pips cannot be read.
- Touch dragging originally had no momentum. The independently selected momentum slice completed on 2026-09-05; the remaining bullets are unresolved.
- A linear mapping from physical movement to the full `52!` space moves through early deck numbers almost immediately. A small wheel input near the top can land on an extremely deep deck number. This is mathematically proportional but does not let visitors feel the smaller numbers first.
- The transition from the hero into the explorer interaction feels clunky on one continuous page.
- The current visual direction should be tested with outside opinions and may benefit from professional design input.

# Dependencies

- Completed explorer scroll-model and explorer-first-home plans.
- Outside usability/design feedback before selecting a larger redesign.

The touch-momentum task is now an independently selected implementation slice;
it does not depend on the larger visual and navigation experiments.

# Proposed Changes

- Explore responsive card treatments that preserve recognizable cards rather than uniformly shrinking all 52 faces. Candidates may include stronger overlap, a focused-card treatment, horizontal interaction, or a deliberately different mobile composition.
- Add touch momentum/inertial continuation to the virtual-position input model, with deterministic cancellation and bounds behavior.
- Derive release velocity from a short window of recent touch samples, then
  apply bounded, time-based exponential decay through `requestAnimationFrame`.
  New direct input cancels momentum, bounds stop it, and reduced motion keeps
  touch movement one-to-one.
- Prototype a nonlinear movement curve that allocates substantially more physical distance to early deck numbers while preserving exact direct navigation and access to the full range. Compare this against linear movement rather than assuming logarithmic mapping is the right curve.
- Compare the current hero-to-feed transition with a separate explorer route and with lighter-weight seams on the home page. Preserve the ability to revert the explorer-first-home decision.
- Gather outside feedback before committing to one composition.

# Test Plan

- Use Playwright on representative mobile and desktop viewports for all scrolling, momentum, and responsive behavior.
- Assert exact start/end reachability, cancellation, wheel/keyboard/touch behavior, and URL synchronization under any nonlinear mapping.
- Include reduced-motion behavior for any animated transition or momentum effect.
- Conduct qualitative checks that card identity remains legible at target viewport widths; do not treat screenshot dimensions alone as usability evidence.

# Benchmark Plan

- Record a reproducible browser trace before making responsiveness or input-latency claims.
- Keep rendering and worker measurements separate from qualitative design evaluation.

# Security Considerations

- Do not add remote design assets, analytics, or feedback tooling without a separate security and privacy review.

# Documentation Changes

- Update decision 0009 when virtual-position input behavior or mapping changes.
- Supersede or amend decision 0012 if the explorer returns to a separate route.

# Tasks

- [ ] Gather and summarize outside design/usability feedback.
- [ ] Prototype and compare legible mobile deck treatments.
- [x] Implement and verify touch momentum.
- [ ] Prototype linear and nonlinear early-range movement curves.
- [ ] Compare one-page and separate-route hero/explorer compositions.
- [ ] Record resulting durable decisions before implementation.

# Decisions Made

- Touch momentum is selected independently of the deferred responsive and
  navigation experiments. It remains in the explorer input boundary and does
  not alter exact `bigint` position math or worker transport.

# Deviations

- Touch momentum proceeded before outside design feedback because it is an
  isolated input refinement that does not select a larger visual direction.

# Verification Evidence

- `vp check`: all 113 files formatted; no lint warnings or errors.
- `pnpm typecheck`: clean.
- `vp test run`: 157 tests passed across 13 files.
- `vp build`: client and server bundles built successfully.
- `pnpm test:e2e`: 35 Chromium tests passed, including six dedicated momentum
  cases for post-release continuation, direct-input cancellation, sparse event
  cadence, reduced motion, and both finite boundaries.
- Performance-focused review found no remaining unbounded queue, DOM growth,
  requestAnimationFrame cancellation, or unsupported performance-claim issue.

# Outcome

The touch-momentum slice is complete. Single-touch flicks now continue through
the existing exact virtual-position path with bounded exponential decay. New
input cancels momentum, reduced motion remains one-to-one, and start/end clamps
remain exact. Responsive presentation, early-range mapping, and composition
work remain active in this plan.

# Related Commits

Pending.
