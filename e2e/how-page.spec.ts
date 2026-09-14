import { expect, test } from '@playwright/test'

test('How follows the talk from small tables through both algorithms', async ({
  page,
}) => {
  await page.goto('/how')

  await expect(page.locator('article > section > h2')).toHaveText([
    'The idea',
    '1 card, 1 ordering',
    '2 cards, 2 orderings',
    '3 cards, 6 orderings',
    'Deal index 14',
    'Reverse the recipe',
    'Then 52 cards',
  ])
  await expect(page.locator('.permutation-table tbody tr')).toHaveCount(9)
  await expect(page.locator('.talk-permutation-cards')).toHaveCount(3)
  await expect(page.locator('.talk-permutation-cards li')).toHaveCount(9)
  await expect(page.locator('.how-permutations .playing-card')).toHaveCount(23)
  await expect(page.locator('.stepper')).toHaveCount(0)
  await expect(page.locator('.autoplay-walkthrough')).toHaveCount(2)
  await expect(page.locator('.autoplay-walkthrough').first()).toContainText(
    'NUMBER → CARDS · INDEX 14',
  )
  await expect(page.locator('.autoplay-walkthrough').last()).toContainText(
    'CARDS → NUMBER · [4, 3, 2, A]',
  )
})

test('a visible walkthrough auto-plays and can be paused', async ({ page }) => {
  await page.goto('/how')
  const walkthrough = page.locator('.autoplay-walkthrough').first()
  await walkthrough.scrollIntoViewIfNeeded()
  const algorithm = walkthrough.locator('.algorithm-walk')

  await expect
    .poll(() => algorithm.getAttribute('data-frame'))
    .not.toBe('start')
  await walkthrough.getByRole('button', { name: 'Pause walkthrough' }).click()
  const pausedFrame = await algorithm.getAttribute('data-frame')
  await page.waitForTimeout(1_500)
  await expect(algorithm).toHaveAttribute('data-frame', pausedFrame!)
})

test('reduced motion starts walkthroughs paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/how')
  await expect(
    page.getByRole('button', { name: 'Play walkthrough' }),
  ).toHaveCount(2)
  await expect(page.locator('.algorithm-walk').first()).toHaveAttribute(
    'data-frame',
    'start',
  )
})
