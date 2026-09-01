import { expect, test } from '@playwright/test'

test.describe('Arrange prototype', () => {
  test('reorders one deck and updates its exact number', async ({ page }) => {
    await page.goto('/arrange')

    const number = page.getByRole('status')
    const ace = page.getByRole('button', { name: 'Select ace of spades' })
    const two = page.getByRole('button', { name: 'Select two of spades' })
    await expect(page.locator('.arrange-card')).toHaveCount(52)
    await expect(number).toHaveText('Deck number1')

    const [aceBox, twoBox, aceStack, twoStack] = await Promise.all([
      ace.boundingBox(),
      two.boundingBox(),
      ace.evaluate((element) => Number(getComputedStyle(element).zIndex)),
      two.evaluate((element) => Number(getComputedStyle(element).zIndex)),
    ])
    if (aceBox === null || twoBox === null) {
      throw new Error('Arrange card geometry is unavailable')
    }
    expect(aceBox.x).toBeGreaterThan(twoBox.x)
    expect(aceStack).toBeGreaterThan(twoStack)

    await ace.click({ position: { x: 6, y: 12 } })
    await page
      .getByRole('button', {
        name: /Move selected card to position 2, before two of spades/,
      })
      .click({ position: { x: 6, y: 12 } })

    await expect(number).not.toHaveText('Deck number1')
    await page.getByRole('button', { name: 'Reset deck' }).click()
    await expect(number).toHaveText('Deck number1')
  })

  test('updates the number while a card is being dragged', async ({ page }) => {
    await page.goto('/arrange')

    const ace = page.getByRole('button', { name: 'Select ace of spades' })
    const five = page.getByRole('button', { name: 'Select five of spades' })
    const [aceBox, fiveBox] = await Promise.all([
      ace.boundingBox(),
      five.boundingBox(),
    ])

    if (aceBox === null || fiveBox === null) {
      throw new Error('Arrange card geometry is unavailable')
    }

    await page.mouse.move(aceBox.x + 6, aceBox.y + 12)
    await page.mouse.down()
    await page.mouse.move(fiveBox.x + 6, fiveBox.y + 12, { steps: 8 })

    await expect(ace).toHaveClass(/dragging/)
    await expect(page.getByRole('status')).not.toHaveText('Deck number1')

    await page.mouse.up()
    await expect(ace).not.toHaveClass(/dragging/)
    await expect(page.getByRole('status')).not.toHaveText('Deck number1')
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
