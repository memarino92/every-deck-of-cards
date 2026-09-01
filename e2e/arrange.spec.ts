import { expect, test, type Page } from '@playwright/test'

async function useFixedRandom(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, 'getRandomValues', {
      configurable: true,
      value(array: Uint8Array) {
        array.fill(0)
        array[array.length - 1] = 42
        return array
      },
    })
  })
}

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
    const movedDeckNumber = (await number.textContent())
      ?.replace('Deck number', '')
      .replaceAll(',', '')
    await expect(page).toHaveURL(
      new RegExp(`[?&]deck=${movedDeckNumber ?? 'missing'}(?:&|$)`),
    )
    await page.getByRole('button', { name: 'Reset deck' }).click()
    await expect(number).toHaveText('Deck number1')
    await expect(page).toHaveURL(/[?&]deck=1(?:&|$)/)
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

  test('reorders with keyboard activation', async ({ page }) => {
    await page.goto('/arrange')

    const ace = page.getByRole('button', { name: 'Select ace of spades' })
    await ace.focus()
    await expect(ace).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: 'Cancel moving ace of spades' }),
    ).toHaveAttribute('aria-pressed', 'true')

    const two = page.getByRole('button', {
      name: /Move selected card to position 2, before two of spades/,
    })
    await two.focus()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('status')).not.toHaveText('Deck number1')
    await expect(page).toHaveURL(/[?&]deck=(?!1(?:&|$))[0-9]+(?:&|$)/)
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

  test('long presses to drag while short movement pans on touch', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'vibrate', {
        configurable: true,
        value(duration: number) {
          ;(
            globalThis as typeof globalThis & { dragHapticDuration?: number }
          ).dragHapticDuration = duration
          return true
        },
      })
    })
    await page.setViewportSize({ width: 390, height: 844 })
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setTouchEmulationEnabled', {
      enabled: true,
      maxTouchPoints: 1,
    })
    await page.goto('/arrange')

    const ace = page.getByRole('button', { name: 'Select ace of hearts' })
    const five = page.getByRole('button', { name: 'Select five of hearts' })
    const [aceBox, fiveBox] = await Promise.all([
      ace.boundingBox(),
      five.boundingBox(),
    ])
    if (aceBox === null || fiveBox === null) {
      throw new Error('Arrange touch geometry is unavailable')
    }

    const start = { x: aceBox.x + 6, y: aceBox.y + 12 }
    const end = { x: fiveBox.x + 6, y: fiveBox.y + 12 }
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [start],
    })
    await page.waitForTimeout(450)
    await expect(ace).toHaveClass(/dragging/)
    expect(
      await page.evaluate(
        () =>
          (globalThis as typeof globalThis & { dragHapticDuration?: number })
            .dragHapticDuration,
      ),
    ).toBe(12)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [end],
    })
    await expect(page.getByRole('status')).not.toHaveText('Deck number1')
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect(ace).not.toHaveClass(/dragging/)

    await page.getByRole('button', { name: 'Reset deck' }).click()
    const spread = page.locator('.arrange-spread')
    const spreadBox = await spread.boundingBox()
    if (spreadBox === null) {
      throw new Error('Arrange spread geometry is unavailable')
    }

    const panStart = {
      x: spreadBox.x + spreadBox.width - 30,
      y: aceBox.y + 12,
    }
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [panStart],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: panStart.x - 120, y: panStart.y }],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })

    expect(
      await spread.evaluate((element) => element.scrollLeft),
    ).toBeGreaterThan(0)
    await expect(page.getByRole('status')).toHaveText('Deck number1')
  })

  test('animates to the exact randomly drawn deck', async ({ page }) => {
    await useFixedRandom(page)
    await page.goto('/arrange')

    await page.getByRole('button', { name: 'Shuffle' }).click()
    await expect(page.locator('.arrange')).toHaveAttribute('data-shuffling', '')
    await expect(page.getByRole('status')).toHaveText('Deck numberShuffling...')

    await expect(page.locator('.arrange')).not.toHaveAttribute(
      'data-shuffling',
      /.*/,
    )
    await expect(page.getByRole('status')).toHaveText('Deck number43')
    await expect(page).toHaveURL(/[?&]deck=43(?:&|$)/)

    const ace = page.getByRole('button', { name: 'Select ace of spades' })
    const aceBox = await ace.boundingBox()
    if (aceBox === null) {
      throw new Error('Shuffled drag geometry is unavailable')
    }
    await page.mouse.move(aceBox.x + 6, aceBox.y + 12)
    await page.mouse.down()
    await page.mouse.move(aceBox.x + 13, aceBox.y + 12)
    await expect(ace).toHaveClass(/dragging/)
    expect((await ace.boundingBox())?.y).toBeLessThan(aceBox.y)
    await page.mouse.up()
  })

  test('opens shared deck links and follows deck history', async ({ page }) => {
    await page.goto('/arrange?deck=43')

    await expect(page.getByRole('status')).toHaveText('Deck number43')
    await page.getByRole('button', { name: 'Reset deck' }).click()
    await expect(page).toHaveURL(/[?&]deck=1(?:&|$)/)
    await expect(page.getByRole('status')).toHaveText('Deck number1')

    await page.goBack()
    await expect(page).toHaveURL(/[?&]deck=43(?:&|$)/)
    await expect(page.getByRole('status')).toHaveText('Deck number43')
  })

  test('cancels a shuffle on reset and honors reduced motion', async ({
    page,
  }) => {
    await useFixedRandom(page)
    await page.goto('/arrange')

    await page.getByRole('button', { name: 'Shuffle' }).click()
    await expect(page.locator('.arrange')).toHaveAttribute('data-shuffling', '')
    await page.getByRole('button', { name: 'Reset deck' }).click()
    await expect(page.locator('.arrange')).not.toHaveAttribute(
      'data-shuffling',
      /.*/,
    )
    await expect(page.getByRole('status')).toHaveText('Deck number1')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Shuffle' }).click()
    await expect(page.locator('.arrange')).not.toHaveAttribute(
      'data-shuffling',
      /.*/,
    )
    await expect(page.getByRole('status')).toHaveText('Deck number43')
  })
})
