import { expect, test } from '@playwright/test'
import { positionFromPointer } from '../src/cards/spread.ts'

test('debugger typography remains independent of article prose', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/how')
  const narration = page.locator('.debug-narration').first()
  await expect(narration).toHaveCSS('font-size', '17.6px')
  await expect(narration).toHaveCSS('margin-top', '20px')
  await expect(page.locator('#how-three + p')).toHaveCSS('font-size', '17.92px')
})

for (const route of ['/?deck=1', '/arrange']) {
  test(`spread placement and hit testing agree on ${route}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route)
    const track = page
      .locator(route === '/arrange' ? '.arrange-spread-track' : '.deck-fan')
      .first()
    await expect(track.locator('.card-slot')).toHaveCount(52)
    const geometry = await track.evaluate((element) => {
      const slots = element.querySelectorAll<HTMLElement>('.card-slot')
      const first = slots[0]!,
        second = slots[1]!,
        last = slots[51]!
      const bounds = element.getBoundingClientRect()
      return {
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
        cardWidth: first.offsetWidth,
        firstRight: first.getBoundingClientRect().right,
        lastLeft: last.getBoundingClientRect().left,
        secondLeft: second.getBoundingClientRect().left,
        firstStack: Number(getComputedStyle(first).zIndex),
        lastStack: Number(getComputedStyle(last).zIndex),
      }
    })
    expect(geometry.firstRight).toBeCloseTo(geometry.right, 0)
    expect(geometry.lastLeft).toBeCloseTo(geometry.left, 0)
    expect(geometry.firstStack).toBeGreaterThan(geometry.lastStack)
    expect(
      positionFromPointer(
        geometry.secondLeft,
        geometry.left,
        geometry.width,
        geometry.cardWidth,
        52,
      ),
    ).toBe(1)
  })
}
