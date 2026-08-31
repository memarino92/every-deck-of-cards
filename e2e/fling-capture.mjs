/**
 * Fling-scroll capture: measures how the explorer feed behaves under a
 * scripted wheel fling, before and after scroll-model changes. This is the
 * reproducible benchmark behind decision 0009's evidence.
 *
 * Methodology:
 *   1. Boot the dev server (or attach to one already on the port).
 *   2. Load /explore at a deterministic mid-space deck, viewport 1280x800.
 *   3. Wait for the initial window to resolve (no "Shuffling…" rows).
 *   4. Deliver a fixed fling: 40 wheel events of 600px, 8ms apart
 *      (~24,000px ~ 162 deck rows at 148px/row).
 *   5. Sample the top rendered deck and unresolved-row count every 50ms.
 *
 * Reported metrics:
 *   - movedRows:       decks the top row advanced fling-start -> settle.
 *                      A wall shows up here as far fewer rows than requested.
 *   - topAtFlingEnd:   top row the moment the last wheel event landed;
 *                      "position keeps up with input" when this already
 *                      reflects most of the fling.
 *   - positionSettleMs: fling start -> last change of the top rendered deck.
 *   - dataSettleMs:    fling start -> first sustained sample with zero
 *                      unresolved ("Shuffling…") rows. The "Shuffling dwell".
 *
 * Usage: node e2e/fling-capture.mjs
 * Requires: pnpm exec playwright install chromium (same as the e2e suite).
 */
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 5199
const BASE = `http://localhost:${PORT}`
const START_DECK = 1_000_000n

const FLING_EVENTS = 40
const FLING_DELTA_Y = 600
const FLING_INTERVAL_MS = 8
const ROW_HEIGHT = 148
const SAMPLE_INTERVAL_MS = 50
const SETTLE_TIMEOUT_MS = 15_000

async function isServerUp() {
  try {
    const response = await fetch(`${BASE}/__health`)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- readiness polling is sequential by definition
    if (await isServerUp()) {
      return
    }

    // eslint-disable-next-line no-await-in-loop -- wait between polls
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Dev server did not come up on ${BASE}`)
}

function spawnServer() {
  const isWindows = process.platform === 'win32'
  const child = spawn(
    isWindows ? 'cmd.exe' : 'pnpm',
    isWindows
      ? ['/c', 'pnpm.cmd', 'dev', '--port', String(PORT), '--strictPort']
      : ['dev', '--port', String(PORT), '--strictPort'],
    { stdio: 'ignore' },
  )

  return child
}

function stopServer(child) {
  if (child === undefined) {
    return
  }

  if (process.platform === 'win32') {
    // pnpm.cmd wraps the real server process; kill the whole tree.
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  } else {
    child.kill()
  }
}

async function main() {
  let server
  if (!(await isServerUp())) {
    server = spawnServer()
  }
  await waitForServer(60_000)

  const browser = await chromium.launch()

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    })
    await page.goto(`${BASE}/explore?deck=${START_DECK.toString()}`)

    const topDeck = async () => {
      const text = await page
        .locator('.deck-row .deck-number')
        .first()
        .textContent()
      return BigInt((text ?? '0').replaceAll(/[,\s]/g, ''))
    }
    const loadingRows = () => page.locator('.deck-row .deck-loading').count()

    // Wait for the initial window to fully resolve.
    await page
      .waitForFunction(
        () => document.querySelectorAll('.deck-row .deck-loading').length === 0,
        { timeout: SETTLE_TIMEOUT_MS },
      )
      .catch(() => {})

    const explorer = page.locator('.explorer')
    const box = await explorer.boundingBox()
    if (box === null) {
      throw new Error('Explorer section not found')
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    const topBefore = await topDeck()
    const t0 = Date.now()
    const samples = []

    // Deliver the fling.
    for (let event = 0; event < FLING_EVENTS; event += 1) {
      // eslint-disable-next-line no-await-in-loop -- the fling is sequential input by definition
      await page.mouse.wheel(0, FLING_DELTA_Y)
      if (event % 8 === 0) {
        samples.push({
          t: Date.now() - t0,
          // eslint-disable-next-line no-await-in-loop -- sampling follows the input
          top: await topDeck(),
          // eslint-disable-next-line no-await-in-loop -- sampling follows the input
          loading: await loadingRows(),
        })
      }
      // eslint-disable-next-line no-await-in-loop -- pacing between events
      await new Promise((resolve) => setTimeout(resolve, FLING_INTERVAL_MS))
    }

    const tFlingEnd = Date.now() - t0
    const topAtFlingEnd = await topDeck()
    const loadingAtFlingEnd = await loadingRows()

    // Sample until position and data settle.
    let lastTopChange = tFlingEnd
    let dataSettledAt
    let previousTop = topAtFlingEnd
    let stableStreak = 0

    for (
      let waited = 0;
      waited < SETTLE_TIMEOUT_MS;
      waited += SAMPLE_INTERVAL_MS
    ) {
      // eslint-disable-next-line no-await-in-loop -- settle sampling is time-ordered
      await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS))
      // eslint-disable-next-line no-await-in-loop -- settle sampling is time-ordered
      const top = await topDeck()
      // eslint-disable-next-line no-await-in-loop -- settle sampling is time-ordered
      const loading = await loadingRows()
      const t = Date.now() - t0

      if (top !== previousTop) {
        lastTopChange = t
        previousTop = top
        stableStreak = 0
      } else {
        stableStreak += 1
      }

      if (loading === 0 && dataSettledAt === undefined) {
        dataSettledAt = t
      }
      if (loading > 0) {
        dataSettledAt = undefined
      }

      if (stableStreak >= 4 && loading === 0) {
        break
      }
    }

    const topAfter = previousTop
    const expectedRows = BigInt(
      Math.round((FLING_EVENTS * FLING_DELTA_Y) / ROW_HEIGHT),
    )

    const report = {
      scenario: {
        startDeck: START_DECK.toString(),
        viewport: '1280x800',
        fling: `${FLING_EVENTS} x ${FLING_DELTA_Y}px @ ${FLING_INTERVAL_MS}ms`,
        expectedRowsFromInput: expectedRows.toString(),
      },
      movedRows: (topAfter - topBefore).toString(),
      topAtFlingEndDelta: (topAtFlingEnd - topBefore).toString(),
      loadingRowsAtFlingEnd: loadingAtFlingEnd,
      flingDurationMs: tFlingEnd,
      positionSettleMs: lastTopChange,
      dataSettleMs: dataSettledAt ?? null,
      timedOut: dataSettledAt === undefined,
    }

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await browser.close()
    stopServer(server)
  }
}

await main()
