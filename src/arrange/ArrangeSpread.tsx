import { For } from 'solid-js'
import type { DeckEditor } from './editor.ts'
import type { ArrangeGestures } from './gestures.ts'
import type { SpreadGeometry } from './spread-geometry.ts'
import { ArrangeCard } from './ArrangeCard.tsx'

export function ArrangeSpread(props: {
  readonly editor: Pick<DeckEditor, 'ordering' | 'selectedIndex'>
  readonly gestures: ArrangeGestures
  readonly geometry: SpreadGeometry
}) {
  return (
    <div
      ref={props.geometry.assignScroller}
      class="arrange-spread"
      aria-describedby="arrange-instructions"
      data-momentum={props.gestures.momentumScrolling() || undefined}
      onPointerDown={() => props.gestures.cancelMomentum()}
      onWheel={() => props.gestures.cancelMomentum()}
    >
      <div
        class="arrange-spread-track"
        ref={props.geometry.assignTrack}
        style={{ '--card-count': props.editor.ordering().length }}
      >
        <For each={props.editor.ordering()}>
          {(id, position) => (
            <ArrangeCard
              id={id}
              position={position()}
              count={props.editor.ordering().length}
              selected={props.editor.selectedIndex() === position()}
              hasSelection={props.editor.selectedIndex() !== undefined}
              dragging={props.gestures.draggedId() === id}
              gestures={props.gestures}
              register={props.geometry.register}
            />
          )}
        </For>
      </div>
    </div>
  )
}
