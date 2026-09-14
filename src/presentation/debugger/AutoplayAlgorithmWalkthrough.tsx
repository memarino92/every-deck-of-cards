import { createEffect, createSignal, onSettled } from 'solid-js'

import { prefersReducedMotion } from '../../platform/reduced-motion.ts'
import { AlgorithmWalkthrough } from './AlgorithmWalkthrough.tsx'
import type { DebugWalk } from './frames.ts'

const FRAME_DELAY_MS = 1_200
const LOOP_DELAY_MS = 2_400

export function AutoplayAlgorithmWalkthrough(props: {
  readonly walk: DebugWalk
}) {
  let root!: HTMLDivElement
  const [position, setPosition] = createSignal(0)
  const [visible, setVisible] = createSignal(false)
  const [paused, setPaused] = createSignal(false)
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined

  function clearTimer(): void {
    if (timer === undefined) return
    globalThis.clearTimeout(timer)
    timer = undefined
  }

  onSettled(() => {
    setPaused(prefersReducedMotion())

    if (typeof IntersectionObserver !== 'function') {
      setVisible(true)
      return clearTimer
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.15 },
    )
    observer.observe(root)
    return () => {
      observer.disconnect()
      clearTimer()
    }
  })

  createEffect(
    () => ({ paused: paused(), position: position(), visible: visible() }),
    (state) => {
      clearTimer()
      if (!state.visible || state.paused) return

      const atEnd = state.position === props.walk.frames.length - 1
      timer = globalThis.setTimeout(
        () => {
          timer = undefined
          setPosition(atEnd ? 0 : state.position + 1)
        },
        atEnd ? LOOP_DELAY_MS : FRAME_DELAY_MS,
      )
    },
  )

  return (
    <div
      class="autoplay-walkthrough"
      ref={(element) => {
        root = element
      }}
    >
      <div class="autoplay-status">
        <span>
          Step {position() + 1} of {props.walk.frames.length}
        </span>
        <button
          type="button"
          class="action-button"
          onClick={() => {
            const next = !paused()
            if (next) clearTimer()
            setPaused(next)
          }}
        >
          {paused() ? 'Play walkthrough' : 'Pause walkthrough'}
        </button>
      </div>
      <AlgorithmWalkthrough
        walk={props.walk}
        frame={props.walk.frames[position()] ?? props.walk.frames[0]}
        announce={false}
      />
    </div>
  )
}
