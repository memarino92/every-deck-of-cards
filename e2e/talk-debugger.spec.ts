import { expect, test, type Page } from '@playwright/test'

const next = (page: Page) =>
  page.getByRole('button', { name: 'Next →', exact: true }).click()
const previous = (page: Page) =>
  page.getByRole('button', { name: '← Prev', exact: true }).click()

for (const width of [1280, 390]) {
  for (const [slide, arrangements] of [
    ['two-cards', ['A 2', '2 A']],
    ['three-cards', ['A 2 3', 'A 3 2', '2 A 3', '2 3 A', '3 A 2', '3 2 A']],
  ] as const) {
    test(`${slide} shows each card arrangement at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 720 })
      await page.goto(`/talk?slide=${slide}&step=1`)
      const rows = page.locator('.talk-permutation-cards li')
      await expect(rows).toHaveCount(arrangements.length)
      expect(
        await rows.evaluateAll((elements) =>
          elements.map((row) =>
            Array.from(
              row.querySelectorAll('.playing-card'),
              (card) => card.getAttribute('aria-label')!.split(' ')[0],
            ).join(' '),
          ),
        ),
      ).toEqual(arrangements)
      await expect(page.locator('.permutation-table tbody tr')).toHaveCount(
        arrangements.length,
      )
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width)
      if (width === 1280) {
        const table = await page.locator('.permutation-table').boundingBox()
        const cards = await rows.first().boundingBox()
        expect(cards!.x).toBeGreaterThan(table!.x + table!.width)
        expect(
          await page.evaluate(() => document.documentElement.scrollHeight),
        ).toBe(720)
      }
    })
  }
}

for (const width of [1280, 390]) {
  for (const slide of ['history', 'history-lehmer']) {
    test(`${slide} loads a local portrait without overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 720 })
      await page.goto(`/talk?slide=${slide}&step=1`)
      const portrait = page.locator('.talk-portrait img')
      await expect(portrait).toHaveCount(1)
      await expect(portrait).toHaveAttribute('src', /^\/portraits\//)
      await expect
        .poll(() =>
          portrait.evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
        )
        .toBe(true)
      await expect(page.locator('.talk-portrait figcaption a')).toHaveCount(2)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width)
      if (width === 1280)
        expect(
          await page.evaluate(() => document.documentElement.scrollHeight),
        ).toBe(720)
    })
  }
}

for (const width of [1280, 900, 640, 390]) {
  test(`the final slide wraps the full deck count at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 })
    await page.goto('/talk')
    await page
      .getByRole('combobox', { name: 'Jump to slide' })
      .selectOption({ label: '8. Then 52 cards' })
    await expect(page.locator('.talk-body')).toContainText(
      '80,658,175,170,943,878,571,660,636,856,403,766,975,289,505,440,883,277,824,000,000,000,000',
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width)
    if (width >= 900)
      await expect(page.locator('.talk-controls')).toBeInViewport({ ratio: 1 })
  })
}

test('the historical introduction leads into the first demo', async ({
  page,
}) => {
  await page.goto('/talk')
  await page
    .getByRole('combobox', { name: 'Jump to slide' })
    .selectOption({ label: '1. Charles-Ange Laisant' })
  await expect(page.locator('.talk-history')).toContainText('1888')
  await expect(
    page.getByRole('img', { name: /Charles-Ange Laisant/ }),
  ).toBeVisible()
  await next(page)
  await expect(page.locator('h1')).toHaveText('Derrick H. Lehmer')
  await expect(page.locator('.talk-history')).toContainText('1960')
  await expect(
    page.getByRole('img', { name: /Derrick Henry Lehmer/ }),
  ).toBeVisible()
  await next(page)
  await expect(page.locator('h1')).toHaveText('2 cards, 2 orderings')
  await next(page)
  await expect(page.locator('h1')).toHaveText('3 cards, 6 orderings')
  await next(page)
  await expect(page.locator('h1')).toHaveText('Deal index 0')
  await expect(page.locator('.debug-line.is-active')).toHaveCount(1)
  await next(page)
  await expect(page.locator('.debug-line.is-active')).toHaveCount(1)
  await expect(page.locator('.debug-line.is-active')).toContainText(
    'const blockSize',
  )
})

async function openWalk(page: Page, title: string) {
  await page.goto('/talk')
  await page
    .getByRole('combobox', { name: 'Jump to slide' })
    .selectOption({ label: title })
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'start',
  )
}

test('the URL restores the exact step on refresh, shared entry, and Back/Forward', async ({
  page,
}) => {
  await openWalk(page, '6. Deal index 14')
  await advanceTo(page, 'pick-0-move')
  await expect(page).toHaveURL(/slide=deal-index-14&step=4$/)
  const shared = page.url()
  await page.reload()
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'pick-0-move',
  )
  await settled(page)
  await assertInSlot(page, '3', 'output', 0)
  await expect(page.locator('[data-watch="remainder"]')).toHaveText('14')
  await next(page)
  await expect(page).toHaveURL(/step=5$/)
  await page.goBack()
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'pick-0-move',
  )
  await page.goForward()
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'pick-0-remainder',
  )
  await page.getByRole('button', { name: 'Restart slide' }).click()
  await expect(page).toHaveURL(/step=1$/)
  await page.goto(shared)
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'pick-0-move',
  )
  await assertInSlot(page, '3', 'output', 0)
})

test('invalid query values fall back safely and unrelated parameters survive stepping', async ({
  page,
}) => {
  await page.goto('/talk?slide=rank-cards&step=999&notes=on')
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'start',
  )
  await next(page)
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'read-0-card',
  )
  expect(new URL(page.url()).searchParams.get('notes')).toBe('on')
  await page.goto('/talk?slide=unknown&step=-1')
  await expect(page.locator('h1')).toHaveText('Charles-Ange Laisant')
})

async function advanceTo(page: Page, frame: string) {
  // Each click depends on the previous browser update.
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt < 25; attempt += 1) {
    await expect(page.locator('.debug-line.is-active')).toHaveCount(1)
    if (
      (await page.locator('.algorithm-walk').getAttribute('data-frame')) ===
      frame
    )
      return
    await next(page)
  }
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    frame,
  )
  /* eslint-enable no-await-in-loop */
}

async function settled(page: Page) {
  await expect
    .poll(() =>
      page
        .locator('.debug-trays')
        .evaluate((element) => element.getAnimations({ subtree: true }).length),
    )
    .toBe(0)
}

async function slotGeometry(page: Page) {
  return page.locator('.debug-trays').evaluate((surface) => {
    const origin = surface.getBoundingClientRect()
    return Array.from(
      surface.querySelectorAll('.debug-slot, .debug-tray'),
      (element) => {
        const rect = element.getBoundingClientRect()
        return {
          x: rect.x - origin.x,
          y: rect.y - origin.y,
          width: rect.width,
          height: rect.height,
        }
      },
    )
  })
}

async function assertInSlot(
  page: Page,
  card: string,
  row: string,
  column: number,
) {
  const target = await page
    .locator(`[data-tray="${row}"] .debug-slot`)
    .nth(column)
    .boundingBox()
  const actual = await page.locator(`[data-card="${card}"]`).boundingBox()
  expect(target).not.toBeNull()
  expect(actual).not.toBeNull()
  expect(Math.abs(actual!.x - target!.x)).toBeLessThan(1)
  expect(Math.abs(actual!.y - target!.y)).toBeLessThan(1)
  expect(Math.abs(actual!.width - target!.width)).toBeLessThan(1)
  expect(Math.abs(actual!.height - target!.height)).toBeLessThan(1)
}

test('index 14 steps through code and watches while fixed slots retain their geometry', async ({
  page,
}) => {
  await openWalk(page, '6. Deal index 14')
  const before = await slotGeometry(page)
  const card = await page.locator('[data-card="3"]').elementHandle()
  await advanceTo(page, 'pick-0-digit')
  await expect(page.locator('[data-watch="digit"]')).toHaveText('2')
  await expect(page.locator('.debug-line[aria-current="step"]')).toContainText(
    'const digit',
  )
  await next(page)
  await settled(page)
  await assertInSlot(page, '3', 'output', 0)
  await assertInSlot(page, '4', 'source', 2)
  await expect(
    page.locator('[data-tray="source"] .debug-slot-index'),
  ).toHaveText(['0', '1', '2', '3'])
  await advanceTo(page, 'done')
  await settled(page)
  await Promise.all(
    ['3', '2', 'A', '4'].map((label, column) =>
      assertInSlot(page, label, 'output', column),
    ),
  )
  await expect(page.locator('[data-watch="result"]')).toHaveText('[3, 2, A, 4]')
  expect(await card!.evaluate((element) => element.isConnected)).toBe(true)
  expect(await slotGeometry(page)).toEqual(before)
})

test('index 0 and reverse ranking produce their exact results', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openWalk(page, '5. Deal index 0')
  await advanceTo(page, 'done')
  await expect(page.locator('[data-watch="result"]')).toHaveText('[A, 2, 3, 4]')
  await next(page)
  await expect(page.locator('h1')).toHaveText('Deal index 14')
  await previous(page)
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'done',
  )
  await page
    .getByRole('combobox', { name: 'Jump to slide' })
    .selectOption({ label: '7. Read the cards. Find the index.' })
  await advanceTo(page, 'read-0-add')
  await expect(page.locator('[data-watch="index"]')).toHaveText('18')
  await advanceTo(page, 'done')
  await expect(page.locator('[data-watch="index"]')).toHaveText('23')
  await Promise.all(
    ['4', '3', '2', 'A'].map((label, column) =>
      assertInSlot(page, label, 'output', column),
    ),
  )
  await expect(page.getByRole('status')).toContainText(
    'public deck number 24 of 24',
  )
})

test('backward navigation interrupts real motion; restart and leaving a slide cancel it', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error')
      errors.push(message.text())
  })
  await openWalk(page, '6. Deal index 14')
  await advanceTo(page, 'pick-0-move')
  await page.locator('.debug-trays').evaluate((element) => {
    const animations = element.getAnimations({ subtree: true })
    if (animations.length === 0) throw new Error('Expected native card motion')
    for (const animation of animations) {
      animation.pause()
      animation.currentTime = 200
    }
  })
  await previous(page)
  await settled(page)
  await assertInSlot(page, '3', 'source', 2)
  await assertInSlot(page, '4', 'source', 3)
  await next(page)
  await page.getByRole('button', { name: 'Restart slide' }).click()
  await settled(page)
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'start',
  )
  await assertInSlot(page, '3', 'source', 2)
  await advanceTo(page, 'pick-0-move')
  await advanceTo(page, 'pick-1-move')
  await settled(page)
  await assertInSlot(page, '3', 'output', 0)
  await assertInSlot(page, '2', 'output', 1)
  await advanceTo(page, 'pick-2-move')
  await page.getByRole('combobox', { name: 'Jump to slide' }).selectOption('0')
  await expect(page.locator('.debug-trays')).toHaveCount(0)
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  expect(errors).toEqual([])
})

test('ranking compacts unread cards and goes straight to 52 cards', async ({
  page,
}) => {
  await openWalk(page, '7. Read the cards. Find the index.')
  await advanceTo(page, 'read-0-move')
  await settled(page)
  await assertInSlot(page, '4', 'output', 0)
  await assertInSlot(page, '3', 'source', 0)
  await assertInSlot(page, '2', 'source', 1)
  await assertInSlot(page, 'A', 'source', 2)
  await previous(page)
  await settled(page)
  await assertInSlot(page, '4', 'source', 0)
  await assertInSlot(page, '3', 'source', 1)
  await advanceTo(page, 'done')
  await next(page)
  await expect(page.locator('h1')).toHaveText('Then 52 cards')
})

test('the debugger fits a 720p presentation viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await openWalk(page, '6. Deal index 14')
  await advanceTo(page, 'pick-0-move')
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(720)
  await expect(page.locator('.talk-controls')).toBeInViewport({ ratio: 1 })
})

test('reduced motion, live preference changes, keyboard steps, and resize settle correctly', async ({
  page,
}) => {
  await openWalk(page, '5. Deal index 0')
  await page.getByRole('region', { name: 'Presentation', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.algorithm-walk')).toHaveAttribute(
    'data-frame',
    'pick-0-block',
  )
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await settled(page)
  await assertInSlot(page, 'A', 'output', 0)
  await advanceTo(page, 'pick-2-move')
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await settled(page)
  await expect
    .poll(async () => {
      const card = await page.locator('[data-card="3"]').boundingBox()
      const slot = await page
        .locator('[data-tray="output"] .debug-slot')
        .nth(2)
        .boundingBox()
      return Math.abs(card!.x - slot!.x)
    })
    .toBeLessThan(1)
  await assertInSlot(page, '3', 'output', 2)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
