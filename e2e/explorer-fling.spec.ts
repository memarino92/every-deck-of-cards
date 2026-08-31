import { expect, test, type Page } from '@playwright/test'

/**
 * The fling wall was the explorer's defining scroll bug (decision 0009): a
 * fast wheel sequence recentred the window on every event and repeatedly
 * churned rendering and worker requests. The virtual-position model applies
 * each delta directly; this spec verifies exact distance and eventual data
 * resolution. `e2e/fling-capture.mjs` is the separate observational harness.
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
  test('a fast wheel sequence moves the full distance and resolves rows', async ({
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
    for (let event = 0; event < FLING_EVENTS; event += 1) {
      // eslint-disable-next-line no-await-in-loop -- the fling is sequential input by definition
      await page.mouse.wheel(0, FLING_DELTA_Y)
    }

    // The position kept up with input: the feed moved essentially the whole
    // fling distance (40 x 600px = 24,000px ~ 162 rows at 148px/row).
    const topAfter = await topVisibleDeck(page)
    const moved = topAfter - topBefore
    const expected = BigInt(
      Math.floor((FLING_EVENTS * FLING_DELTA_Y) / ROW_HEIGHT),
    )
    const drift = moved > expected ? moved - expected : expected - moved
    expect(drift).toBeLessThanOrEqual(4n)

    // The latest requested strip eventually resolves after the input stops.
    await expect(page.locator('.deck-row .deck-loading')).toHaveCount(0)
  })
})
