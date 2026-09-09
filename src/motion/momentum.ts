import { createSignal, onCleanup } from 'solid-js'

import { prefersReducedMotion } from '../platform/reduced-motion.ts'

export const MOMENTUM_SAMPLE_WINDOW_MS = 100
export const MOMENTUM_RELEASE_IDLE_MS = 80
const DECAY_PER_MS = 0.004
const MIN_VELOCITY = 0.02
const MAX_VELOCITY = 4

/** Scalar integration only. The consumer owns gesture arbitration and bounds. */
export function createMomentum(
  applyDelta: (delta: number) => boolean,
  reducedMotion: () => boolean = prefersReducedMotion,
) {
  const [active, setActive] = createSignal(false)
  let frame: number | undefined

  function cancel(): void {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    setActive(false)
  }

  function start(initialVelocity: number): void {
    cancel()
    if (
      reducedMotion() ||
      typeof requestAnimationFrame !== 'function' ||
      !Number.isFinite(initialVelocity) ||
      Math.abs(initialVelocity) < MIN_VELOCITY
    )
      return
    let velocity = Math.max(
      -MAX_VELOCITY,
      Math.min(MAX_VELOCITY, initialVelocity),
    )
    let previousTime = performance.now()
    setActive(true)

    function step(now: number): void {
      const elapsed = Math.max(0, now - previousTime)
      if (elapsed > 0) {
        previousTime = now
        const decay = Math.exp(-DECAY_PER_MS * elapsed)
        const delta = (velocity * (1 - decay)) / DECAY_PER_MS
        velocity *= decay
        if (!applyDelta(delta) || Math.abs(velocity) < MIN_VELOCITY) {
          frame = undefined
          setActive(false)
          return
        }
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  }

  onCleanup(cancel)
  return { active, start, cancel }
}
