import { createSignal } from 'solid-js'
import type { JSX } from '@solidjs/web'

import {
  LAST_DECK_NUMBER,
  permutationIndexToPublicDeckNumber,
  publicDeckNumberToIndex,
} from './domain/deck-number.ts'
import { randomPermutationIndex } from './domain/random.ts'
import { cryptoEntropy } from './platform/crypto-entropy.ts'
import { createDeckQuery } from './navigation/deck-query.ts'
import { parseDeckNumberParam } from './navigation/deck-param.ts'
import { createDeckRows } from './explorer/deck-rows.ts'
import { createExplorerPosition } from './explorer/position.ts'
import { createExplorerInput } from './explorer/input.ts'
import { createSurfaceMeasurements } from './explorer/measurements.ts'
import { ExplorerControls } from './explorer/ExplorerControls.tsx'
import { ExplorerFeed } from './explorer/ExplorerFeed.tsx'
import { ScrollRail } from './explorer/ScrollRail.tsx'
import { ROW_HEIGHT } from './explorer/geometry.ts'

interface ExplorerPageProps {
  readonly intro?: JSX.Element
  readonly labelledBy?: string
}

/** Composes independent position, input, data, and presentation owners. */
export function ExplorerPage(props: ExplorerPageProps = {}) {
  const query = createDeckQuery((index) => {
    input.cancelMotion()
    setJumpValue(permutationIndexToPublicDeckNumber(index).toString())
    model.restore(index)
  })
  const model = createExplorerPosition(
    query.initialIndex,
    query.initialParam !== undefined,
  )
  const input = createExplorerInput(model)
  const measurements = createSurfaceMeasurements(model.measure)
  const rows = createDeckRows(model.strip)
  const [jumpValue, setJumpValue] = createSignal(
    permutationIndexToPublicDeckNumber(query.initialIndex).toString(),
  )
  const assignSurface = (element: HTMLElement): void => {
    input.assignSurface(element)
    measurements.assignSurface(element)
  }

  function navigate(index: bigint): void {
    input.cancelMotion()
    setJumpValue(permutationIndexToPublicDeckNumber(index).toString())
    query.commit(index)
    model.navigate(index)
  }

  return (
    // The section is the keyboard-operable custom scroll surface.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={assignSurface}
      class="explorer"
      aria-labelledby={props.labelledBy ?? 'explorer-title'}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabindex="0"
      data-intro-visible={
        model.introOffset() < model.introHeight() || undefined
      }
      onKeyDown={input.handleKeyDown}
      onTouchStart={input.handleFeedTouchStart}
      onTouchEnd={input.finishTouchDrag}
      onTouchCancel={input.resetTouchDrag}
    >
      <div
        ref={measurements.assignIntro}
        class="explorer-intro"
        style={{ transform: `translateY(-${model.introOffset()}px)` }}
      >
        {props.intro}
      </div>
      <ExplorerControls
        ref={measurements.assignBar}
        introHeight={model.introHeight()}
        introOffset={model.introOffset()}
        value={jumpValue()}
        onInput={setJumpValue}
        onJump={() => navigate(parseDeckNumberParam(jumpValue()))}
        onRandom={() => navigate(randomPermutationIndex(cryptoEntropy))}
        onStart={() => navigate(0n)}
        onEnd={() => navigate(publicDeckNumberToIndex(LAST_DECK_NUMBER))}
      />
      <ExplorerFeed
        indices={model.rowIndices()}
        cardsFor={rows.cardsFor}
        rowHeight={ROW_HEIGHT}
        top={model.feedTop()}
        shift={model.strip().shiftPx}
        animating={model.animating()}
        momentum={input.momentumScrolling()}
        failed={rows.failed()}
        onRetry={rows.retry}
      />
      <ScrollRail
        percent={model.thumbTopPercent()}
        onStart={input.cancelMotion}
        onSeek={model.seekFraction}
      />
    </section>
  )
}
