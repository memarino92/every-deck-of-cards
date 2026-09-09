# 0014: Separate UI composition from feature state and browser adapters

- Status: accepted
- Date: 2026-09-07

## Context

The UI boundary audit found that Explorer and Arrange combined rendering, local state, input recognition, DOM discovery, motion, and route synchronization. The walkthrough input had conflicting owners, transport failures appeared as perpetual loading, and page-level CSS reached into shared examples. These responsibilities change independently.

## Decision

Route components compose focused rendering parts and coordinate feature transactions. They do not hide the former page implementation inside a single controller.

| Owner                                                    | Contract                                                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explorer/position.ts`                                   | Own exact position, bounds, intro/feed transition, and jump interpolation; consume pixel deltas or navigation commands.                                     |
| `explorer/input.ts`, `measurements.ts`, `ScrollRail.tsx` | Interpret browser events, observe explicit element references, and convert rail pointers into fractions.                                                    |
| `explorer/deck-rows.ts`                                  | Own worker lifetime, bounded cache, row decoding, status, and retry. Present validated card IDs to rows.                                                    |
| `arrange/editor.ts`                                      | Own ordering, selection, live rank, and explicit settlement. Commands return their next ordering so immediate commits do not read a pre-flush Solid signal. |
| `arrange/gestures.ts`                                    | Own tap, pan, long-press, drag, and click suppression sessions.                                                                                             |
| `arrange/spread-geometry.ts`                             | Register card elements by identity and accept explicit track/scroller references. No DOM ancestry or class-name discovery.                                  |
| `arrange/shuffle-animation.ts`                           | Animate to an already selected target and report completion; the route coordinator decides URL commit timing and interruption policy.                       |
| `examples/walkthrough.ts`                                | Own index and progress together. All selection paths reset progress, including same-index replay.                                                           |
| `presentation/Presentation.tsx`                          | Own slide navigation and scoped keyboard handling. Embedded native controls retain their keys.                                                              |

Share only contracts with matching semantics: `navigation/deck-query.ts` handles query normalization/history echoes, `motion/momentum.ts` integrates scalar velocity, and `platform` owns keyboard-target and reduced-motion policies. Explorer and Arrange keep their different bounds and touch sampling/arbitration. Explorer commits navigation immediately; Arrange commits settled edits. Domain modules stay pure and permutation indices remain bigint.

Worker cancellation is distinguishable from failure. Failures become visible retry state; retry recreates the source, and superseded or disposed results cannot update rows. The executable worker entry consumes message types from a neutral protocol module.

The route layout owns viewport sizing and document scroll locking. Explorer receives an explicit accessible label for supplied introductory content. Card faces keep the inherited `--card-width` contract. Passive rows and interactive card buttons share `spreadSlotStyle` and `.card-slot`: position zero is rightmost/topmost, with the inverse mapping in `cards/spread.ts`.

CSS lives alongside feature owners. `ui/base.css` defines shared tokens; `ui/controls.css` provides opt-in action styling on native buttons with local size variables. Neutral article layout styles only direct prose children. Hero typography and playing-card internals are scoped to their components. How and Talk compose shared examples while retaining format-specific prose and state lifetimes.

## Alternatives Considered

- Moving entire route closures into one hook would retain the same coupling.
- A universal deck or motion component would combine different gesture, geometry, and transaction policies.
- Splitting every static paragraph or card-face fragment would add interfaces without independent behavior or reuse.
- Splitting CSS into imports without changing selectors would preserve the observed cascade leaks.

## Consequences

Rendering consumes semantic values and actions; browser and transport adapters can evolve without editing whole pages. Explicit references and transactions require some coordination code, but keep lifecycle and commit policy visible. Small pure geometry helpers can be tested without importing routes. Browser tests remain necessary for capture, native clamping, animation cancellation, layout, and batched UI interactions.

## Evidence

- `src/examples/Walkthrough.test.tsx` and `e2e/walkthrough.spec.ts`: shared selection/replay and keyboard ownership.
- `src/explorer/deck-rows.test.tsx` and `e2e/explorer-loading.spec.ts`: stale results, bounded rows, failures/retry, and query history.
- `src/arrange/editor.test.tsx`, `e2e/arrange.spec.ts`, and `e2e/arrange-momentum.spec.ts`: transaction timing, motion, and scroller independence from wrapper markup.
- `e2e/ui-boundaries.spec.ts`: component typography and shared spread placement/hit testing.

## Related Material

- [UI audit](../audits/2026-09-07-ui-boundaries.md)
- [Implementation plan](../plans/completed/2026-09-07-ui-boundaries.md)
- [Arrange interaction model](0013-arrange-interaction-and-motion.md)
- [Browser verification](0008-verify-emergent-scroll-behavior-end-to-end.md)
