import { expect, test, type CDPSession, type Page } from '@playwright/test'

async function topEdgeDeck(page: Page): Promise<bigint> {
  const text = await page.locator('.explorer-feed').evaluate((feed) => {
    const feedTop = feed.getBoundingClientRect().top

    for (const row of feed.querySelectorAll('.deck-row')) {
      if (row.getBoundingClientRect().bottom > feedTop + 1) {
        return row.querySelector('.deck-number')?.textContent ?? '0'
      }
    }

    throw new Error('No row under the feed top edge')
  })

  return BigInt(text.replaceAll(',', ''))
}

async function enableTouch(page: Page): Promise<CDPSession> {
  await page.setViewportSize({ width: 390, height: 844 })
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  })
  return client
}

async function flick(
  page: Page,
  client: CDPSession,
  fromY = 720,
  toY = 280,
): Promise<void> {
  const x = 195
  const startedAt = Date.now() / 1_000
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: fromY }],
    timestamp: startedAt,
  })

  for (let step = 1; step <= 6; step += 1) {
    // eslint-disable-next-line no-await-in-loop -- velocity depends on ordered samples
    await page.waitForTimeout(16)
    // eslint-disable-next-line no-await-in-loop -- a gesture is ordered input
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: fromY + ((toY - fromY) * step) / 6 }],
      timestamp: startedAt + step * 0.016,
    })
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    timestamp: startedAt + 7 * 0.016,
  })
}

async function sparseFlickAfterHold(client: CDPSession): Promise<void> {
  const startedAt = Date.now() / 1_000
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 195, y: 720 }],
    timestamp: startedAt,
  })
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 195, y: 280 }],
    timestamp: startedAt + 1,
  })
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    timestamp: startedAt + 1.016,
  })
}

test.describe('explorer touch momentum', () => {
  test('a flick keeps moving after release and settles', async ({ page }) => {
    const client = await enableTouch(page)
    await page.goto('/?deck=1000000')
    const feed = page.locator('.explorer-feed')
    await page.evaluate(() => {
      document.addEventListener(
        'touchend',
        () => {
          const surface = document.querySelector('.explorer-feed')
          const feedTop = surface?.getBoundingClientRect().top ?? 0
          const row = [...(surface?.querySelectorAll('.deck-row') ?? [])].find(
            (candidate) =>
              candidate.getBoundingClientRect().bottom > feedTop + 1,
          )
          ;(
            globalThis as typeof globalThis & { deckAtTouchEnd?: string }
          ).deckAtTouchEnd =
            row?.querySelector('.deck-number')?.textContent ?? '0'
        },
        { capture: true, once: true },
      )
    })

    await flick(page, client)

    await expect(feed).toHaveAttribute('data-momentum', '')
    await expect(feed).not.toHaveAttribute('data-momentum', /.*/, {
      timeout: 3_000,
    })
    const deckAtRelease = await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { deckAtTouchEnd?: string })
          .deckAtTouchEnd ?? '0',
    )
    expect(await topEdgeDeck(page)).toBeGreaterThan(
      BigInt(deckAtRelease.replaceAll(',', '')),
    )
  })

  test('new direct input cancels a running flick', async ({ page }) => {
    const client = await enableTouch(page)
    await page.goto('/?deck=1000000')
    const feed = page.locator('.explorer-feed')

    await flick(page, client)
    await expect(feed).toHaveAttribute('data-momentum', '')
    await feed.dispatchEvent('wheel', { deltaY: 148, cancelable: true })
    await expect(feed).not.toHaveAttribute('data-momentum', /.*/)

    const afterWheel = await topEdgeDeck(page)
    await page.waitForTimeout(200)
    expect(await topEdgeDeck(page)).toBe(afterWheel)
  })

  test('a sparse final move after a hold still supplies release velocity', async ({
    page,
  }) => {
    const client = await enableTouch(page)
    await page.goto('/?deck=1000000')
    const feed = page.locator('.explorer-feed')

    await sparseFlickAfterHold(client)

    await expect(feed).toHaveAttribute('data-momentum', '')
    await feed.dispatchEvent('wheel', { deltaY: 0, cancelable: true })
    await expect(feed).not.toHaveAttribute('data-momentum', /.*/)
  })

  test('reduced motion keeps touch movement one-to-one', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const client = await enableTouch(page)
    await page.goto('/?deck=1000000')
    const feed = page.locator('.explorer-feed')

    await flick(page, client)
    const deckAtRelease = await topEdgeDeck(page)

    await expect(feed).not.toHaveAttribute('data-momentum', /.*/)
    await page.waitForTimeout(200)
    expect(await topEdgeDeck(page)).toBe(deckAtRelease)
  })

  test('momentum remains clamped at the final deck', async ({ page }) => {
    const client = await enableTouch(page)
    const lastDeck =
      '80658175170943878571660636856403766975289505440883277824000000000000'
    await page.goto(`/?deck=${lastDeck}`)
    const feed = page.locator('.explorer-feed')

    await flick(page, client)

    await expect(feed).not.toHaveAttribute('data-momentum', /.*/)
    await expect(
      page.locator('.deck-number', {
        hasText:
          '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000',
      }),
    ).toBeInViewport()
  })

  test('momentum remains clamped at the start of the intro', async ({
    page,
  }) => {
    const client = await enableTouch(page)
    await page.goto('/')
    const feed = page.locator('.explorer-feed')

    await flick(page, client, 280, 720)

    await expect(feed).not.toHaveAttribute('data-momentum', /.*/)
    await expect(page.locator('.home-hero')).toBeVisible()
    expect(await topEdgeDeck(page)).toBe(1n)
  })
})
