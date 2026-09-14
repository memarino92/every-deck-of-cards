import { expect, test } from '@playwright/test'

test('How fixes the four-card examples to index 14 and reverse index 23', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/how')
  const unrank = page.locator('[aria-labelledby="how-index-fourteen"]')
  const rank = page.locator('[aria-labelledby="how-reverse"]')

  await expect(page.getByRole('spinbutton')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next' })).toHaveCount(0)
  await expect(unrank.locator('[data-watch="remainder"]')).toHaveText('14')
  await expect(unrank.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'start',
  )
  await expect(rank.locator('[data-watch="index"]')).toHaveText('0')
  await expect(rank).toContainText('recover index 23')
})

test('Talk opens with history, two and three-card tables, then the full demo', async ({
  page,
}) => {
  await page.goto('/talk')
  const surface = page.getByRole('region', {
    name: 'Presentation',
    exact: true,
  })
  await expect(surface).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Charles-Ange Laisant')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('Derrick H. Lehmer')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('2 cards, 2 orderings')
  await expect(page.locator('.permutation-table tbody tr')).toHaveCount(2)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('3 cards, 6 orderings')
  await expect(page.locator('.permutation-table tbody tr')).toHaveCount(6)
  await expect(
    page.locator('.permutation-table tbody td:nth-child(2)'),
  ).toHaveText(['0 1 2', '0 2 1', '1 0 2', '1 2 0', '2 0 1', '2 1 0'])
  await expect(page.locator('.stepper')).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('Deal index 0')
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'start',
  )
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.permutation-table tbody tr')).toHaveCount(6)
})
