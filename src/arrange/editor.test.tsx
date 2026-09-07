import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createDeckEditor } from './editor.ts'
import { CANONICAL_DECK } from '../domain/cards.ts'

afterEach(cleanup)

describe('deck editing transactions', () => {
  it('ranks previews immediately but commits only when they settle', async () => {
    const commit = vi.fn<(index: bigint) => void>()
    render(() => {
      const editor = createDeckEditor(0n, commit)
      return (
        <>
          <output>{editor.number().toString()}</output>
          <button onClick={() => editor.move(50, 51)}>Preview</button>
          <button onClick={() => editor.settle()}>Settle</button>
          <button onClick={() => editor.select(50)}>Select</button>
          <button onClick={() => editor.select(51)}>Insert</button>
          <button onClick={() => editor.settle(editor.restore(0n))}>
            Reset
          </button>
          <button onClick={() => editor.replace(CANONICAL_DECK)}>Cancel</button>
        </>
      )
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByRole('status').textContent).toBe('2')
    expect(commit).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('status').textContent).toBe('1')
    expect(commit).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Settle' }))
    expect(commit).toHaveBeenCalledExactlyOnceWith(1n)
    await fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(commit).toHaveBeenLastCalledWith(0n)
    await fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Insert' }))
    expect(commit).toHaveBeenLastCalledWith(1n)
  })
})
