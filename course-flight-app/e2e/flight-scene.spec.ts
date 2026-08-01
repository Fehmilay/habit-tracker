import { expect, test, type Page } from '@playwright/test'

/**
 * Phase 1 acceptance checks.
 *
 * These run at every viewport in playwright.config.ts, so each assertion is
 * effectively repeated at 375x667, 390x844, 430x932, iPad and desktop. That is
 * the mobile check the brief asks for: rather than eyeballing five screenshots,
 * the layout and the flight behaviour are asserted at all five sizes.
 */

/** Wait for the 3D scene to mount and the camera to settle. */
async function openScene(page: Page) {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(2000)
}

/** Numeric value behind the deviation readout, e.g. "+2,5°" -> 2.5. */
async function readDeviation(page: Page): Promise<number> {
  const text = (await page.getByTestId('deviation-value').textContent()) ?? ''
  const normalised = text.replace('−', '-').replace(',', '.').replace('°', '').trim()
  return Number(normalised)
}

/**
 * Wait until the aircraft has settled on a heading.
 *
 * Polls rather than waiting a fixed time on purpose. The flight model clamps
 * each step to 1/20s so a stalled tab cannot make it jump, which means that on
 * a slow renderer - software WebGL at desktop resolution, for instance - the
 * manoeuvre plays out in slow motion. A fixed wait would make these tests a
 * measure of the CI machine's frame rate rather than of the flight behaviour.
 */
async function expectSettledAt(page: Page, degrees: number) {
  await expect
    .poll(() => readDeviation(page), { timeout: 30_000, intervals: [250] })
    .toBeCloseTo(degrees, 1)
}

test.describe('flight scene', () => {
  test('renders the 3D scene rather than the 2D fallback', async ({ page }) => {
    await openScene(page)

    await expect(page.getByTestId('scene-fallback-2d')).toHaveCount(0)
    await expect(page.getByTestId('flight-hud')).toBeVisible()

    // A canvas that never painted would report zero drawing-buffer size.
    const size = await page.locator('canvas').evaluate((node) => {
      const canvas = node as HTMLCanvasElement
      return { width: canvas.width, height: canvas.height }
    })
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
  })

  test('starts on course at 0 degrees', async ({ page }) => {
    await openScene(page)

    await expect(page.getByTestId('deviation-value')).toHaveText('0°')
    await expect(page.getByTestId('deviation-status')).toHaveText('Auf Kurs')
  })

  test('shows the journey readouts from the brief', async ({ page }) => {
    await openScene(page)

    await expect(page.getByTestId('remaining-distance')).toHaveText(
      '5.840 KM VERBLEIBEND',
    )
    await expect(page.getByTestId('journey-day')).toHaveText('TAG 18 VON 90')
    await expect(page.getByTestId('goal-projection')).toHaveText('74 %')

    for (const item of ['flug', 'verlauf', 'ziel', 'einstellungen']) {
      await expect(page.getByTestId(`nav-${item}`)).toBeVisible()
    }
  })

  test('turns to +1 degree and settles there', async ({ page }) => {
    await openScene(page)

    await page.getByTestId('dev-set-1').click()
    await expectSettledAt(page, 1)

    await expect(page.getByTestId('deviation-status')).toHaveText(
      'Leichte Kursabweichung',
    )
  })

  test('turns to +3 degrees and settles there', async ({ page }) => {
    await openScene(page)

    await page.getByTestId('dev-set-3').click()
    await expectSettledAt(page, 3)

    await expect(page.getByTestId('deviation-status')).toHaveText(
      'Deutliche Kursabweichung',
    )
  })

  test('animates the turn rather than jumping to the new course', async ({ page }) => {
    await openScene(page)

    await page.getByTestId('dev-set-3').click()

    // Wait for the turn to have started, then assert it has not finished:
    // an instant rotation would already read the full +3 at this point.
    await expect
      .poll(() => readDeviation(page), { timeout: 20_000, intervals: [60] })
      .toBeGreaterThan(0.2)

    expect(await readDeviation(page)).toBeLessThan(3)
  })

  test('corrects from +3 degrees back to exactly 0', async ({ page }) => {
    await openScene(page)

    await page.getByTestId('dev-set-3').click()
    await expectSettledAt(page, 3)

    await page.getByTestId('dev-reset').click()
    await expectSettledAt(page, 0)

    await expect(page.getByTestId('deviation-value')).toHaveText('0°')
    await expect(page.getByTestId('deviation-status')).toHaveText('Auf Kurs')
  })

  test('runs the day animation preview and returns to the flight view', async ({
    page,
  }) => {
    await openScene(page)

    await page.getByTestId('dev-run-sequence').click()

    await expect(page.getByTestId('sequence-overlay')).toBeVisible()
    await expect(page.getByTestId('sequence-skip')).toBeVisible()

    // The demo day is +1, +1, -1 degrees, so it ends one degree off course.
    await expect(page.getByTestId('sequence-overlay')).toHaveCount(0, {
      timeout: 30_000,
    })
    await expectSettledAt(page, 1)
  })

  test('the day animation can be skipped', async ({ page }) => {
    await openScene(page)

    await page.getByTestId('dev-run-sequence').click()
    await expect(page.getByTestId('sequence-skip')).toBeVisible()
    await page.getByTestId('sequence-skip').click()

    await expect(page.getByTestId('sequence-overlay')).toHaveCount(0)
    await expectSettledAt(page, 1)
  })
})

test.describe('layout', () => {
  test('never scrolls horizontally', async ({ page }) => {
    await openScene(page)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('keeps every HUD element inside the viewport', async ({ page }) => {
    await openScene(page)

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()

    const ids = [
      'deviation-value',
      'remaining-distance',
      'journey-day',
      'goal-projection',
      'primary-action',
      'nav-einstellungen',
    ]

    for (const id of ids) {
      const box = await page.getByTestId(id).boundingBox()
      expect(box, `${id} should have a layout box`).not.toBeNull()
      if (!box || !viewport) continue

      expect(box.x, `${id} clipped on the left`).toBeGreaterThanOrEqual(-0.5)
      expect(box.y, `${id} clipped at the top`).toBeGreaterThanOrEqual(-0.5)
      expect(box.x + box.width, `${id} clipped on the right`).toBeLessThanOrEqual(
        viewport.width + 0.5,
      )
      expect(box.y + box.height, `${id} clipped at the bottom`).toBeLessThanOrEqual(
        viewport.height + 0.5,
      )
    }
  })

  test('the dev controls do not cover the aircraft', async ({ page }) => {
    await openScene(page)

    const viewport = page.viewportSize()
    const controls = await page.getByTestId('dev-controls').boundingBox()
    expect(controls).not.toBeNull()
    if (!controls || !viewport) return

    // The aircraft sits in the lower-middle of the frame, around 55-70% down.
    // The dev scaffold must stay below it or it hides what it exists to show.
    expect(controls.y).toBeGreaterThan(viewport.height * 0.66)
  })

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await openScene(page)
    await page.getByTestId('dev-set-3').click()
    await expectSettledAt(page, 3)

    expect(errors).toEqual([])
  })
})
