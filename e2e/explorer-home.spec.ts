import { expect, test } from '@playwright/test'

test.describe('explorer-first home', () => {
  test('redirects legacy deck links to the home explorer', async ({ page }) => {
    await page.goto('/explore?deck=5000000')

    await expect(page).toHaveURL(/\/?deck=5000000$/)
    await expect(page.locator('.jump input')).toHaveValue('5000000')
    await expect(
      page.locator('.deck-number', { hasText: '5,000,000' }),
    ).toBeVisible()
  })

  test('uses the full page feed with sticky controls and GitHub masthead link', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator('.home-hero')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Every Deck of Cards on GitHub' }),
    ).toBeVisible()
    await expect(page.locator('footer')).toHaveCount(0)

    const controls = page.locator('.explorer-bar')
    const feed = page.locator('.explorer-feed')
    const initialFirstRow = await page
      .locator('.deck-number')
      .first()
      .textContent()

    // The first wheel input scrolls the compact intro as a normal document;
    // it does not advance the virtual position before the feed takes over.
    await page.mouse.wheel(0, 12_000)
    await expect(controls).toBeInViewport()
    expect(await page.locator('.deck-number').first().textContent()).toBe(
      initialFirstRow,
    )

    // Once the document reaches the feed, the same wheel input advances the
    // bigint virtual position while the controls remain pinned.
    await feed.hover()
    await page.mouse.wheel(0, 2_000)
    await expect(controls).toBeInViewport()
    await expect(page.locator('.deck-number').first()).not.toHaveText(
      initialFirstRow ?? '',
    )

    // Returning the virtual feed to deck 1 hands upward scrolling back to the
    // document so the intro is reachable again.
    await feed.focus()
    await page.keyboard.press('Home')
    const documentBottom = await page.evaluate(() => scrollY)
    await page.mouse.wheel(0, -600)
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(documentBottom)
  })

  test('hands touch drags between the document and virtual feed', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 1,
    })
    await page.goto('/')

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= globalThis.innerWidth,
      ),
    ).toBe(true)

    const drag = async (fromY: number, toY: number): Promise<void> => {
      const x = 195
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: fromY }],
      })

      for (let step = 1; step <= 8; step += 1) {
        // eslint-disable-next-line no-await-in-loop -- a gesture is ordered input
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: fromY + ((toY - fromY) * step) / 8 }],
        })
      }

      await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    }

    // A trusted touch gesture over the intro uses native document scrolling.
    await drag(700, 100)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)

    // At the document boundary, a gesture over the feed advances the virtual
    // position instead of overscrolling the page.
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    )
    await drag(700, 100)
    await drag(700, 100)
    await drag(700, 100)
    await expect(page.locator('.deck-number').first()).not.toHaveText('1')

    const feed = page.locator('.explorer-feed')
    await feed.focus()
    await page.keyboard.press('Home')
    const documentBottom = await page.evaluate(() => scrollY)

    // At deck 1, the reverse gesture is native again and reveals the intro.
    await drag(200, 700)
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(documentBottom)
  })
})
