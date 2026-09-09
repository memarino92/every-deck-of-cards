import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { FourCardWalkthrough, UnrankExample } from './CardExamples.tsx'
import { createWalkthrough, FIVE_CARD_EXAMPLE } from './walkthrough.ts'

afterEach(cleanup)

describe('shared walkthrough', () => {
  it('uses the same index for typing and table replay and restarts every selection', async () => {
    render(() => {
      const model = createWalkthrough({ size: 4, initialIndex: 0n })
      return <FourCardWalkthrough model={model} />
    })
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    await fireEvent.input(input, { target: { value: '5' } })
    expect(input.value).toBe('5')
    await fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Permutation so far: 0 3')).toBeDefined()
    await fireEvent.click(
      screen.getByRole('button', { name: 'Replay index 5' }),
    )
    expect(screen.getByText('step 1 of 4')).toBeDefined()
    await fireEvent.click(
      screen.getByRole('button', { name: 'Replay index 23' }),
    )
    expect(input.value).toBe('23')
    expect(screen.getByText('Permutation so far: 3')).toBeDefined()
  })

  it('rejects fractional and out-of-range edits without changing the trace', async () => {
    render(() => <UnrankExample {...FIVE_CARD_EXAMPLE} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    await fireEvent.input(input, { target: { value: '1.5' } })
    expect(input.value).toBe('73')
    await fireEvent.input(input, { target: { value: '120' } })
    expect(input.value).toBe('73')
    expect(screen.getByText(/digit 3 × 24 = 72/)).toBeDefined()
  })
})
