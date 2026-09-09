import { onSettled } from 'solid-js'
import {
  createMomentum,
  MOMENTUM_SAMPLE_WINDOW_MS,
  MOMENTUM_RELEASE_IDLE_MS,
} from '../motion/momentum.ts'
import { isNavigationKey } from '../platform/keyboard.ts'
import { ROW_HEIGHT } from './geometry.ts'
import type { ExplorerPosition } from './position.ts'
const WHEEL_DELTA_LINE = 1
const WHEEL_DELTA_PAGE = 2

/** Browser event ownership and touch recognition; position remains in the model. */
export function createExplorerInput(model: ExplorerPosition) {
  let surface: HTMLElement | undefined
  const assignSurface = (element: HTMLElement): void => {
    surface = element
  }
  const momentum = createMomentum((delta) => {
    if ((delta < 0 && model.atStart()) || (delta > 0 && model.atEnd()))
      return false
    model.advance(delta)
    return true
  })
  function cancelMotion(): void {
    model.cancelJump()
    momentum.cancel()
  }
  function handleWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      return
    }

    event.preventDefault()
    cancelMotion()

    const scale =
      event.deltaMode === WHEEL_DELTA_LINE
        ? ROW_HEIGHT
        : event.deltaMode === WHEEL_DELTA_PAGE
          ? Math.max(model.viewportHeight(), ROW_HEIGHT)
          : 1

    model.advance(event.deltaY * scale)
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!isNavigationKey(event)) return
    const advanceBy: Partial<Record<string, number>> = {
      ArrowDown: ROW_HEIGHT,
      ArrowUp: -ROW_HEIGHT,
      PageDown: Math.max(model.viewportHeight(), ROW_HEIGHT),
      PageUp: -Math.max(model.viewportHeight(), ROW_HEIGHT),
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      cancelMotion()
      if (event.key === 'Home') model.home()
      else model.end()
      return
    }
    const delta = advanceBy[event.key]
    if (delta === undefined) return
    event.preventDefault()
    cancelMotion()
    model.advance(delta)
  }
  let touchDragY: number | undefined
  let touchDragIdentifier: number | undefined
  let touchSamples: { readonly y: number; readonly time: number }[] = []

  function resetTouchDrag(): void {
    touchDragY = undefined
    touchDragIdentifier = undefined
    touchSamples = []
  }

  function handleFeedTouchStart(event: TouchEvent): void {
    cancelMotion()

    if (event.touches.length !== 1) {
      resetTouchDrag()
      return
    }

    touchDragIdentifier = event.touches[0]?.identifier
    touchDragY = event.touches[0]?.clientY
    touchSamples =
      touchDragY === undefined ? [] : [{ y: touchDragY, time: event.timeStamp }]
  }

  function handleFeedTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1 || touchDragIdentifier === undefined) {
      resetTouchDrag()
      return
    }

    const touch = event.touches[0]
    const currentY =
      touch?.identifier === touchDragIdentifier ? touch.clientY : undefined

    if (touchDragY === undefined || currentY === undefined) {
      return
    }

    const delta = touchDragY - currentY
    touchDragY = currentY
    const now = event.timeStamp
    touchSamples.push({ y: currentY, time: now })
    const sampleWindowStart = now - MOMENTUM_SAMPLE_WINDOW_MS
    const firstRecentSample = touchSamples.findIndex(
      (sample) => sample.time >= sampleWindowStart,
    )
    touchSamples = touchSamples.slice(Math.max(0, firstRecentSample - 1))
    const predecessor = touchSamples[0]
    if (predecessor !== undefined && predecessor.time < sampleWindowStart) {
      touchSamples[0] = { y: predecessor.y, time: sampleWindowStart }
    }

    event.preventDefault()
    cancelMotion()
    model.advance(delta)
  }

  function finishTouchDrag(event: TouchEvent): void {
    const first = touchSamples[0]
    const last = touchSamples.at(-1)
    const releasedAt = event.timeStamp

    resetTouchDrag()

    if (
      first === undefined ||
      last === undefined ||
      first === last ||
      releasedAt - last.time > MOMENTUM_RELEASE_IDLE_MS
    ) {
      return
    }

    const elapsed = last.time - first.time
    if (elapsed > 0) {
      momentum.start((first.y - last.y) / elapsed)
    }
  }

  onSettled(() => {
    const element = surface
    element?.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    })
    element?.addEventListener('touchmove', handleFeedTouchMove, {
      passive: false,
    })
    return () => {
      element?.removeEventListener('wheel', handleWheel, { capture: true })
      element?.removeEventListener('touchmove', handleFeedTouchMove)
      cancelMotion()
    }
  })
  return {
    assignSurface,
    cancelMotion,
    handleKeyDown,
    handleFeedTouchStart,
    finishTouchDrag,
    resetTouchDrag,
    momentumScrolling: momentum.active,
  }
}
