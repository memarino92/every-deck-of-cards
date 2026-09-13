import { expect, test } from '@playwright/test'

test('exploring and reading How do not fetch the talk until requested', async ({
  page,
}) => {
  const talkRequests: string[] = []
  page.on('request', (request) => {
    if (/TalkPage|presentation\/(Presentation|styles)/.test(request.url())) {
      talkRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible()
  await page.getByRole('link', { name: 'How?', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Open talk mode' })).toBeVisible()
  expect(talkRequests).toEqual([])

  await page.getByRole('link', { name: 'Open talk mode' }).click()
  await expect(
    page.getByRole('region', { name: 'Presentation', exact: true }),
  ).toBeVisible()
  expect(talkRequests.some((url) => url.includes('TalkPage'))).toBe(true)
  await expect(page.locator('.talk-slide')).toHaveCount(1)
  await expect(page.locator('.permutation-table, .stepper')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next →', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Derrick H. Lehmer')
  await expect(page.locator('.talk-slide')).toHaveCount(1)
  await page.getByRole('button', { name: '← Prev', exact: true }).click()
  await expect(page.locator('.permutation-table, .stepper')).toHaveCount(0)
})

test('a direct talk visit shows loading while its module is delayed', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/src/TalkPage.tsx*', async (route) => {
    await gate
    await route.continue()
  })
  try {
    await page.goto('/talk', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('status')).toHaveText('Loading page…')
    await expect(page.locator('.talk')).toHaveCount(0)
  } finally {
    release()
  }
  await expect(
    page.getByRole('region', { name: 'Presentation', exact: true }),
  ).toBeFocused()
  await expect(page.getByRole('status')).toHaveCount(0)
})
