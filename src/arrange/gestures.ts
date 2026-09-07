import { createSignal, onCleanup } from 'solid-js'
import type { CardId } from '../domain/cards.ts'
import {
  createMomentum,
  MOMENTUM_SAMPLE_WINDOW_MS,
  MOMENTUM_RELEASE_IDLE_MS,
} from '../motion/momentum.ts'
import type { DeckEditor } from './editor.ts'
import type { SpreadGeometry } from './spread-geometry.ts'
const TOUCH_LONG_PRESS_MS = 420
const TOUCH_SLOP_PX = 8
const TOUCH_DRAG_HAPTIC_MS = 12

/** Owns pointer sessions and click arbitration, independently of URL and shuffle motion. */
export function createArrangeGestures(
  editor: DeckEditor,
  geometry: SpreadGeometry,
  beforeInteraction: () => void,
  reducedMotion: () => boolean,
) {
  const [draggedId, setDraggedId] = createSignal<CardId>()
  let suppressClick = false
  let suppressClickTimer: ReturnType<typeof setTimeout> | undefined
  let dragSession:
    | {
        readonly pointerId: number
        readonly cardId: CardId
        readonly startX: number
        readonly startY: number
        readonly grabOffset: number
        readonly initialOrdering: readonly CardId[]
        readonly pointerType: string
        readonly startScrollLeft: number
        panSamples: { readonly x: number; readonly time: number }[]
        longPressTimer: ReturnType<typeof setTimeout> | undefined
        currentIndex: number
        dragging: boolean
        panning: boolean
      }
    | undefined

  const momentum = createMomentum((delta) => {
    const spread = geometry.scroller()
    if (spread === undefined) return false
    const previous = spread.scrollLeft
    spread.scrollLeft += delta
    return spread.scrollLeft !== previous
  }, reducedMotion)
  const clearDrag = (): void => {
    if (dragSession?.longPressTimer !== undefined) {
      clearTimeout(dragSession.longPressTimer)
    }
    dragSession = undefined
    setDraggedId(undefined)
  }

  const suppressNextClick = (): void => {
    suppressClick = true
    if (suppressClickTimer !== undefined) {
      clearTimeout(suppressClickTimer)
    }
    suppressClickTimer = setTimeout(() => {
      suppressClick = false
      suppressClickTimer = undefined
    }, 500)
  }

  const handlePointerDown = (
    event: PointerEvent & { currentTarget: HTMLButtonElement },
    id: CardId,
    position: number,
  ): void => {
    if (event.pointerType !== 'touch' && event.button !== 0) {
      return
    }

    beforeInteraction()

    const cardRect = event.currentTarget.getBoundingClientRect()
    const initialSession = {
      pointerId: event.pointerId,
      cardId: id,
      startX: event.clientX,
      startY: event.clientY,
      grabOffset: event.clientX - cardRect.left,
      initialOrdering: editor.ordering(),
      pointerType: event.pointerType,
      startScrollLeft: geometry.scroller()?.scrollLeft ?? 0,
      panSamples: [{ x: event.clientX, time: event.timeStamp }],
      longPressTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      currentIndex: position,
      dragging: false,
      panning: false,
    }
    dragSession = initialSession

    if (event.pointerType === 'touch') {
      initialSession.longPressTimer = setTimeout(() => {
        if (dragSession === initialSession && !initialSession.panning) {
          initialSession.longPressTimer = undefined
          initialSession.dragging = true
          setDraggedId(initialSession.cardId)
          editor.clearSelection()
          globalThis.navigator.vibrate?.(TOUCH_DRAG_HAPTIC_MS)
        }
      }, TOUCH_LONG_PRESS_MS)
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent): void => {
    const session = dragSession
    const track = geometry.track()

    if (
      session === undefined ||
      session.pointerId !== event.pointerId ||
      track === undefined
    ) {
      return
    }

    if (!session.dragging && session.pointerType === 'touch') {
      const now = event.timeStamp
      session.panSamples.push({ x: event.clientX, time: now })
      session.panSamples = session.panSamples.filter(
        (sample) => sample.time >= now - MOMENTUM_SAMPLE_WINDOW_MS,
      )

      const distance = Math.hypot(
        event.clientX - session.startX,
        event.clientY - session.startY,
      )

      if (!session.panning && distance < TOUCH_SLOP_PX) {
        return
      }

      if (!session.panning) {
        if (session.longPressTimer !== undefined) {
          clearTimeout(session.longPressTimer)
          session.longPressTimer = undefined
        }
        session.panning = true
      }

      const spread = geometry.scroller()
      if (spread !== undefined) {
        spread.scrollLeft =
          session.startScrollLeft - (event.clientX - session.startX)
      }
      return
    }

    if (!session.dragging && Math.abs(event.clientX - session.startX) < 6) {
      return
    }

    session.dragging = true
    setDraggedId(session.cardId)
    editor.clearSelection()

    const targetIndex = geometry.positionAt(
      event.clientX - session.grabOffset,
      editor.ordering().length,
    )
    if (targetIndex === undefined) return

    if (targetIndex !== session.currentIndex) {
      editor.move(session.currentIndex, targetIndex)
      session.currentIndex = targetIndex
    }
  }

  const handlePointerUp = (
    event: PointerEvent & { currentTarget: HTMLButtonElement },
  ): void => {
    const session = dragSession

    if (session === undefined || session.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (session.dragging || session.panning) {
      suppressNextClick()
    }
    if (session.dragging) {
      editor.settle()
    } else if (session.panning) {
      const first = session.panSamples[0]
      const last = session.panSamples.at(-1)

      if (
        first !== undefined &&
        last !== undefined &&
        first !== last &&
        event.timeStamp - last.time <= MOMENTUM_RELEASE_IDLE_MS
      ) {
        const elapsed = last.time - first.time
        if (elapsed > 0) {
          momentum.start((first.x - last.x) / elapsed)
        }
      }
    }

    clearDrag()
  }

  const handlePointerCancel = (event: PointerEvent): void => {
    const session = dragSession

    if (session === undefined || session.pointerId !== event.pointerId) {
      return
    }

    if (session.dragging) {
      editor.replace(session.initialOrdering)
    }
    clearDrag()
  }

  function activate(position: number): void {
    if (suppressClick) {
      suppressClick = false
      if (suppressClickTimer !== undefined) clearTimeout(suppressClickTimer)
      suppressClickTimer = undefined
      return
    }
    beforeInteraction()
    editor.select(position)
  }
  onCleanup(() => {
    clearDrag()
    if (suppressClickTimer !== undefined) clearTimeout(suppressClickTimer)
  })
  return {
    draggedId,
    momentumScrolling: momentum.active,
    cancelMomentum: momentum.cancel,
    clearDrag,
    activate,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  }
}
export type ArrangeGestures = ReturnType<typeof createArrangeGestures>
