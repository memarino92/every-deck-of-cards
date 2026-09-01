import { expect, test } from '@playwright/test'

test.describe('Arrange prototype', () => {
  test('reorders one deck and updates its exact number', async ({ page }) => {
    await page.goto('/arrange')

    const number = page.getByRole('status')
    await expect(page.locator('.arrange-card')).toHaveCount(52)
    await expect(number).toHaveText('Deck number1')

    await page
      .getByRole('button', { name: 'Select ace of spades' })
      .click({ position: { x: 6, y: 12 } })
    await page
      .getByRole('button', {
        name: /Move selected card to position 2, before two of spades/,
      })
      .click({ position: { x: 6, y: 12 } })

    await expect(number).not.toHaveText('Deck number1')
    await page.getByRole('button', { name: 'Reset deck' }).click()
    await expect(number).toHaveText('Deck number1')
  })

  test('preserves readable cards in a contained mobile track', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/arrange')

    const geometry = await page.evaluate(() => {
      const spread = document.querySelector<HTMLElement>('.arrange-spread')
      const card = document.querySelector<HTMLElement>('.playing-card')

      if (spread === null || card === null) {
        throw new Error('Arrange geometry is unavailable')
      }

      return {
        cardWidth: card.getBoundingClientRect().width,
        documentFitsViewport:
          document.documentElement.scrollWidth <= globalThis.innerWidth,
        spreadIsScrollable: spread.scrollWidth > spread.clientWidth,
      }
    })

    expect(geometry.cardWidth).toBeGreaterThanOrEqual(100)
    expect(geometry.documentFitsViewport).toBe(true)
    expect(geometry.spreadIsScrollable).toBe(true)
  })
})
