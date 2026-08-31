import { expect, test, type Page } from '@playwright/test'

/**
 * Animated navigation (decision 0009): Jump / Random / Go-to-start/end
 * interpolate the virtual position over ~300ms and must land *exactly* on
 * the requested deck; `prefers-reduced-motion` jumps instantly; any new
 * input cancels a running animation deterministically.
 */

/** The deck number of the row pinned to the feed's top edge. */
async function topEdgeDeck(page: Page): Promise<bigint> {
  const feedTop = await page.locator('.explorer-feed').evaluate((element) => {
    return element.getBoundingClientRect().top
  })

  // The top edge can cut through a row mid-height; find the first row whose
  // bottom is below the feed's top edge — that is the row under the edge.
  const rows = page.locator('.deck-row')
  const numbers = await rows.allTextContents()

  for (let row = 0; row < numbers.length; row += 1) {
    // eslint-disable-next-line no-await-in-loop -- row boxes must be read in order
    const box = await rows.nth(row).boundingBox()
    if (box !== null && box.y + box.height > feedTop + 1) {
      // eslint-disable-next-line no-await-in-loop -- row boxes must be read in order
      const text = await rows.nth(row).locator('.deck-number').textContent()
      return BigInt((text ?? '0').replaceAll(',', ''))
    }
  }

  throw new Error('No row under the feed top edge')
}

async function waitForSettled(page: Page, timeoutMs = 5_000): Promise<bigint> {
  const startedAt = Date.now()
  let previous = await topEdgeDeck(page)

  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- settle polling is sequential by definition
    await page.waitForTimeout(80)
    // eslint-disable-next-line no-await-in-loop -- each sample follows the previous
    const current = await topEdgeDeck(page)

    if (current === previous) {
      return current
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Position did not settle')
    }

    previous = current
  }
}

test.describe('explorer animated navigation', () => {
  test('a jump glides and lands exactly on the requested deck', async ({
    page,
  }) => {
    await page.goto('/explore')

    const input = page.locator('.jump input')
    await input.fill('5000000')
    await page.locator('.jump button[type="submit"]').click()

    // Lands exactly: the requested deck sits at the feed's top edge.
    expect(await waitForSettled(page)).toBe(5_000_000n)
  })

  test('reduced motion lands instantly, with no glide', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/explore')
    const feed = page.locator('.explorer-feed')
    await expect(feed).toBeVisible()

    await page.locator('.jump .end-button').click()

    // Reduced motion: no animation ever starts — checked right after the
    // click, when a glide (300ms) would observably be running.
    await expect(feed).not.toHaveAttribute('data-animating', /.*/)

    // …and the last deck is on screen immediately.
    await expect
      .poll(async () => {
        const numbers = await page
          .locator('.deck-row .deck-number')
          .allTextContents()

        return numbers
          .map((text) => BigInt(text.replaceAll(',', '')))
          .reduce((a, b) => (a > b ? a : b))
          .toString()
      })
      .toBe(
        '80658175170943878571660636856403766975289505440883277824000000000000',
      )
  })

  test('a wheel input mid-animation cancels the animation', async ({
    page,
  }) => {
    await page.goto('/explore')
    const feed = page.locator('.explorer-feed')
    await expect(feed).toBeVisible()

    // Protocol round-trips in a busy page can outlast the 300ms animation, so
    // the cancelling wheel is dispatched in-page: a one-shot observer fires it
    // 100ms after the animation observably starts — genuinely mid-glide, no
    // timing races.
    await page.evaluate(() => {
      const target = document.querySelector('.explorer-feed')

      if (target === null) {
        throw new Error('Feed not found')
      }

      const observer = new MutationObserver(() => {
        if (!target.hasAttribute('data-animating')) {
          return
        }

        observer.disconnect()
        setTimeout(() => {
          window.dispatchEvent(
            new WheelEvent('wheel', { deltaY: 300, cancelable: true }),
          )
        }, 100)
      })
      observer.observe(target, {
        attributes: true,
        attributeFilter: ['data-animating'],
      })
    })

    // Start a glide across the whole space; the observer cancels it mid-way.
    await page.locator('.jump .end-button').click()

    // The wheel cancelled the animation deterministically.
    await expect(feed).toHaveAttribute('data-animating', /.*/)
    await expect(feed).not.toHaveAttribute('data-animating', /.*/)

    // The position settles where the wheel left it instead of continuing to
    // the end of the space. A completed animation lands within a viewport of
    // the last deck; a cancelled one stops astronomically far short of it.
    const lastDeck = BigInt(
      '80658175170943878571660636856403766975289505440883277824000000000000',
    )
    const settled = await waitForSettled(page)
    expect(settled).toBeLessThan(lastDeck - 1_000n)

    const again = await waitForSettled(page)
    expect(again).toBe(settled)
  })

  test('the feed answers the keyboard: arrows, page keys, Home and End', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/explore')
    await expect(page.locator('.deck-row .deck-number').first()).toBeVisible()

    const feed = page.locator('.explorer-feed')
    await feed.focus()

    const topAtStart = await topEdgeDeck(page)

    await page.keyboard.press('ArrowDown')
    expect(await waitForSettled(page)).toBe(topAtStart + 1n)

    await page.keyboard.press('ArrowUp')
    expect(await waitForSettled(page)).toBe(topAtStart)

    await page.keyboard.press('PageDown')
    const afterPage = await waitForSettled(page)
    expect(afterPage).toBeGreaterThan(topAtStart + 1n)

    await page.keyboard.press('End')
    expect(await waitForSettled(page)).toBeGreaterThan(
      80_000_000_000_000_000_000n,
    )

    await page.keyboard.press('Home')
    expect(await waitForSettled(page)).toBe(1n)
  })
})
