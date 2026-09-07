export function ArrangeControls(props: {
  readonly onShuffle: () => void
  readonly onReset: () => void
}) {
  return (
    <div class="arrange-heading">
      <p class="eyebrow" id="arrange-title">
        Arrange one exact shuffle
      </p>
      <div class="arrange-actions">
        <p class="arrange-instructions" id="arrange-instructions">
          Drag a card, or select it and then select where it should move. On
          touch, long press to drag.
        </p>
        <button
          class="arrange-control"
          type="button"
          onClick={() => props.onShuffle()}
        >
          Shuffle
        </button>
        <button
          class="arrange-control"
          type="button"
          onClick={() => props.onReset()}
        >
          Reset deck
        </button>
      </div>
    </div>
  )
}
