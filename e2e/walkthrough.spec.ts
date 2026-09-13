import { expect, test } from '@playwright/test'

test('four-card input, keyboard selection, and replay share one state', async ({
  page,
}) => {
  await page.goto('/how')
  const example = page.locator('[aria-labelledby="how-four"]')
  const input = example.getByRole('spinbutton')
  await input.fill('5')
  await expect(input).toHaveValue('5')
  await example.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(example.locator('.stepper-result')).toHaveText(
    'Permutation so far: 0 3',
  )
  const replay = example.getByRole('button', {
    name: 'Replay index 23',
    exact: true,
  })
  await replay.focus()
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue('23')
  await expect(example.locator('.stepper-progress')).toHaveText('step 1 of 4')
  await example.getByRole('button', { name: 'Next', exact: true }).click()
  await replay.focus()
  await page.keyboard.press('Space')
  await expect(example.locator('.stepper-progress')).toHaveText('step 1 of 4')
  await expect(
    page.locator('[aria-labelledby="how-five"] .stepper-math'),
  ).toContainText('3 × 24 = 72')
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
