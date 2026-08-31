import { expect, test, type Page } from '@playwright/test'

/**
 * The custom scrollbar rail maps percent-of-space to an exact deck position
 * (decision 0009). Grabbing the thumb and cranking it to either end must
 * reach the actual ends of the space — the behavior the native-scrollbar
 * window could never offer.
 */
const LAST_DECK =
  '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000'
const LAST_DECK_PLAIN = LAST_DECK.replaceAll(',', '')

async function visibleDecks(page: Page): Promise<bigint[]> {
  const numbers = await page.locator('.explorer-feed').evaluate((feed) => {
    const viewport = feed.getBoundingClientRect()

    return [...feed.querySelectorAll('.deck-row')]
      .filter((row) => {
        const rect = row.getBoundingClientRect()
        return rect.bottom > viewport.top && rect.top < viewport.bottom
      })
      .map((row) => row.querySelector('.deck-number')?.textContent ?? '')
  })

  return numbers.map((text) => BigInt(text.replaceAll(',', '')))
}

async function maxVisibleDeck(page: Page): Promise<bigint> {
  return (await visibleDecks(page)).reduce((a, b) => (a > b ? a : b))
}

async function minVisibleDeck(page: Page): Promise<bigint> {
  return (await visibleDecks(page)).reduce((a, b) => (a < b ? a : b))
}

test.describe('explorer scrollbar rail', () => {
  test('dragging the thumb to the bottom reaches the last deck', async ({
    page,
  }) => {
    await page.goto('/explore')

    const rail = page.locator('.explorer-rail')
    const thumb = page.locator('.explorer-rail-thumb')
    await expect(thumb).toBeVisible()

    const railBox = await rail.boundingBox()
    const thumbBox = await thumb.boundingBox()
    if (railBox === null || thumbBox === null) {
      throw new Error('Rail not laid out')
    }

    // Grab the thumb and crank it past the bottom end of the rail.
    const railCenterX = railBox.x + railBox.width / 2
    await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + 4)
    await page.mouse.down()
    await page.mouse.move(railCenterX, railBox.y + railBox.height + 50, {
      steps: 12,
    })
    await page.mouse.up()

    await expect
      .poll(async () => (await maxVisibleDeck(page)).toString())
      .toBe(LAST_DECK_PLAIN)

    // And back: crank past the top returns to deck 1.
    await page.mouse.move(railCenterX, railBox.y + railBox.height - 4)
    await page.mouse.down()
    await page.mouse.move(railCenterX, railBox.y - 50, { steps: 12 })
    await page.mouse.up()

    await expect
      .poll(async () => (await minVisibleDeck(page)).toString())
      .toBe('1')
  })

  test('dragging to the middle lands in the middle of the space', async ({
    page,
  }) => {
    await page.goto('/explore')

    const rail = page.locator('.explorer-rail')
    const railBox = await rail.boundingBox()
    if (railBox === null) {
      throw new Error('Rail not laid out')
    }

    // Press the bare rail at its midpoint: the thumb teleports there.
    await page.mouse.click(
      railBox.x + railBox.width / 2,
      railBox.y + railBox.height / 2,
    )

    const top = await minVisibleDeck(page)
    const last = BigInt(LAST_DECK_PLAIN)

    // Percent mapping puts the position near the middle of the space; assert
    // the broad proportional band rather than an exact deck (rail resolution
    // is pixel-granular by design).
    expect(top).toBeGreaterThan(last / 4n)
    expect(top).toBeLessThan((last * 3n) / 4n)
  })
})
