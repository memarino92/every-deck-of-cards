import { expect, test, type CDPSession, type Page } from '@playwright/test'

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
  fromX: number,
  toX: number,
  steps = 6,
): Promise<void> {
  const card = page.locator('.arrange-card').first()
  const box = await card.boundingBox()
  if (box === null) {
    throw new Error('Arrange card geometry is unavailable')
  }

  const y = box.y + 12
  const startedAt = Date.now() / 1_000
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: fromX, y }],
    timestamp: startedAt,
  })

  for (let step = 1; step <= steps; step += 1) {
    // eslint-disable-next-line no-await-in-loop -- velocity depends on ordered samples
    await page.waitForTimeout(16)
    // eslint-disable-next-line no-await-in-loop -- a gesture is ordered input
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: fromX + ((toX - fromX) * step) / steps, y }],
      timestamp: startedAt + step * 0.016,
    })
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
    timestamp: startedAt + (steps + 1) * 0.016,
  })
}

test.describe('Arrange horizontal momentum', () => {
  test('a touch flick continues the spread after release', async ({ page }) => {
    const client = await enableTouch(page)
    await page.goto('/arrange')
    const spread = page.locator('.arrange-spread')
    await page.evaluate(() => {
      document.addEventListener(
        'pointerup',
        () => {
          const surface = document.querySelector<HTMLElement>('.arrange-spread')
          ;(
            globalThis as typeof globalThis & { scrollLeftAtRelease?: number }
          ).scrollLeftAtRelease = surface?.scrollLeft ?? 0
        },
        { capture: true, once: true },
      )
    })

    await flick(page, client, 330, 60)

    await expect(spread).toHaveAttribute('data-momentum', '')
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/, {
      timeout: 3_000,
    })
    const scrollLeftAtRelease = await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { scrollLeftAtRelease?: number })
          .scrollLeftAtRelease ?? 0,
    )
    expect(
      await spread.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(scrollLeftAtRelease)
    await expect(page.getByRole('status')).toHaveText('Deck number1')
  })

  test('a quick flick delivered as one move still has momentum', async ({
    page,
  }) => {
    const client = await enableTouch(page)
    await page.goto('/arrange')
    const spread = page.locator('.arrange-spread')

    await flick(page, client, 330, 60, 1)

    await expect(spread).toHaveAttribute('data-momentum', '')
    await spread.dispatchEvent('wheel', { deltaX: 0, cancelable: true })
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)
  })

  test('wheel input cancels horizontal momentum', async ({ page }) => {
    const client = await enableTouch(page)
    await page.goto('/arrange')
    const spread = page.locator('.arrange-spread')

    await flick(page, client, 330, 60)
    await expect(spread).toHaveAttribute('data-momentum', '')
    await spread.dispatchEvent('wheel', { deltaX: 0, cancelable: true })
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)

    const afterWheel = await spread.evaluate((element) => element.scrollLeft)
    await page.waitForTimeout(200)
    expect(await spread.evaluate((element) => element.scrollLeft)).toBe(
      afterWheel,
    )

    await flick(page, client, 330, 60)
    await expect(spread).toHaveAttribute('data-momentum', '')
    await page.getByRole('button', { name: 'Shuffle' }).click()
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)
  })

  test('reduced motion keeps horizontal panning one-to-one', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const client = await enableTouch(page)
    await page.goto('/arrange')
    const spread = page.locator('.arrange-spread')

    await flick(page, client, 330, 60)
    const scrollLeftAtRelease = await spread.evaluate(
      (element) => element.scrollLeft,
    )

    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)
    await page.waitForTimeout(200)
    expect(await spread.evaluate((element) => element.scrollLeft)).toBe(
      scrollLeftAtRelease,
    )
  })

  test('momentum stops at both horizontal bounds', async ({ page }) => {
    const client = await enableTouch(page)
    await page.goto('/arrange')
    const spread = page.locator('.arrange-spread')
    const maximum = await spread.evaluate((element) => {
      element.scrollLeft = element.scrollWidth
      return element.scrollLeft
    })
    await spread.evaluate((element) => {
      element.scrollLeft -= 500
    })

    await flick(page, client, 330, 60)
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)
    expect(await spread.evaluate((element) => element.scrollLeft)).toBe(maximum)

    await spread.evaluate((element) => {
      element.scrollLeft = 500
    })
    await flick(page, client, 60, 330)
    await expect(spread).not.toHaveAttribute('data-momentum', /.*/)
    expect(await spread.evaluate((element) => element.scrollLeft)).toBe(0)
  })
})
