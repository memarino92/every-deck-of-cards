import { randomPermutationIndex } from './domain/random.ts'
import { cryptoEntropy } from './platform/crypto-entropy.ts'
import { prefersReducedMotion } from './platform/reduced-motion.ts'
import { createDeckQuery } from './navigation/deck-query.ts'
import { createDeckEditor } from './arrange/editor.ts'
import { createSpreadGeometry } from './arrange/spread-geometry.ts'
import { createArrangeGestures } from './arrange/gestures.ts'
import { createShuffleAnimator } from './arrange/shuffle-animation.ts'
import { ArrangeControls } from './arrange/ArrangeControls.tsx'
import { ArrangeSpread } from './arrange/ArrangeSpread.tsx'

interface ArrangePageProps {
  readonly drawPermutationIndex?: () => bigint
  readonly reducedMotion?: boolean
}

/** Coordinates editing transactions and their URL commit timing. */
export function ArrangePage(props: ArrangePageProps = {}) {
  const query = createDeckQuery((index) => {
    interrupt(false)
    gestures.clearDrag()
    editor.restore(index)
  })
  const editor = createDeckEditor(query.initialIndex, query.commit)
  const geometry = createSpreadGeometry()
  const reducedMotion = () => props.reducedMotion ?? prefersReducedMotion()
  const animator = createShuffleAnimator(geometry, reducedMotion)
  const gestures = createArrangeGestures(
    editor,
    geometry,
    () => interrupt(),
    reducedMotion,
  )

  function interrupt(settleTarget = true): void {
    gestures.cancelMomentum()
    if (animator.cancel() && settleTarget) editor.settle()
  }
  function reset(): void {
    interrupt(false)
    gestures.clearDrag()
    editor.settle(editor.restore(0n))
  }
  function shuffle(): void {
    interrupt(false)
    gestures.clearDrag()
    const previous = geometry.snapshot()
    const target =
      props.drawPermutationIndex?.() ?? randomPermutationIndex(cryptoEntropy)
    const ordering = editor.restore(target)
    animator.play(previous, () => editor.settle(ordering))
  }
  return (
    <section
      class="arrange"
      aria-labelledby="arrange-title"
      data-shuffling={animator.active() ? '' : undefined}
    >
      <ArrangeControls onShuffle={shuffle} onReset={reset} />
      <output class="arrange-number" aria-live="polite">
        <span>Deck number</span>
        {animator.active()
          ? 'Shuffling...'
          : editor.number().toLocaleString('en-US')}
      </output>
      <ArrangeSpread editor={editor} gestures={gestures} geometry={geometry} />
    </section>
  )
}
