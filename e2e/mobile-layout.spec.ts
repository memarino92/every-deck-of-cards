import { expect, test } from '@playwright/test'
import { DECK_COUNT } from '../src/domain/deck-number.ts'

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
]) {
  test.describe(`mobile layout at ${viewport.width}px`, () => {
    test.use({ viewport })

    for (const route of ['/how', '/why']) {
      test(`${route} fits the viewport`, async ({ page }) => {
        await page.goto(route)
        await expect(page.locator('h1')).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width)
        if (route === '/how') {
          // One page shares focus and scrolling, so exercise its controls sequentially.
          /* eslint-disable no-await-in-loop */
          for (const stepper of await page.locator('.stepper').all()) {
            await stepper.getByRole('button', { name: 'Next' }).click()
            await expect(stepper.locator('.stepper-progress')).toContainText(
              'step 2',
            )
            await stepper.getByRole('button', { name: 'Back' }).click()
            await expect(stepper.locator('.stepper-progress')).toContainText(
              'step 1',
            )
          }
          /* eslint-enable no-await-in-loop */
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(viewport.width)
        }
      })
    }

    for (const deck of ['1', DECK_COUNT.toString()]) {
      test(`Arrange keeps deck ${deck} centered in the remaining space and on screen`, async ({
        page,
      }) => {
        await page.goto(`/arrange?deck=${deck}`)
        await expect(page.locator('.arrange-card')).toHaveCount(52)
        const geometry = await page.evaluate(() => {
          const spread = document
            .querySelector('.arrange-spread-track')!
            .getBoundingClientRect()
          const card = document
            .querySelector('.arrange-card')!
            .getBoundingClientRect()
          return {
            centerOffset:
              (card.top + card.bottom - spread.top - spread.bottom) / 2,
            spreadBottom: spread.bottom,
            bottom: card.bottom,
            scrollHeight: document.documentElement.scrollHeight,
            scrollWidth: document.documentElement.scrollWidth,
          }
        })
        expect(Math.abs(geometry.centerOffset)).toBeLessThanOrEqual(1)
        expect(geometry.spreadBottom).toBeGreaterThanOrEqual(
          viewport.height - 21,
        )
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height)
        expect(geometry.scrollHeight).toBeLessThanOrEqual(viewport.height)
        expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width)
      })
    }
  })
}

test('Explorer keeps compact Pixel-sized intro spacing and ordered action rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('/')
  await expect(page.locator('.home-hero')).toBeVisible()
  const geometry = await page.evaluate(() => {
    // This helper must execute inside the browser context.
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const rect = (selector: string) =>
      document.querySelector(selector)!.getBoundingClientRect()
    const nav = rect('.masthead')
    const eyebrow = rect('.home-hero .eyebrow')
    const copy = rect('.home-hero > p:not(.eyebrow, .count)')
    const count = rect('.home-hero .count')
    const heading = rect('.explorer-heading')
    return {
      navGap: eyebrow.top - nav.bottom,
      countBefore: count.top - copy.bottom,
      countAfter: heading.top - count.bottom,
    }
  })
  expect(geometry.navGap).toBeCloseTo(24, 0)
  expect(geometry.countBefore).toBeCloseTo(24, 0)
  expect(geometry.countAfter).toBeCloseTo(16, 0)
  await expect(page.locator('.jump-actions button')).toHaveText([
    'Jump',
    'Random',
    'Go to start',
    'Go to end',
  ])
  const buttons = await page
    .locator('.jump-actions button')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect()
        return { x: box.x, y: box.y }
      }),
    )
  expect(buttons[0]!.y).toBe(buttons[1]!.y)
  expect(buttons[2]!.y).toBe(buttons[3]!.y)
  expect(buttons[2]!.y).toBeGreaterThan(buttons[0]!.y)
  expect(buttons[0]!.x).toBe(buttons[2]!.x)
  expect(buttons[1]!.x).toBe(buttons[3]!.x)
})

for (const width of [768, 1024, 1440]) {
  test(`Explorer title and description share a row at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const title = await page.locator('.home-hero h1').boundingBox()
    const description = await page
      .locator('.home-hero > p:not(.eyebrow, .count)')
      .boundingBox()
    expect(title).not.toBeNull()
    expect(description).not.toBeNull()
    expect(description!.x).toBeGreaterThanOrEqual(title!.x + title!.width)
    expect(
      Math.abs(
        description!.y + description!.height / 2 - title!.y - title!.height / 2,
      ),
    ).toBeLessThanOrEqual(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
  })
}
