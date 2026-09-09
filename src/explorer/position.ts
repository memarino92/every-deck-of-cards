import { createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import {
  clampPosition,
  createPosition,
  easeInOutCubic,
  fractionAtPosition,
  interpolatePosition,
  LAST_INDEX,
  maxTopIndex,
  positionAtFraction,
  stripRange,
  visibleRowCount,
  type FeedPosition,
} from '../virtualization/position.ts'
import { advanceSurface } from '../virtualization/surface.ts'
import { prefersReducedMotion } from '../platform/reduced-motion.ts'
import { ROW_HEIGHT, OVERSCAN_ROWS } from './geometry.ts'
const JUMP_DURATION_MS = 300
export interface SurfaceGeometry {
  readonly surface: number
  readonly intro: number
  readonly bar: number
}

/** Owns exact position and navigation; never reads DOM, input events, workers, or URLs. */
export function createExplorerPosition(
  initialIndex: bigint,
  initiallyHidden: boolean,
) {
  const [position, setPosition] = createSignal<FeedPosition>(
    createPosition(initialIndex, 0),
  )
  const [introHeight, setIntroHeight] = createSignal(0)
  const [introOffset, setIntroOffset] = createSignal(0)
  const [barHeight, setBarHeight] = createSignal(0)
  const [surfaceHeight, setSurfaceHeight] = createSignal(0)
  const feedTop = createMemo(
    () => Math.max(0, introHeight() - introOffset()) + barHeight(),
  )
  const viewportHeight = createMemo(() =>
    Math.max(0, surfaceHeight() - feedTop()),
  )
  const visibleRows = createMemo(() =>
    visibleRowCount(viewportHeight(), ROW_HEIGHT),
  )
  // Clip the first end row by the viewport remainder so 52! sits flush with
  // the bottom without leaving blank space.
  const endOffset = createMemo(() =>
    viewportHeight() <= 0 ? 0 : visibleRows() * ROW_HEIGHT - viewportHeight(),
  )
  const strip = createMemo(() =>
    stripRange(position(), viewportHeight(), ROW_HEIGHT, OVERSCAN_ROWS),
  )
  // Primitive projections of the strip: bigint/number identity only changes
  // when the strip actually moves, so sub-row scrolls (offsetPx changes) do
  // not retrigger the request effect below.
  const stripStart = createMemo(() => strip().start)
  const stripCount = createMemo(() => strip().count)
  const rowIndices = createMemo<readonly bigint[]>(() => {
    const start = stripStart()
    const count = stripCount()
    const indices: bigint[] = []

    for (let row = 0; row < count; row += 1) {
      indices.push(start + BigInt(row))
    }

    return indices
  })
  const thumbTopPercent = createMemo(
    () => fractionAtPosition(position(), visibleRows()) * 100,
  )

  let measured = false
  function measure(geometry: SurfaceGeometry): void {
    const previousHeight = introHeight()
    const hidden =
      (!measured && initiallyHidden) ||
      (previousHeight > 0 && introOffset() >= previousHeight)
    measured = true
    setSurfaceHeight(geometry.surface)
    setBarHeight(geometry.bar)
    setIntroHeight(geometry.intro)
    setIntroOffset((current) =>
      hidden ? geometry.intro : Math.min(current, geometry.intro),
    )
  }
  let animationFrame: number | undefined
  const [animating, setAnimating] = createSignal(false)
  function cancelJump(): void {
    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame)
      animationFrame = undefined
      setAnimating(false)
    }
  }

  function animateTo(target: FeedPosition): void {
    cancelJump()

    const currentTarget = (): FeedPosition => {
      const height = viewportHeight()
      const rows = visibleRowCount(height, ROW_HEIGHT)

      return clampPosition(
        target,
        rows,
        height <= 0 ? 0 : rows * ROW_HEIGHT - height,
        ROW_HEIGHT,
      )
    }

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      setPosition(currentTarget())
      return
    }

    const from = position()
    const start = performance.now()
    setAnimating(true)

    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / JUMP_DURATION_MS)

      if (t >= 1) {
        animationFrame = undefined
        setAnimating(false)
        setPosition(currentTarget())
        return
      }

      setPosition(
        interpolatePosition(
          from,
          currentTarget(),
          easeInOutCubic(t),
          ROW_HEIGHT,
          visibleRows(),
          endOffset(),
        ),
      )
      animationFrame = requestAnimationFrame(step)
    }

    animationFrame = requestAnimationFrame(step)
  }

  let previousVisibleRows = 0
  let previousEndOffset = 0
  createEffect(
    () => [visibleRows(), endOffset()] as const,
    ([rows, offset]) => {
      setPosition((current) => {
        const wasAtEnd =
          previousVisibleRows > 0 &&
          current.topIndex === maxTopIndex(previousVisibleRows) &&
          current.offsetPx === previousEndOffset

        return wasAtEnd
          ? clampPosition(
              createPosition(LAST_INDEX, 0),
              rows,
              offset,
              ROW_HEIGHT,
            )
          : clampPosition(current, rows, offset, ROW_HEIGHT)
      })
      previousVisibleRows = rows
      previousEndOffset = offset
    },
  )

  function advance(delta: number): void {
    const next = advanceSurface(
      { feed: position(), introOffset: introOffset() },
      delta,
      introHeight(),
      ROW_HEIGHT,
      visibleRows(),
      endOffset(),
    )
    setIntroOffset(next.introOffset)
    setPosition(next.feed)
  }
  function home(): void {
    setPosition(createPosition(0n))
    setIntroOffset(0)
  }
  function end(): void {
    setIntroOffset(introHeight())
    setPosition(
      clampPosition(
        createPosition(LAST_INDEX),
        visibleRows(),
        endOffset(),
        ROW_HEIGHT,
      ),
    )
  }
  function seekFraction(fraction: number): void {
    setIntroOffset(fraction === 0 ? 0 : introHeight())
    setPosition(
      positionAtFraction(fraction, visibleRows(), endOffset(), ROW_HEIGHT),
    )
  }
  function navigate(index: bigint): void {
    setIntroOffset(introHeight())
    animateTo(createPosition(index))
  }
  function restore(index: bigint): void {
    animateTo(createPosition(index))
  }
  const atStart = () =>
    introOffset() === 0 &&
    position().topIndex === 0n &&
    position().offsetPx === 0
  const atEnd = () =>
    introOffset() >= introHeight() &&
    position().topIndex === maxTopIndex(visibleRows()) &&
    position().offsetPx === endOffset()
  onCleanup(cancelJump)
  return {
    position,
    viewportHeight,
    introHeight,
    introOffset,
    feedTop,
    strip,
    rowIndices,
    thumbTopPercent,
    animating,
    measure,
    advance,
    home,
    end,
    seekFraction,
    navigate,
    restore,
    cancelJump,
    atStart,
    atEnd,
  }
}
export type ExplorerPosition = ReturnType<typeof createExplorerPosition>
