import { expect, test, type Page } from '@playwright/test'

/**
 * The fling wall was the explorer's defining scroll bug (decision 0009): a
 * fast wheel fling recentred the window on every event, each recenter waiting
 * on a worker round-trip, so delivering 40 wheel events stretched ~320ms of
 * input into ~23 seconds of wall clock. The virtual-position model advances
 * the position synchronously on every event — input can never stall behind
 * the data path. This spec is the hard gate; `e2e/fling-capture.mjs` records
 * the before/after numbers.
 */
const START_DECK = 1_000_000n
const FLING_EVENTS = 40
const FLING_DELTA_Y = 600
const ROW_HEIGHT = 148

/** The deck number at the top rendered row. */
async function topVisibleDeck(page: Page): Promise<bigint> {
  const text = await page
    .locator('.deck-row .deck-number')
    .first()
    .textContent()

  return BigInt((text ?? '0').replaceAll(',', ''))
}

test.describe('explorer fling', () => {
  test('a fast wheel fling moves the full distance without stalling', async ({
    page,
  }) => {
    await page.goto(`/explore?deck=${START_DECK.toString()}`)

    const feed = page.locator('.explorer-feed')
    await expect(feed).toBeVisible()
    // Start from a fully resolved feed.
    await expect(page.locator('.deck-row .deck-loading')).toHaveCount(0)

    const topBefore = await topVisibleDeck(page)

    const box = await feed.boundingBox()
    if (box === null) {
      throw new Error('Feed not laid out')
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    // Deliver the fling with no pacing — as fast as the browser takes it.
    const startedAt = Date.now()
    for (let event = 0; event < FLING_EVENTS; event += 1) {
      // eslint-disable-next-line no-await-in-loop -- the fling is sequential input by definition
      await page.mouse.wheel(0, FLING_DELTA_Y)
    }
    const deliveryMs = Date.now() - startedAt

    // The hard gate: input must not stretch. The nested-pane model needed
    // ~23s for this loop — that was the wall. The virtual position consumes
    // the same input in well under a second of app time; the generous ceiling
    // absorbs slow protocol round-trips (each awaited wheel costs ~100ms+ in
    // this environment) while still catching any return of the wall.
    expect(deliveryMs).toBeLessThan(15_000)

    // The position kept up with input: the feed moved essentially the whole
    // fling distance (40 x 600px = 24,000px ~ 162 rows at 148px/row).
    const topAfter = await topVisibleDeck(page)
    const moved = topAfter - topBefore
    const expected = BigInt(
      Math.floor((FLING_EVENTS * FLING_DELTA_Y) / ROW_HEIGHT),
    )
    const drift = moved > expected ? moved - expected : expected - moved
    expect(drift).toBeLessThanOrEqual(4n)

    // And the data path lands shortly after the fling stops: "Shuffling…"
    // rows resolve instead of dwelling.
    await expect(page.locator('.deck-row .deck-loading')).toHaveCount(0, {
      timeout: 3_000,
    })
  })
})
