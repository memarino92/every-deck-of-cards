import { onCleanup } from 'solid-js'
import { cardFromId, type CardId } from '../domain/cards.ts'
import { PlayingCard } from '../PlayingCard.tsx'
import { spreadSlotStyle } from '../cards/spread.ts'
import type { ArrangeGestures } from './gestures.ts'
import type { SpreadGeometry } from './spread-geometry.ts'

export function ArrangeCard(props: {
  readonly id: CardId
  readonly position: number
  readonly count: number
  readonly selected: boolean
  readonly hasSelection: boolean
  readonly dragging: boolean
  readonly gestures: Pick<
    ArrangeGestures,
    | 'activate'
    | 'handlePointerDown'
    | 'handlePointerMove'
    | 'handlePointerUp'
    | 'handlePointerCancel'
  >
  readonly register: SpreadGeometry['register']
}) {
  const name = () => {
    const card = cardFromId(props.id)
    return `${card.rank} of ${card.suit}`
  }
  const label = () =>
    props.selected
      ? `Cancel moving ${name()}`
      : !props.hasSelection
        ? `Select ${name()}`
        : `Move selected card to position ${props.position + 1}, before ${name()}`
  let unregister: (() => void) | undefined
  const assignCard = (element: HTMLButtonElement): void => {
    unregister = props.register(props.id, element)
  }
  onCleanup(() => unregister?.())
  return (
    <button
      ref={(element) => assignCard(element)}
      type="button"
      class={[
        'card-slot arrange-card',
        { selected: props.selected, dragging: props.dragging },
      ]}
      aria-label={label()}
      aria-pressed={props.selected ? 'true' : 'false'}
      data-card-id={props.id}
      style={spreadSlotStyle(props.position, props.count)}
      onClick={() => props.gestures.activate(props.position)}
      onPointerDown={(event) =>
        props.gestures.handlePointerDown(event, props.id, props.position)
      }
      onPointerMove={(event) => props.gestures.handlePointerMove(event)}
      onPointerUp={(event) => props.gestures.handlePointerUp(event)}
      onPointerCancel={(event) => props.gestures.handlePointerCancel(event)}
    >
      <PlayingCard id={props.id} />
    </button>
  )
}
