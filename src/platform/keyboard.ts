/** Embedded controls retain their native keys, including descendants of buttons. */
export function ownsKeyboardInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('a, button, input, select, textarea, [role="button"]') !==
        null)
  )
}

export function isNavigationKey(event: KeyboardEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !ownsKeyboardInput(event.target)
  )
}
