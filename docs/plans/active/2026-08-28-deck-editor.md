---
title: Deck editor with randomize shuffle
status: active
created: 2026-08-28
updated: 2026-08-31
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

The current visual concept is a blown-up counterpart to one explorer row: the exact public deck number spans the upper portion of the viewport and one deck is spread across the lower portion. Reordering cards updates the number continuously. This visitor-facing mode is provisionally called **Arrange**; **Deck Editor** remains the feature/architecture name until navigation and outside feedback establish better product language.

The same visual vocabulary should eventually support the talk and How-page examples: concrete cards moving through factoradic and architecture walkthroughs rather than separate abstract diagrams. That reuse is a requirement to consider when selecting a motion library, not a reason to introduce one before the editor interaction is validated.

# Dependencies

- Decisions 0003 (factoradic), 0004 (canonical order), 0005 (sequential IDs), 0006 (randomize with visible shuffle).
- The pure random-index domain module specified by decision 0006: uniform draw over `0..52!-1` via `crypto.getRandomValues` with rejection sampling, injectable entropy for tests.
- Routing/navigation from the Why page and explainer plans.
- The explorer-first home layout plan (`completed/2026-08-30-explorer-first-home.md`) and the Solid 2.0 RC upgrade (`completed/2026-08-30-solid-2-rc-upgrade.md`) land first. The former moves the explorer onto `/` with pinned controls, so the editor's navigation entry point and any shared explorer chrome must be built against the new layout; the latter means editor UI code targets Solid 2.0 APIs.

# Proposed Changes

- Domain: add `randomPermutationIndex` (or equivalent) — a pure function of an injected byte source, with rejection sampling against `52!` and no modulo bias; exported alongside a production adapter using `crypto.getRandomValues`.
- UI: a single-deck editor view showing all 52 cards in order with drag-to-reorder (pointer-based; keyboard-accessible reordering is a requirement, not a stretch goal), the live public deck number recomputed via `rankPermutation`, and a shareable URL carrying the number.
- UI: the randomize button triggers the shuffle animation from current ordering to the drawn target, then settles and reveals/updates the deck number. Animation honors `prefers-reduced-motion` (instant transition) and is cancellable by any visitor interaction.
- The animation's intermediate states may be synthesized by the rendering layer (e.g. positional easing between current and target arrangements); the domain guarantees only the endpoint. No fake numbers are ever displayed.

## First Slice: Layout And Bijection Prototype

Build an isolated `/arrange` route containing:

- The canonical 52-card deck in local UI state, rendered as a large spread across the lower portion of the viewport.
- Its exact one-based public deck number, derived synchronously with `rankPermutation`, across the upper portion.
- A dependency-free select-then-insert interaction: select one card, then select an insertion position. This must work with pointer, keyboard, and touch activation.
- A reset-to-canonical control and focused unit/UI tests for reorder-to-number behavior.

This slice intentionally excludes drag-and-drop, shuffle/randomize UI, motion, URL persistence, and navigation polish. Its purpose is to answer the riskiest visual and interaction questions cheaply: whether 52 manipulable cards can be presented legibly on desktop and mobile, whether the number/card hierarchy feels right, and whether live ranking feels immediate.

After reviewing this slice, evaluate the Solid DnD library linked by the Solid ecosystem against a minimal pointer implementation. Separately evaluate motion libraries against both card-reordering needs and talk-diagram needs. Record bundle cost, reduced-motion support, interruption semantics, Solid 2 compatibility, and measured frame behavior before adopting either dependency. Drag-and-drop and motion are separate choices; one library need not solve both.

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

- [x] Implement and test the pure random-index module per decision 0006 (`src/domain/random.ts`; verification will be rerun with the completed plan).
- [x] Build the `/arrange` layout-and-bijection prototype without new dependencies; human visual review remains the next gate.
- [x] Decide whether the visual hierarchy and responsive composition warrant continuing; human review accepted the prototype on 2026-08-31.
- [x] Evaluate drag-and-drop approaches after the prototype, including keyboard/touch behavior and Solid 2 compatibility.
- [ ] Evaluate motion approaches separately for editor and talk/explainer reuse.
- [x] Build the editor view with mouse/pen drag, touch long-press drag, keyboard/touch select-then-insert reordering, and a live deck number.
- [ ] Define and implement the shareable deck-number URL format with strict validation.
- [x] Build the shuffle animation with reduced-motion and cancellation behavior.
- [ ] Cross-link editor, explainer, and `/why`.
- [ ] Run all quality gates and record evidence.

# Decisions Made

- Randomize draws a uniform target index and animates toward it; recorded as decision 0006 before implementation began.
- 2026-08-31: Use **Arrange** as the provisional visitor-facing label and retain **Deck Editor** as the internal feature name.
- 2026-08-31: Validate layout, responsive legibility, and live ranking with dependency-free select-then-insert before choosing drag-and-drop or motion libraries.
- 2026-08-31: The prototype preserves a large card size on narrow screens using a horizontally pannable spread rather than compressing all 52 faces into the viewport. This is a candidate interaction to review, not a durable mobile-design decision.
- 2026-08-31: Reject `@thisbeyond/solid-dnd` 0.7.5. Its last npm release was 2023-11-17, its peer range is Solid `^1.5`, its sortable preset supports only vertical lists, and its repository has an open maintenance-status issue. The editor uses a focused Pointer Events implementation instead of overriding an incompatible peer dependency.
- 2026-08-31: Mouse and pen dragging reorder and rerank live as the card crosses positions. Touch retains tap-to-move and horizontal deck panning alongside the long-press drag arbitration described below.
- 2026-08-31: Match the explorer and physical new-deck convention: canonical position zero is the rightmost, topmost card; later positions step left underneath it.
- 2026-08-31: During drag, the card remains horizontally inserted at its current live-sorted position rather than following the pointer as a free overlay. It keeps its insertion position's normal stack order and lifts 1.6rem so the exposed portion visibly protrudes from the deck.
- 2026-08-31: Use the baseline Web Animations API for the first shuffle rather than adding a motion dependency. The editor needs one keyed FLIP-style transition; cards animate from captured old slots to the committed uniformly drawn target, intermediate geometry displays `Shuffling...` instead of a deck number, and the exact target number appears on settlement.
- 2026-08-31: Shuffle motion lasts 760ms with small deterministic per-card lift, rotation, and delay variations. Stable card IDs split the deck exactly in half: IDs 0-25 arc upward and IDs 26-51 arc downward, independent of their current ordering. The downward arc stays within the deck's existing lower clearance rather than shifting the resting deck upward. Reset, a new shuffle, card interaction, or component disposal cancels active animations; reduced motion commits and reveals the target immediately.
- 2026-08-31: Touch uses gesture arbitration on the card surface: a stationary 420ms press activates live drag with a best-effort 12ms Vibration API cue, movement beyond 8px before activation pans the horizontal spread, and a tap keeps select-then-insert behavior. Unsupported haptic environments silently continue. The editor owns these touch gestures with `touch-action: none`; manual panning currently has no momentum and remains part of the deferred mobile refinement.

# Deviations

- 2026-08-30: Sequenced behind the explorer-first home layout and Solid 2.0 RC plans. The former makes `/` the explorer and removes the footer; the editor's entry point and shared chrome will be designed against that layout rather than the current masthead/footer/`/explore` structure.
- 2026-08-31: The random-index module and tests are already present on updated `main`; the first implementation task is therefore the isolated interaction prototype.

# Verification Evidence

- `vp check`: all 108 files formatted; no warnings or lint errors in 51 files.
- `pnpm typecheck`: clean.
- `vp test run`: 13 files and 156 tests passing, including pure reorder/coordinate and 26-up/26-down shuffle behavior, Arrange UI ranking/reset behavior, and exact reduced-motion shuffle settlement.
- `vp build`: client and server bundles built successfully.
- `pnpm test:e2e`: 27 Chromium tests passing, including mouse and touch live-drag reranking, pre-long-press touch panning, rightmost/topmost canonical card presentation, exact animated shuffle settlement, Reset cancellation, reduced motion, and a 390px viewport check for contained horizontal overflow and 104px cards.

# Outcome

Pending.

# Related Commits

Pending.
