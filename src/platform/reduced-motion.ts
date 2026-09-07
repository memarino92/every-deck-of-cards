/** Without media-query support, settle motion immediately. */
export function prefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia !== 'function' ||
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
