import { onSettled } from 'solid-js'
import type { SurfaceGeometry } from './position.ts'

/** Owns element measurement and observer lifetime, with no deck state. */
export function createSurfaceMeasurements(
  measure: (geometry: SurfaceGeometry) => void,
) {
  let surface: HTMLElement | undefined
  let intro: HTMLElement | undefined
  let bar: HTMLElement | undefined
  const assignSurface = (element: HTMLElement): void => {
    surface = element
  }
  const assignIntro = (element: HTMLElement): void => {
    intro = element
  }
  const assignBar = (element: HTMLElement): void => {
    bar = element
  }

  onSettled(() => {
    let disposed = false
    function update(): void {
      if (
        disposed ||
        surface === undefined ||
        intro === undefined ||
        bar === undefined
      )
        return
      measure({
        surface: surface.clientHeight,
        intro: intro.clientHeight,
        bar: bar.getBoundingClientRect().height,
      })
    }
    update()
    const observer =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => queueMicrotask(update))
        : undefined
    for (const element of [surface, intro, bar]) {
      if (element !== undefined) observer?.observe(element)
    }
    return () => {
      disposed = true
      observer?.disconnect()
    }
  })
  return { assignSurface, assignIntro, assignBar }
}
