import { expect, test } from '@playwright/test'

test('worker errors expose retry and a new worker fills the current strip', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = globalThis.Worker
    let first = true
    globalThis.Worker = class extends EventTarget {
      constructor(url: string | URL, options?: WorkerOptions) {
        super()
        if (!first) return new NativeWorker(url, options)
        first = false
      }
      postMessage(): void {
        queueMicrotask(() =>
          this.dispatchEvent(
            new ErrorEvent('error', { message: 'Injected failure' }),
          ),
        )
      }
      terminate(): void {}
    } as unknown as typeof Worker
  })
  await page.goto('/?deck=43')
  await expect(page.getByRole('alert')).toContainText(
    'These decks could not be loaded.',
  )
  await expect(page.locator('.deck-loading').first()).toHaveText('Unavailable')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.deck-loading')).toHaveCount(0)
  await expect(
    page
      .locator('.deck-row')
      .filter({ has: page.locator('.deck-number', { hasText: /^43$/ }) })
      .locator('.playing-card'),
  ).toHaveCount(52)
})

test('Back restores the first deck when the original URL has no deck query', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.locator('.jump input').fill('43')
  await page.getByRole('button', { name: 'Jump', exact: true }).click()
  await expect(page).toHaveURL(/deck=43/)
  await page.goBack()
  await expect(page.locator('.jump input')).toHaveValue('1')
  await expect(page.locator('.deck-number').first()).toHaveText('1')
})
