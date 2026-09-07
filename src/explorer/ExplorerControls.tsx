import { LAST_DECK_NUMBER } from '../domain/deck-number.ts'
export function ExplorerControls(props: {
  readonly ref: (element: HTMLElement) => void
  readonly introHeight: number
  readonly introOffset: number
  readonly value: string
  readonly onInput: (value: string) => void
  readonly onJump: () => void
  readonly onRandom: () => void
  readonly onStart: () => void
  readonly onEnd: () => void
}) {
  return (
    <header
      ref={props.ref}
      class="explorer-bar"
      style={{
        top: `${props.introHeight}px`,
        transform: `translateY(-${props.introOffset}px)`,
      }}
    >
      <div class="explorer-heading">
        <p class="eyebrow">The explorer</p>
        <h2 id="explorer-title">Every deck, in order.</h2>
      </div>

      <form
        class="jump"
        onSubmit={(event) => {
          event.preventDefault()
          props.onJump()
        }}
      >
        <label class="jump-field">
          <span>Deck number</span>
          <input
            inputmode="numeric"
            value={props.value}
            onInput={(event) => props.onInput(event.currentTarget.value)}
          />
        </label>
        <div class="jump-actions">
          <button type="submit">Jump</button>
          <button
            type="button"
            class="random-button"
            onClick={() => props.onRandom()}
          >
            Random
          </button>
          <button
            type="button"
            class="start-button"
            onClick={() => props.onStart()}
          >
            Go to start
          </button>
          <button
            type="button"
            class="end-button"
            onClick={() => props.onEnd()}
          >
            Go to end
          </button>
        </div>
      </form>

      <p class="explorer-meta">
        <span>1</span> — <span>{LAST_DECK_NUMBER.toLocaleString('en-US')}</span>
      </p>
    </header>
  )
}
