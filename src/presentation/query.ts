import type { SlidePosition } from './navigation.ts'

interface SlideAddress {
  readonly id: string
  readonly stepCount?: number
}

type QueryValue = string | string[] | undefined
const first = (value: QueryValue) => (Array.isArray(value) ? value[0] : value)

/** Stable slide IDs and one-based presenter steps; malformed links start safely. */
export function parsePresentationQuery(
  slides: readonly SlideAddress[],
  rawSlide: QueryValue,
  rawStep: QueryValue,
): SlidePosition {
  const slide = slides.findIndex(
    (candidate) => candidate.id === first(rawSlide),
  )
  if (slide === -1) return { slide: 0, step: 0 }
  const text = first(rawStep)
  const step = text && /^[1-9][0-9]*$/.test(text) ? Number(text) : 1
  const count = slides[slide]?.stepCount ?? 1
  return {
    slide,
    step:
      Number.isSafeInteger(step) && step >= 1 && step <= count ? step - 1 : 0,
  }
}
