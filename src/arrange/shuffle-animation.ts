import { createSignal, onCleanup, untrack } from 'solid-js'
import type { CardId } from '../domain/cards.ts'
import type { SpreadGeometry } from './spread-geometry.ts'
import { shuffleLiftForCard } from './shuffle-geometry.ts'

const SHUFFLE_DURATION_MS = 760

/** Animates keyed slots to an already selected target; never edits the deck or URL. */
export function createShuffleAnimator(
  geometry: SpreadGeometry,
  reducedMotion: () => boolean,
) {
  const [active, setActive] = createSignal(false)
  let generation = 0
  let frame: number | undefined
  let animations: Animation[] = []

  function cancel(): boolean {
    const wasActive = active()
    generation += 1
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    for (const animation of animations) animation.cancel()
    animations = []
    setActive(false)
    return wasActive
  }

  function play(
    previous: ReadonlyMap<CardId, DOMRect>,
    onSettled: () => void,
  ): void {
    cancel()
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      onSettled()
      return
    }
    const run = generation
    setActive(true)
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (run !== generation) return
      animations = Array.from(geometry.cards(), ([id, element]) => {
        const before = previous.get(id)
        const after = element.getBoundingClientRect()
        const deltaX = (before?.left ?? after.left) - after.left
        const direction = Math.sign(deltaX) || (id % 2 === 0 ? 1 : -1)
        const lift = shuffleLiftForCard(id)
        return element.animate(
          [
            { transform: `translateX(${deltaX}px)` },
            {
              offset: 0.55,
              transform: `translateX(${deltaX * 0.3}px) translateY(${lift}px) rotate(${direction * 2.5}deg)`,
            },
            { transform: 'translateX(0) translateY(0) rotate(0)' },
          ],
          {
            duration: SHUFFLE_DURATION_MS,
            delay: (id % 13) * 7,
            easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)',
            fill: 'backwards',
          },
        )
      })
      void Promise.allSettled(
        animations.map((animation) => animation.finished),
      ).then(() => {
        if (run === generation) {
          animations = []
          setActive(false)
          untrack(onSettled)
        }
        return undefined
      })
    })
  }

  onCleanup(cancel)
  return { active, play, cancel }
}
