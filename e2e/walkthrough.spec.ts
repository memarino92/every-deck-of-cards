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

test('Talk retains embedded controls and selection across slide navigation', async ({
  page,
}) => {
  await page.goto('/talk')
  const surface = page.getByRole('region', {
    name: 'Presentation',
    exact: true,
  })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('3 cards, 6 orderings')
  await page.getByRole('spinbutton').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('h1')).toHaveText('3 cards, 6 orderings')
  await page
    .locator('.stepper')
    .getByRole('button', { name: 'Next', exact: true })
    .focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.stepper-progress')).toHaveText('step 2 of 3')
  await surface.focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('spinbutton').fill('17')
  await page
    .locator('.talk-controls')
    .getByRole('button', { name: 'Next' })
    .click()
  await page
    .locator('.talk-controls')
    .getByRole('button', { name: 'Prev' })
    .click()
  await expect(page.getByRole('spinbutton')).toHaveValue('17')
})
