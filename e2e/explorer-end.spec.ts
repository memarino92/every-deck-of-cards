import { expect, test, type Page } from '@playwright/test'

/**
 * The last public deck number is 52! (one-based). The explorer must let a
 * visitor scroll all the way to it — and back out. This behavior is emergent
 * (browser scroll physics × virtualization math), so it is verified end to
 * end. Regression guard for the "12 decks short" dead end.
 */
const LAST_DECK =
  '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000'
const LAST_DECK_PLAIN = LAST_DECK.replaceAll(',', '')

/**
 * A deck just before the end. The regression this guards is the window
 * stopping half a window short of the last deck, so the scroll only needs to
 * cross that final boundary — starting ~120 decks out keeps the test fast
 * while still exercising the exact code path that used to dead-end.
 */
const NEAR_END_INDEX = (BigInt(LAST_DECK_PLAIN) - 1n - 120n).toString()

/** The largest deck number currently rendered. */
async function maxVisibleDeck(page: Page): Promise<bigint> {
  const numbers = await page.locator('.deck-row .deck-number').allTextContents()

  return numbers
    .map((text) => BigInt(text.replaceAll(',', '')))
    .reduce((a, b) => (a > b ? a : b))
}

/** The smallest deck number currently rendered. */
async function minVisibleDeck(page: Page): Promise<bigint> {
  const numbers = await page.locator('.deck-row .deck-number').allTextContents()

  return numbers
    .map((text) => BigInt(text.replaceAll(',', '')))
    .reduce((a, b) => (a < b ? a : b))
}

/** Wheel-scroll the explorer until `goal` returns true or attempts run out. */
async function scrollUntil(
  page: Page,
  deltaY: number,
  goal: () => Promise<boolean>,
): Promise<void> {
  await page.locator('.explorer-scroll').hover()

  for (let attempt = 0; attempt < 200; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- polling: each check depends on the prior scroll
    if (await goal()) {
      return
    }
    // eslint-disable-next-line no-await-in-loop -- scrolls must be sequential and dependent
    await page.mouse.wheel(0, deltaY)
  }
}

test.describe('explorer end of space', () => {
  test('jumping to the last deck number shows it on screen', async ({
    page,
  }) => {
    await page.goto('/explore')

    const input = page.locator('.jump input')
    await input.fill(LAST_DECK_PLAIN)
    await page.locator('.jump button[type="submit"]').click()

    // The last deck must actually render, not just be addressable.
    await expect
      .poll(async () => (await maxVisibleDeck(page)).toString())
      .toBe(LAST_DECK_PLAIN)
  })

  test('the comma-grouped last deck number pastes into the input', async ({
    page,
  }) => {
    await page.goto('/explore')

    // The site displays deck numbers comma-grouped; pasting that string back
    // into the jump box must work.
    const input = page.locator('.jump input')
    await input.fill(LAST_DECK)
    await page.locator('.jump button[type="submit"]').click()

    await expect
      .poll(async () => (await maxVisibleDeck(page)).toString())
      .toBe(LAST_DECK_PLAIN)
  })

  test('the go-to-end button fills the input and shows the last deck', async ({
    page,
  }) => {
    await page.goto('/explore')

    await page.locator('.jump .end-button').click()

    // The button surfaces the last deck number in the input…
    await expect(page.locator('.jump input')).toHaveValue(LAST_DECK_PLAIN)

    // …and scrolls it into view.
    await expect
      .poll(async () => (await maxVisibleDeck(page)).toString())
      .toBe(LAST_DECK_PLAIN)
  })

  test('the go-to-start button returns to deck 1', async ({ page }) => {
    // Start somewhere deep in the space so the trip back is observable.
    await page.goto(`/explore?deck=${NEAR_END_INDEX}`)

    await page.locator('.jump .start-button').click()

    await expect(page.locator('.jump input')).toHaveValue('1')
    await expect
      .poll(async () => (await minVisibleDeck(page)).toString())
      .toBe('1')
  })

  test('reaches the last deck scrolling down, and escapes scrolling up', async ({
    page,
  }) => {
    test.setTimeout(60_000)

    // Load a few thousand decks before the end so the scroll to the end is
    // short and deterministic. `deck` is the one-based public number.
    await page.goto(`/explore?deck=${NEAR_END_INDEX}`)

    const scroller = page.locator('.explorer-scroll')
    await expect(scroller).toBeVisible()

    // Scroll down until the last deck is rendered.
    await scrollUntil(page, 400, async () => {
      return (await maxVisibleDeck(page)).toString() === LAST_DECK_PLAIN
    })
    expect((await maxVisibleDeck(page)).toString()).toBe(LAST_DECK_PLAIN)

    // Scrolling back up must leave the end zone (the original bug also
    // trapped upward scroll just short of the boundary). Proving the window
    // retreats past the pinned final window (LAST - physicalRowCount) is
    // enough to show it is not stuck at the end.
    const endWindowTop = BigInt(LAST_DECK_PLAIN) - 24n
    await scrollUntil(page, -400, async () => {
      return (await minVisibleDeck(page)) < endWindowTop
    })
    expect(await minVisibleDeck(page)).toBeLessThan(endWindowTop)
  })
})
