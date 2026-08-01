import { expect, test, type Page } from '@playwright/test'

async function openFresh(page: Page) {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByTestId('flight-hud')).toBeVisible()
}

async function openArea(page: Page, label: 'Habits' | 'Flug' | 'Stats') {
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: label }).click()
}

test.describe('Flight Habit product loop', () => {
  test('shows the flight as the sparse centre screen', async ({ page }) => {
    await openFresh(page)
    await expect(page.getByTestId('deviation-value')).toHaveText('0°')
    await expect(page.getByTestId('primary-action')).toBeVisible()
    await expect(page.getByTestId('play-flight')).toBeVisible()
    await expect(page.getByText('JFK', { exact: true }).first()).toBeVisible()
  })

  test('creates a habit and keeps the editor mobile-safe', async ({ page }) => {
    await openFresh(page)
    await openArea(page, 'Habits')
    await expect(page.getByTestId('habits-page')).toBeVisible()
    await page.getByRole('button', { name: 'Habit hinzufügen' }).click()
    const editor = page.getByTestId('habit-editor')
    await expect(editor).toBeVisible()
    await editor.getByLabel('Name').fill('Deep Work')
    await editor.getByLabel('Konkreter Cue').fill('25 Minuten Fokus')
    await editor.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText('Deep Work', { exact: true })).toBeVisible()
  })

  test('turns a missed habit into a real course and future impact', async ({ page }) => {
    await openFresh(page)
    await openArea(page, 'Habits')
    const rows = page.locator('.habit-row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      await rows.nth(index).getByRole('button', { name: index === 0 ? 'Nicht erledigt' : 'Erledigt', exact: true }).click()
    }
    await page.getByTestId('complete-day').click()
    await expect(page.getByTestId('sequence-overlay')).toBeVisible()
    await page.getByTestId('sequence-skip').click()
    await expect(page.getByTestId('sequence-overlay')).toHaveCount(0)
    await expect.poll(async () => (await page.getByTestId('deviation-value').textContent()) ?? '', { timeout: 30_000 }).toContain('+1')
    await openArea(page, 'Stats')
    await expect(page.getByTestId('stats-page')).toBeVisible()
    await expect(page.getByText(/neben JFK/i).first()).toBeVisible()
    await expect(page.getByText(/sauberer Tag|saubere Tage/i).first()).toBeVisible()
  })

  test('starts the thumb-controlled habit ring game', async ({ page }) => {
    await openFresh(page)
    await page.getByTestId('play-flight').click()
    await expect(page.getByTestId('game-layer')).toBeVisible()
    await expect(page.getByText('Mit dem Daumen lenken')).toBeVisible()
    await page.waitForTimeout(2300)
    const zone = page.getByTestId('thumb-zone')
    const box = await zone.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.28, { steps: 8 })
      await page.mouse.up()
    }
    await expect(page.getByText('NÄCHSTER HABIT-RING')).toBeVisible()
    await page.getByRole('button', { name: '×' }).click()
    await expect(page.getByTestId('game-layer')).toHaveCount(0)
  })
})

test.describe('mobile layout', () => {
  test('keeps the primary controls inside the viewport', async ({ page }) => {
    await openFresh(page)
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    for (const id of ['flight-cycle-timer', 'deviation-value', 'primary-action', 'play-flight']) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box).not.toBeNull()
      if (!box || !viewport) continue
      expect(box.x).toBeGreaterThanOrEqual(-0.5)
      expect(box.y).toBeGreaterThanOrEqual(-0.5)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5)
    }
  })

  test('loads without runtime console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await openFresh(page)
    await openArea(page, 'Habits')
    await openArea(page, 'Stats')
    expect(errors).toEqual([])
  })
})
