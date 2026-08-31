/**
 * Reproducible explorer wheel-sequence capture for decision 0009.
 *
 * Each run delivers 40 Playwright wheel inputs of 600px sequentially, with an
 * 8ms minimum pause after each acknowledged dispatch. This is deliberately
 * not described as a 320ms physical fling: Playwright protocol and browser
 * processing time are part of `inputDeliveryMs`.
 *
 * The script always boots the selected worktree on an unused local port and
 * records its Git revision, runtime, browser, OS, and CPU. To compare the
 * implementation with its parent:
 *
 *   git worktree add ../every-deck-baseline 71ca0c5
 *   pnpm --dir ../every-deck-baseline install --frozen-lockfile
 *   node e2e/fling-capture.mjs --project ../every-deck-baseline --runs 5
 *   node e2e/fling-capture.mjs --project . --runs 5
 *
 * Requires the same Chromium installation as the e2e suite:
 * `pnpm exec playwright install chromium`.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { cpus, platform, release } from 'node:os'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const START_DECK = 1_000_000n
const FLING_EVENTS = 40
const FLING_DELTA_Y = 600
const FLING_INTERVAL_MS = 8
const ROW_HEIGHT = 148
const SAMPLE_INTERVAL_MS = 50
const SETTLE_TIMEOUT_MS = 15_000

function argument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const project = resolve(argument('--project', '.'))
const runs = Number(argument('--runs', '3'))

if (!Number.isSafeInteger(runs) || runs <= 0) {
  throw new RangeError('--runs must be a positive safe integer')
}

async function availablePort() {
  const server = createServer()

  return new Promise((resolvePort, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (address === null || typeof address === 'string') {
        reject(new Error('Could not allocate a local port'))
        return
      }

      server.close(() => resolvePort(address.port))
    })
  })
}

async function waitForServer(url, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Dev server exited with code ${child.exitCode}`)
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- readiness polling is sequential
      const response = await fetch(`${url}/__health`)
      if (response.ok) {
        return
      }
    } catch {
      // Server is still starting.
    }

    // eslint-disable-next-line no-await-in-loop -- wait between readiness polls
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  throw new Error(`Dev server did not come up on ${url}`)
}

function spawnServer(port) {
  const isWindows = process.platform === 'win32'

  return spawn(
    isWindows ? 'cmd.exe' : 'pnpm',
    isWindows
      ? ['/c', 'pnpm.cmd', 'dev', '--port', String(port), '--strictPort']
      : ['dev', '--port', String(port), '--strictPort'],
    { cwd: project, stdio: 'ignore' },
  )
}

function stopServer(child) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    })
  } else {
    child.kill()
  }
}

function revision() {
  const command = process.platform === 'win32' ? 'git.exe' : 'git'
  const result = spawnSync(command, ['rev-parse', 'HEAD'], {
    cwd: project,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Could not read project revision')
  }

  return result.stdout.trim()
}

async function runCapture(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  try {
    await page.goto(`${baseUrl}/explore?deck=${START_DECK.toString()}`)
    await page.waitForFunction(
      () => document.querySelectorAll('.deck-row .deck-loading').length === 0,
      { timeout: SETTLE_TIMEOUT_MS },
    )

    const topDeck = async () => {
      const text = await page
        .locator('.deck-row .deck-number')
        .first()
        .textContent()
      return BigInt((text ?? '0').replaceAll(/[,\s]/g, ''))
    }
    const loadingRows = () => page.locator('.deck-row .deck-loading').count()

    await page.locator('.explorer').hover()
    const topBefore = await topDeck()
    const startedAt = Date.now()

    for (let event = 0; event < FLING_EVENTS; event += 1) {
      // eslint-disable-next-line no-await-in-loop -- inputs are intentionally sequential
      await page.mouse.wheel(0, FLING_DELTA_Y)
      // eslint-disable-next-line no-await-in-loop -- minimum pacing follows each input
      await new Promise((resolveWait) =>
        setTimeout(resolveWait, FLING_INTERVAL_MS),
      )
    }

    const inputDeliveryMs = Date.now() - startedAt
    const topAtInputEnd = await topDeck()
    const loadingAtInputEnd = await loadingRows()
    let previousTop = topAtInputEnd
    let lastPositionChangeMs = inputDeliveryMs
    let dataSettledAtMs
    let stableSamples = 0

    for (
      let waited = 0;
      waited < SETTLE_TIMEOUT_MS;
      waited += SAMPLE_INTERVAL_MS
    ) {
      // eslint-disable-next-line no-await-in-loop -- settling samples are time-ordered
      await new Promise((resolveWait) =>
        setTimeout(resolveWait, SAMPLE_INTERVAL_MS),
      )
      // eslint-disable-next-line no-await-in-loop -- each sample follows the prior one
      const top = await topDeck()
      // eslint-disable-next-line no-await-in-loop -- each sample follows the prior one
      const loading = await loadingRows()
      const elapsed = Date.now() - startedAt

      if (top === previousTop) {
        stableSamples += 1
      } else {
        previousTop = top
        lastPositionChangeMs = elapsed
        stableSamples = 0
      }

      dataSettledAtMs = loading === 0 ? (dataSettledAtMs ?? elapsed) : undefined

      if (stableSamples >= 4 && loading === 0) {
        break
      }
    }

    return {
      movedRows: (previousTop - topBefore).toString(),
      topAtInputEndDelta: (topAtInputEnd - topBefore).toString(),
      loadingRowsAtInputEnd: loadingAtInputEnd,
      inputDeliveryMs,
      positionSettleMs: lastPositionChangeMs,
      dataSettleMs: dataSettledAtMs ?? null,
      dataDwellAfterInputMs:
        dataSettledAtMs === undefined
          ? null
          : dataSettledAtMs - inputDeliveryMs,
      timedOut: dataSettledAtMs === undefined,
    }
  } finally {
    await page.close()
  }
}

const port = await availablePort()
const baseUrl = `http://localhost:${port}`
const server = spawnServer(port)

try {
  await waitForServer(baseUrl, server, 60_000)
  const browser = await chromium.launch()

  try {
    const captures = []

    for (let run = 0; run < runs; run += 1) {
      // eslint-disable-next-line no-await-in-loop -- benchmark repetitions are isolated
      captures.push(await runCapture(browser, baseUrl))
    }

    const expectedRows = Math.floor((FLING_EVENTS * FLING_DELTA_Y) / ROW_HEIGHT)

    console.log(
      JSON.stringify(
        {
          environment: {
            revision: revision(),
            project,
            node: process.version,
            browser: browser.version(),
            os: `${platform()} ${release()}`,
            cpu: cpus()[0]?.model ?? 'unknown',
          },
          scenario: {
            runs,
            startDeck: START_DECK.toString(),
            viewport: '1280x800',
            input: `${FLING_EVENTS} sequential Playwright wheel events x ${FLING_DELTA_Y}px with ${FLING_INTERVAL_MS}ms minimum gaps`,
            expectedRowsFromInput: String(expectedRows),
            server: 'development',
          },
          captures,
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
} finally {
  stopServer(server)
}
