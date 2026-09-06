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
      test(`Arrange keeps deck ${deck} close to its number and on screen`, async ({
        page,
      }) => {
        await page.goto(`/arrange?deck=${deck}`)
        await expect(page.locator('.arrange-card')).toHaveCount(52)
        const geometry = await page.evaluate(() => {
          const number = document
            .querySelector('.arrange-number')!
            .getBoundingClientRect()
          const card = document
            .querySelector('.arrange-card')!
            .getBoundingClientRect()
          return {
            gap: card.top - number.bottom,
            bottom: card.bottom,
            scrollHeight: document.documentElement.scrollHeight,
            scrollWidth: document.documentElement.scrollWidth,
          }
        })
        expect(geometry.gap).toBeGreaterThanOrEqual(30)
        expect(geometry.gap).toBeLessThanOrEqual(56)
        expect(geometry.bottom).toBeLessThanOrEqual(viewport.height)
        expect(geometry.scrollHeight).toBeLessThanOrEqual(viewport.height)
        expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width)
      })
    }
  })
}
