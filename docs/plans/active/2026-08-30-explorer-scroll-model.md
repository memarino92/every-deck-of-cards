---
title: Explorer page-scroll model and fling-scroll fix
status: active
created: 2026-08-30
updated: 2026-08-30
owners:
  - human
  - opencode
---

# Goal

Replace the explorer's nested scroll pane with whole-page scrolling and eliminate the fling-scroll wall, so a fast fling — or grabbing the scrollbar and cranking it to the end — never stalls beyond what the worker data path allows.

# Non-Goals

- Moving the explorer to `/` and the chrome redesign (separate plan: `2026-08-30-explorer-first-home.md`) — the scroll model is correct wherever the explorer lives; the two plans are independent and whichever lands second rebases.
- Domain changes: permutation math, worker batching, and the `?deck=` contract are unchanged (decision 0007 stands except for its scroll container choice, superseded by decision 0009).

# Context

- Today `.explorer-scroll` is a nested `overflow-y: auto` pane holding `PHYSICAL_ROWS = 24` rows. Every scroll event recenters a `bigint` anchor and shifts `scrollTop` to compensate. A fast fling recenters many times per gesture, each recenter waiting on a worker round-trip, so the feed fills with "Shuffling…" and the gesture hits a wall.
- The nested pane also produces the "window in a window" feel: the page itself never scrolls.
- Reference implementation — everyuuid.com (bundle inspected 2026-08-30): virtualization over `2^122` UUIDs driven by a **`bigint` virtual position held in state**; a **custom scrollbar rail maps percent-of-space to position**, which is why grabbing the scrollbar and cranking it end-to-end works smoothly; programmatic jumps (search/random) **interpolate the virtual position with `requestAnimationFrame` over ~300 ms** rather than trusting native smooth scroll over an impossible scroll height. No virtualization library.
- The choice between (a) virtual position + custom rail and (b) native page scroll + recentering window is governed by decision 0009 and made with a reproducible comparison during this plan.
- Emergent scroll behavior is verified end-to-end per decision 0008 — Playwright is the oracle; no pure-TypeScript scroll simulation.

# Dependencies

- Decision 0009 (proposed) — accepted as part of this plan once the approach comparison is done.

# Proposed Changes

- Prototype both approaches from decision 0009 far enough to compare fling behavior and scrollbar-grab behavior; record the measurements and pick one.
- Implement the winner: the deck feed becomes page content scrolled by the document (or a full-viewport scroller that is the page), with the anchor/virtual-position model keeping exact `bigint` addressability.
- Animated navigation for Jump/Random/Go-to-start/end: rAF interpolation of position landing exactly on the requested deck; `prefers-reduced-motion` jumps instantly; any new interaction cancels a running animation deterministically.
- Data-path tuning as needed (window size, overscan, prefetch ahead of fling velocity) so the worker pipeline is the only real limit.

# Test Plan

- Pure window/position math stays unit-tested (`src/virtualization/`), extended for whatever model wins.
- Playwright: scripted fling (mouse wheel / CDP input) asserting the anchor keeps up and rows resolve; scrollbar-drag-to-end asserting the last deck is reachable; existing end-of-space specs keep passing; animated-jump specs cover exact landing, reduced-motion instant path, and mid-animation cancellation.

# Benchmark Plan

- Before/after capture of the same fling input: "Shuffling…" dwell time and anchor lag. The e2e assertions are the hard gate; the capture documents the improvement claim per repo policy.

# Security Considerations

- No new runtime dependencies; custom scrollbar work stays dependency-free unless a decision record justifies otherwise.

# Documentation Changes

- Decision 0009 marked accepted with the comparison evidence attached; decision 0007's annotation already points to 0009.
- `docs/architecture.md` if the virtualization boundary description changes.

# Tasks

- [ ] Prototype and compare both scroll models; record measurements in decision 0009.
- [ ] Implement the chosen model with page-level scroll.
- [ ] Implement rAF animated navigation with reduced-motion and cancellation.
- [ ] Tune overscan/prefetch against fling input.
- [ ] Playwright fling and scrollbar-drag specs; keep existing scroll specs green.
- [ ] Run all quality gates plus `pnpm test:e2e`; record evidence.

# Decisions Made

- The Every UUID model (virtual position + percent-mapped custom rail + rAF jump interpolation) is the reference; the final choice between it and native page scroll happens here with data, per decision 0009.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
