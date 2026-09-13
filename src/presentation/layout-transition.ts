import { onCleanup } from 'solid-js'
import { prefersReducedMotion } from '../platform/reduced-motion.ts'

/** Move persistent elements to slot geometry. Layout owns the settled state. */
export function createLayoutTransition() {
  const animations = new Map<HTMLElement, Animation>()
  const initialized = new WeakSet<HTMLElement>()

  function cancel(): void {
    for (const animation of animations.values()) animation.cancel()
    animations.clear()
  }

  function place(
    surface: HTMLElement,
    placements: ReadonlyMap<HTMLElement, HTMLElement>,
    animate: boolean,
  ): void {
    const origin = surface.getBoundingClientRect()
    // Read current on-screen positions before cancelling interrupted motion.
    const measurements = Array.from(placements, ([element, slot]) => ({
      element,
      before: element.getBoundingClientRect(),
      target: slot.getBoundingClientRect(),
    }))
    cancel()
    for (const { element, before, target } of measurements) {
      element.style.left = `${target.left - origin.left}px`
      element.style.top = `${target.top - origin.top}px`
      element.style.width = `${target.width}px`
      element.style.setProperty('--slot-width', `${target.width}px`)
      const dx = before.left - target.left
      const dy = before.top - target.top
      if (
        animate &&
        initialized.has(element) &&
        !prefersReducedMotion() &&
        (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
      ) {
        const animation = element.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: 'translate(0, 0)' },
          ],
          { duration: 560, easing: 'cubic-bezier(0.22, 0.72, 0.18, 1)' },
        )
        animations.set(element, animation)
        void animation.finished.then(
          () => {
            if (animations.get(element) === animation)
              animations.delete(element)
            return undefined
          },
          () => undefined,
        )
      }
      initialized.add(element)
    }
  }

  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  const reduce = () => {
    if (media?.matches) cancel()
  }
  media?.addEventListener('change', reduce)
  onCleanup(() => {
    cancel()
    media?.removeEventListener('change', reduce)
  })
  return { place, cancel }
}
