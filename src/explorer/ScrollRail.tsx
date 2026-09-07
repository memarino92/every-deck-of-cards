import { onSettled } from 'solid-js'

/** Pointer-only fraction input. Exact position and keyboard navigation live outside. */
export function ScrollRail(props: {
  readonly percent: number
  readonly onStart: () => void
  readonly onSeek: (fraction: number) => void
}) {
  let rail: HTMLDivElement | undefined
  let thumb: HTMLDivElement | undefined
  let pointer: number | undefined
  let grabOffset = 0
  let top = 0
  let travel = 1
  const assignRail = (element: HTMLDivElement): void => {
    rail = element
  }
  const assignThumb = (element: HTMLDivElement): void => {
    thumb = element
  }

  function measure(): void {
    if (rail === undefined || thumb === undefined) return
    const rect = rail.getBoundingClientRect()
    top = rect.top
    travel = Math.max(1, rect.height - thumb.getBoundingClientRect().height)
  }
  function seek(y: number): void {
    props.onSeek(Math.max(0, Math.min(1, (y - top - grabOffset) / travel)))
  }
  function down(event: PointerEvent): void {
    if (rail === undefined || thumb === undefined || event.button !== 0) return
    event.preventDefault()
    props.onStart()
    pointer = event.pointerId
    rail.setPointerCapture(pointer)
    const rect = thumb.getBoundingClientRect()
    measure()
    grabOffset =
      event.target === thumb ? event.clientY - rect.top : rect.height / 2
    seek(event.clientY)
  }
  function move(event: PointerEvent): void {
    if (pointer === event.pointerId) seek(event.clientY)
  }
  function end(event: PointerEvent): void {
    if (pointer === event.pointerId) pointer = undefined
  }
  onSettled(() => {
    globalThis.addEventListener('resize', measure)
    return () => globalThis.removeEventListener('resize', measure)
  })
  return (
    <div
      ref={assignRail}
      class="explorer-rail"
      aria-hidden="true"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        ref={assignThumb}
        class="explorer-rail-thumb"
        style={{
          top: `${props.percent}%`,
          transform: `translateY(-${props.percent}%)`,
        }}
      />
    </div>
  )
}
