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

  test('uses one full-page surface with pinned controls and GitHub masthead link', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator('.home-hero')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Every Deck of Cards on GitHub' }),
    ).toBeVisible()
    await expect(page.locator('footer')).toHaveCount(0)
    expect(
      await page.evaluate(() => ({
        bodyOverflow: getComputedStyle(document.body).overflow,
        documentFitsViewport:
          document.documentElement.scrollHeight <= globalThis.innerHeight,
      })),
    ).toEqual({ bodyOverflow: 'hidden', documentFitsViewport: true })

    const controls = page.locator('.explorer-bar')
    const feed = page.locator('.explorer-feed')
    const initialFirstRow = await page
      .locator('.deck-number')
      .first()
      .textContent()

    // Intro and feed share one custom surface; the browser document never
    // develops or moves a second scroll position.
    await page.locator('.home-hero').hover()
    await page.mouse.wheel(0, 200)
    await expect(page.locator('.explorer')).toHaveAttribute(
      'data-intro-visible',
      '',
    )
    expect(await page.locator('.deck-number').first().textContent()).toBe(
      initialFirstRow,
    )
    expect(await page.evaluate(() => scrollY)).toBe(0)

    // Continuing the same gesture stream moves through the intro and into the
    // bigint deck position without switching scroll containers.
    await page.mouse.wheel(0, 2_000)
    await expect(page.locator('.explorer')).not.toHaveAttribute(
      'data-intro-visible',
      /.*/,
    )
    await expect(controls).toBeInViewport()
    await expect(page.locator('.deck-number').first()).not.toHaveText(
      initialFirstRow ?? '',
    )

    // Home returns to the beginning of that same surface, not a document
    // scrollbar outside it.
    await feed.focus()
    await page.keyboard.press('Home')
    await expect(page.locator('.home-hero')).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  test('keeps touch drags in the unified home surface', async ({ page }) => {
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
    await expect(page.locator('.explorer')).toHaveCSS(
      'touch-action',
      'pinch-zoom',
    )

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

    // Trusted touch input moves the intro inside the unified surface while the
    // browser document remains fixed.
    await drag(700, 100)
    await expect(page.locator('.explorer')).not.toHaveAttribute(
      'data-intro-visible',
      /.*/,
    )
    expect(await page.evaluate(() => scrollY)).toBe(0)

    // Further gestures advance the virtual deck position in the same surface.
    await drag(700, 100)
    await drag(700, 100)
    await drag(700, 100)
    await expect(page.locator('.deck-number').first()).not.toHaveText('1')

    const feed = page.locator('.explorer-feed')
    await feed.focus()
    await page.keyboard.press('Home')

    await expect(page.locator('.home-hero')).toBeVisible()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  test('keeps the first and last deck rows clear of the pinned controls', async ({
    page,
  }) => {
    await page.goto('/?deck=1')

    const feed = page.locator('.explorer-feed')
    const controls = page.locator('.explorer-bar')
    const firstNumber = page.locator('.deck-number', { hasText: /^1$/ })
    const firstRow = firstNumber.locator('..')
    await expect
      .poll(async () => {
        const [feedBox, controlsBox] = await Promise.all([
          feed.boundingBox(),
          controls.boundingBox(),
        ])
        return (
          feedBox !== null &&
          controlsBox !== null &&
          Math.abs(feedBox.y - (controlsBox.y + controlsBox.height)) <= 0.5
        )
      })
      .toBe(true)
    await expect(firstNumber).toBeInViewport()

    const [feedBox, controlsBox, firstNumberBox, firstRowBox] =
      await Promise.all([
        feed.boundingBox(),
        controls.boundingBox(),
        firstNumber.boundingBox(),
        firstRow.boundingBox(),
      ])
    if (
      feedBox === null ||
      controlsBox === null ||
      firstNumberBox === null ||
      firstRowBox === null
    ) {
      throw new Error('Explorer edge geometry is unavailable')
    }
    expect(firstRowBox.y).toBeGreaterThanOrEqual(
      controlsBox.y + controlsBox.height - 0.5,
    )
    expect(firstNumberBox.y).toBeGreaterThanOrEqual(feedBox.y)

    await page.locator('.jump .end-button').click()
    await expect(feed).not.toHaveAttribute('data-animating', /.*/)

    const lastDeck =
      '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000'
    const lastRow = page
      .locator('.deck-number', { hasText: lastDeck })
      .locator('..')
    await expect(lastRow).toBeInViewport()

    const [finalFeedBox, lastRowBox] = await Promise.all([
      feed.boundingBox(),
      lastRow.boundingBox(),
    ])
    if (finalFeedBox === null || lastRowBox === null) {
      throw new Error('Explorer end geometry is unavailable')
    }
    expect(
      Math.abs(
        lastRowBox.y +
          lastRowBox.height -
          (finalFeedBox.y + finalFeedBox.height),
      ),
    ).toBeLessThanOrEqual(1)
  })
})
