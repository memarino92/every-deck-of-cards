---
title: Deck editor with randomize shuffle
status: active
created: 2026-08-28
updated: 2026-08-28
owners:
  - human
  - opencode
---

# Goal

Let a visitor arrange a deck by drag and drop, watch its exact public deck number update live, and — the headline interaction — hit **randomize** to watch a visual shuffle travel from the current deck to a uniformly random one, settling on its exact, shareable deck number.

# Non-Goals

- The virtualized 52! explorer feed; the editor manipulates one deck at a time.
- Favorites, sharing UI polish, or social previews of specific deck numbers (link format is defined here; preview generation is separate).
- Physical-shuffle simulation as the randomization mechanism (see decision 0006 alternatives).

# Context

This is the "down the road" editor the README has promised, now including the randomize-with-visual-shuffle requirement captured in decision 0006. It depends on the domain being final — which is why the sequential card-ID realignment (decision 0005) lands first: the editor displays card IDs as canonical positions, and the explainer (factoradic explainer plan) uses the same symbols.

The randomize action must honor the site's premise: the animation travels to a _drawn_ index, so any of the 52! decks can be its endpoint, and the settled deck is always a real, reproducible number.

# Dependencies

- Decisions 0003 (factoradic), 0004 (canonical order), 0005 (sequential IDs), 0006 (randomize with visible shuffle).
- The pure random-index domain module specified by decision 0006: uniform draw over `0..52!-1` via `crypto.getRandomValues` with rejection sampling, injectable entropy for tests.
- Routing/navigation from the Why page and explainer plans.

# Proposed Changes

- Domain: add `randomPermutationIndex` (or equivalent) — a pure function of an injected byte source, with rejection sampling against `52!` and no modulo bias; exported alongside a production adapter using `crypto.getRandomValues`.
- UI: a single-deck editor view showing all 52 cards in order with drag-to-reorder (pointer-based; keyboard-accessible reordering is a requirement, not a stretch goal), the live public deck number recomputed via `rankPermutation`, and a shareable URL carrying the number.
- UI: the randomize button triggers the shuffle animation from current ordering to the drawn target, then settles and reveals/updates the deck number. Animation honors `prefers-reduced-motion` (instant transition) and is cancellable by any visitor interaction.
- The animation's intermediate states may be synthesized by the rendering layer (e.g. positional easing between current and target arrangements); the domain guarantees only the endpoint. No fake numbers are ever displayed.

# Test Plan

- Domain: rejection sampling rejects out-of-range draws; injected-entropy tests cover boundaries (index 0, 52!-1, first rejected byte sequence); distribution sanity check over a fixed seeded corpus documented as observational, not a proof.
- Domain: ranking a random target deck always round-trips to the drawn index.
- UI: drag reorder updates the deck number exactly as `rankPermutation` dictates; keyboard reorder produces identical results; randomize settles on the number of the drawn index; reduced-motion path renders the target immediately; mid-animation interaction cancels deterministically.

# Benchmark Plan

- The editor ranks one permutation per interaction — no throughput claim. If the shuffle animation requests intermediate unrankings at frame rate, record a reproducible measurement of unrank cost at 52 cards and cite the existing `docs/benchmarks/permutation-selection.md` methodology; otherwise no new benchmark.

# Security Considerations

- `crypto.getRandomValues` is the only entropy source; no `Math.random` in the draw path.
- The deck-number URL parameter is untrusted input on load: strict domain validation (bigint parse, bounds check) before any render.
- No dependencies for drag interaction without recording justification.

# Documentation Changes

- README Future Interaction section updated to describe the shipped editor and randomize.
- Decision 0006 evidence section completed.
- The editor links to the factoradic explainer for "why is this number exact?"

# Tasks

- [ ] Implement and test the pure random-index module per decision 0006.
- [ ] Build the editor view with drag and keyboard reordering and live deck number.
- [ ] Define and implement the shareable deck-number URL format with strict validation.
- [ ] Build the shuffle animation with reduced-motion and cancellation behavior.
- [ ] Cross-link editor, explainer, and `/why`.
- [ ] Run all quality gates and record evidence.

# Decisions Made

- Randomize draws a uniform target index and animates toward it; recorded as decision 0006 before implementation began.

# Deviations

None yet.

# Verification Evidence

Pending.

# Outcome

Pending.

# Related Commits

Pending.
