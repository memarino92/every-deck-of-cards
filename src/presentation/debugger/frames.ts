import { CANONICAL_DECK, type CardId } from '../../domain/cards.ts'
import { traceRank, traceUnrank } from '../../domain/trace.ts'

export const FOUR_CARDS = CANONICAL_DECK.slice(0, 4)
export const cardLabel = (card: CardId): string =>
  ['A', '2', '3', '4'][card] ?? '?'
const labels = (cards: readonly CardId[]) =>
  `[${cards.map(cardLabel).join(', ')}]`

export const UNRANK_CODE = [
  'const remaining = [...canonical];',
  'const result = []; let remainder = index;',
  'while (remaining.length > 0) {',
  '  const blockSize = factorial(remaining.length - 1);',
  '  const digit = Number(remainder / blockSize);',
  '  result.push(remaining.splice(digit, 1)[0]);',
  '  remainder %= blockSize;',
  '}',
  'return result;',
] as const

export const RANK_CODE = [
  'const remaining = [...canonical];',
  'let index = 0n;',
  'for (const card of permutation) {',
  '  const digit = remaining.indexOf(card);',
  '  const blockSize = factorial(remaining.length - 1);',
  '  index += BigInt(digit) * blockSize;',
  '  remaining.splice(digit, 1);',
  '}',
  'return index;',
] as const

export interface DebugFrame {
  readonly id: string
  readonly line: number
  readonly remaining: readonly CardId[]
  readonly processed: readonly CardId[]
  readonly selected: CardId | undefined
  readonly watches: Readonly<Record<string, string>>
  readonly equation: string
  readonly narration: string
}

export interface DebugWalk {
  readonly mode: 'unrank' | 'rank'
  readonly input: readonly CardId[]
  readonly index: bigint
  readonly code: readonly string[]
  readonly frames: readonly [DebugFrame, ...DebugFrame[]]
}

export function unrankWalk(index: bigint): DebugWalk {
  const trace = traceUnrank(FOUR_CARDS, index)
  let frame: DebugFrame = {
    id: 'start',
    line: 2,
    remaining: FOUR_CARDS,
    processed: [],
    selected: undefined,
    watches: {
      remainder: `${index}`,
      blockSize: '—',
      digit: '—',
      remaining: labels(FOUR_CARDS),
      result: '[]',
    },
    equation: `4! = 24 possible permutations`,
    narration: `Start with index ${index}. Choose one card at a time from the remaining pool.`,
  }
  const frames: [DebugFrame, ...DebugFrame[]] = [frame]
  const push = (update: Partial<DebugFrame>) => {
    frame = { ...frame, ...update }
    frames.push(frame)
  }
  for (const step of trace.steps) {
    const prefix = `pick-${step.position}`
    const before =
      step.position === 0
        ? index
        : (trace.steps[step.position - 1]?.remainder ?? 0n)
    push({
      id: `${prefix}-block`,
      line: 4,
      selected: undefined,
      watches: { ...frame.watches, blockSize: `${step.blockSize}`, digit: '—' },
      equation: `${step.poolBefore.length - 1}! = ${step.blockSize}`,
      narration: `Each choice of next card begins a block of ${step.blockSize} permutations.`,
    })
    push({
      id: `${prefix}-digit`,
      line: 5,
      selected: step.selected,
      watches: { ...frame.watches, digit: `${step.digit}` },
      equation: `${before} ÷ ${step.blockSize} = ${step.digit} remainder ${step.remainder}`,
      narration: `Integer division chooses remaining-pool index ${step.digit}: ${cardLabel(step.selected)}.`,
    })
    const processed = trace.permutation.slice(0, step.position + 1)
    const remaining = step.poolBefore.filter((card) => card !== step.selected)
    push({
      id: `${prefix}-move`,
      line: 6,
      remaining,
      processed,
      watches: {
        ...frame.watches,
        remaining: labels(remaining),
        result: labels(processed),
      },
      narration: `Move ${cardLabel(step.selected)} into output position ${step.position}. Remaining cards slide left into their new pool indices.`,
    })
    push({
      id: `${prefix}-remainder`,
      line: 7,
      watches: { ...frame.watches, remainder: `${step.remainder}` },
      equation: `${before} % ${step.blockSize} = ${step.remainder}`,
      narration: 'Keep the remainder to choose within the next, smaller block.',
    })
  }
  push({
    id: 'done',
    line: 9,
    selected: undefined,
    equation: `index ${index} → ${labels(trace.permutation)}`,
    narration: `Complete: index ${index}, public deck number ${index + 1n}, produces ${labels(trace.permutation)}.`,
  })
  return { mode: 'unrank', input: FOUR_CARDS, index, code: UNRANK_CODE, frames }
}

export function rankWalk(permutation: readonly CardId[]): DebugWalk {
  const trace = traceRank(FOUR_CARDS, permutation)
  let frame: DebugFrame = {
    id: 'start',
    line: 2,
    remaining: FOUR_CARDS,
    processed: [],
    selected: undefined,
    watches: {
      card: '—',
      digit: '—',
      blockSize: '—',
      index: '0',
      remaining: labels(FOUR_CARDS),
    },
    equation: 'index = 0',
    narration:
      'Start with the cards. Count how many permutations come before this ordering.',
  }
  const frames: [DebugFrame, ...DebugFrame[]] = [frame]
  const push = (update: Partial<DebugFrame>) => {
    frame = { ...frame, ...update }
    frames.push(frame)
  }
  for (const step of trace.steps) {
    const prefix = `read-${step.position}`
    const before = step.indexSoFar - BigInt(step.digit) * step.blockSize
    push({
      id: `${prefix}-card`,
      line: 3,
      selected: step.selected,
      watches: {
        ...frame.watches,
        card: cardLabel(step.selected),
        digit: '—',
        blockSize: '—',
      },
      equation: `Read ${cardLabel(step.selected)} at input position ${step.position}`,
      narration: `Read the next card: ${cardLabel(step.selected)}. Find its position in the remaining canonical pool.`,
    })
    push({
      id: `${prefix}-digit`,
      line: 4,
      watches: { ...frame.watches, digit: `${step.digit}` },
      equation: `${labels(step.poolBefore)} → ${cardLabel(step.selected)} is at index ${step.digit}`,
      narration: `${step.digit} remaining cards precede this one in canonical order.`,
    })
    push({
      id: `${prefix}-block`,
      line: 5,
      watches: { ...frame.watches, blockSize: `${step.blockSize}` },
      equation: `${step.poolBefore.length - 1}! = ${step.blockSize}`,
      narration: `Each preceding choice accounts for ${step.blockSize} permutations.`,
    })
    push({
      id: `${prefix}-add`,
      line: 6,
      watches: { ...frame.watches, index: `${step.indexSoFar}` },
      equation: `${before} + ${step.digit} × ${step.blockSize} = ${step.indexSoFar}`,
      narration: `Add ${BigInt(step.digit) * step.blockSize} skipped permutations to the running index.`,
    })
    const remaining = step.poolBefore.filter((card) => card !== step.selected)
    push({
      id: `${prefix}-move`,
      line: 7,
      remaining,
      processed: permutation.slice(0, step.position + 1),
      watches: { ...frame.watches, remaining: labels(remaining) },
      narration: `${cardLabel(step.selected)} is processed. Remove it from the remaining pool and continue.`,
    })
  }
  push({
    id: 'done',
    line: 9,
    selected: undefined,
    equation: `${labels(permutation)} → index ${trace.index}`,
    narration: `The last permutation has index ${trace.index}: public deck number ${trace.index + 1n} of 24.`,
  })
  return {
    mode: 'rank',
    input: permutation,
    index: trace.index,
    code: RANK_CODE,
    frames,
  }
}
