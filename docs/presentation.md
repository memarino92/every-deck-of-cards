# Authoring the talk

The `/talk` route keeps each slide mounted while its steps change. Right arrow
or Space advances one step; Left arrow goes back. Buttons do the same. Native
inputs and buttons retain their keys. Use the slide selector to skip ahead and
Restart slide to return to its initial state.

The URL is the source of truth for navigation: for example,
`/talk?slide=deal-index-14&step=4` opens the first card transfer. `slide` is a
stable ID; `step` is one-based, matching the displayed counter. Refresh and
shared links restore that snapshot immediately. Each navigation creates a
history entry, so browser Back/Forward also restores steps. Unrecognized slide
IDs fall back to the first slide; invalid steps fall back to the selected slide's
first step. Other query parameters are preserved. Embedded free-form example
inputs are separate from the slide/step address.

The talk opens with separate portrait slides for Laisant and Lehmer, a two-card permutation table,
and a three-card permutation table. The former title slide and four-card input
widget are omitted from this sequence.
The first animated examples are slides 5–7: unrank index 0, unrank index 14,
then rank [4, 3, 2, A] to index 23. These are zero-based permutation indices;
their public deck numbers are 1, 15, and 24 respectively.
The final slide jumps directly to 52 cards; the five-card widget is omitted.
After each transfer, remaining cards slide left into consecutive slots. Tray
dimensions and index labels stay fixed, with unused slots at the right. Ranking
preserves unread input order; its canonical pool remains visible in Watch.

The original `history` URL opens Laisant; `history-lehmer` opens Lehmer. Portraits
are local assets with visible attribution and license links; source records are
in `public/portraits/README.md`.

## A stepped slide

```tsx
const steps = [
  { phase: 'overview' },
  { phase: 'select' },
  { phase: 'place' },
] as const

const slide = stepSlide({
  id: 'choose-next-card',
  title: 'Choose the next card',
  steps,
  render: (step) => <CardDiagram phase={step().phase} />,
})
```

`render` runs once per mounted slide. Read the current snapshot reactively inside
JSX or an effect's compute function. Every snapshot must describe the whole
visible state: it should work when reached from either direction. Use tested
domain functions to derive arithmetic; never use animation completion to change
the mathematical result. A static slide supplies a stable `id`, `title`, and `body`.

For fixed-slot motion, `createLayoutTransition().place(surface, placements,
animate)` receives a map of persistent elements to destination slot elements.
The surface must be positioned and borderless; moving elements must be absolute
children using its coordinate system. It writes `left`, `top`, `width`, and
`--slot-width`. Call it after rendering destination geometry. Keep framework
reactivity in the owning component, and return observer cleanup from Solid 2
`onSettled` callbacks.

The algorithm demonstration is split into `frames.ts` (pure snapshots),
`AlgorithmWalkthrough.tsx` (code, watches, and trays), and the general presentation
navigation and transition primitives. To change code-line granularity, update the
displayed algorithm, frame construction, and arithmetic/line assertions together.
