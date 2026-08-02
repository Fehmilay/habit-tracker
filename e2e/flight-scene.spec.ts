import { expect, test, type Page } from '@playwright/test'

async function openFresh(page: Page) {
  await page.addInitScript(() => window.localStorage.clear())
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 45_000 })
  await expect(page.getByTestId('flight-hud')).toBeVisible()
  // The track springs into its initial position on mount too, so measurements
  // taken immediately after load are just as stale as after a page change.
  await waitForTrackToSettle(page)
}

const PAGE_TEST_IDS = { Habits: 'habits-page', Flug: 'flight-hud', Stats: 'stats-page' } as const

async function openArea(page: Page, label: keyof typeof PAGE_TEST_IDS) {
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: label }).click()
  // The track slides in on a spring. Anything that measures an element before
  // it settles reads a coordinate the element has already moved away from,
  // which makes coordinate-based interactions land on empty space.
  await waitForTrackToSettle(page)
  // Belt and braces: the track being still is only useful if it stopped over
  // the page we asked for, so check the page itself is actually on screen.
  await expect
    .poll(async () => (await page.getByTestId(PAGE_TEST_IDS[label]).boundingBox())?.x ?? -1, {
      timeout: 10_000,
    })
    .toBeGreaterThanOrEqual(-0.5)
}

/**
 * Waits until the sliding track has actually stopped moving.
 *
 * Two samples are not enough: the spring is sampled by rAF, so any two reads
 * can land inside the same frame and look identical while the track is still
 * mid-flight. That produced bounding boxes with a negative x - a coordinate the
 * element had already left - and clicks that landed on nothing. Requiring
 * several consecutive identical samples means the track has held still across
 * multiple frames, which the animation never does while running.
 */
const SETTLED_SAMPLES = 4

async function waitForTrackToSettle(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(async (samples: number) => {
          const track = document.querySelector('.app-track')!
          const read = () =>
            new Promise<string>((resolve) => {
              requestAnimationFrame(() => resolve(getComputedStyle(track).transform))
            })

          const first = await read()
          for (let index = 1; index < samples; index += 1) {
            if ((await read()) !== first) return false
          }
          return true
        }, SETTLED_SAMPLES),
      { timeout: 10_000, intervals: [100] },
    )
    .toBe(true)
}

/** Long enough to trip useLongPress (480ms) with margin for a slow renderer. */
const HOLD_MS = 900

test.describe('Flight Habit product loop', () => {
  test('shows the flight as the sparse centre screen', async ({ page }) => {
    await openFresh(page)
    await expect(page.getByTestId('deviation-value')).toHaveText('0°')
    await expect(page.getByTestId('primary-action')).toBeVisible()
    await expect(page.getByText('JFK', { exact: true }).first()).toBeVisible()
  })

  test('the flight needs no starting - it is already running', async ({ page }) => {
    await openFresh(page)
    // There is no start button of any kind any more.
    await expect(page.getByTestId('play-flight')).toHaveCount(0)
    // And the steering surface is live immediately.
    await expect(page.getByTestId('thumb-zone')).toBeVisible()
  })

  test('flies habit rings on its own and accumulates progress', async ({ page }) => {
    await openFresh(page)

    const ringsFlown = async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('course-flight-journey-v2')
        if (!raw) return 0
        return JSON.parse(raw).state?.progress?.ringsFlown ?? 0
      })

    // Nothing is clicked here on purpose: rings must be scored by the endless
    // loop itself, with no interaction at all.
    await expect
      .poll(ringsFlown, { timeout: 60_000, intervals: [1000] })
      .toBeGreaterThan(0)
  })

  test('creates a habit and keeps the editor mobile-safe', async ({ page }) => {
    await openFresh(page)
    await openArea(page, 'Habits')
    await expect(page.getByTestId('habits-page')).toBeVisible()
    await page.getByRole('button', { name: 'Habit hinzufügen' }).click()
    const editor = page.getByTestId('habit-editor')
    await expect(editor).toBeVisible()
    await editor.getByLabel('Name').fill('Deep Work')
    await editor.getByRole('button', { name: 'Weiter' }).click()
    await editor.getByRole('button', { name: 'Weiter' }).click()
    await editor.getByRole('button', { name: 'Sichern' }).click()
    // Scoped to the habits page: the name also appears in the Stats panel's
    // habit-influence list, which makes an unscoped match ambiguous.
    await expect(
      page.getByTestId('habits-page').getByText('Deep Work', { exact: true }),
    ).toBeVisible()
  })

  test('opens the habit editor on hold, but not on a tap', async ({ page }) => {
    await openFresh(page)
    await openArea(page, 'Habits')

    const row = page.locator('.habit-copy').first()
    const box = await row.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2

    // A tap must not open the editor - rating is the common action here.
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(400)
    await expect(page.getByTestId('habit-editor')).toHaveCount(0)

    // Holding does.
    await page.mouse.down()
    await page.waitForTimeout(HOLD_MS)
    await page.mouse.up()
    await expect(page.getByTestId('habit-editor')).toBeVisible()
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
    // The readout is deliberately unsigned-negative: it frames deviation as
    // ground lost against the goal ("1 degree off"), not as a signed heading,
    // so a drift in either direction reads as a minus.
    await expect
      .poll(async () => (await page.getByTestId('deviation-value').textContent()) ?? '', {
        timeout: 30_000,
      })
      .toContain('1°')
    await openArea(page, 'Stats')
    await expect(page.getByTestId('stats-page')).toBeVisible()
    await expect(page.getByText(/neben JFK/i).first()).toBeVisible()
  })
})

/**
 * Input layering.
 *
 * These exist because this broke twice. The sliding Habits/Flight/Stats track
 * covers the whole viewport, so whichever of it, the HUD or the steering
 * surface wins a touch is decided entirely by z-order and pointer-events.
 * Getting that wrong once made every HUD button untappable, and getting it
 * wrong the other way made the aircraft unsteerable and turned steering drags
 * into page swipes.
 */
test.describe('input layering', () => {
  test('a drag in the lower half steers instead of swiping pages', async ({ page }) => {
    await openFresh(page)

    const zone = page.getByTestId('thumb-zone')
    const box = await zone.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    const x = box.x + box.width / 2
    const y = box.y + box.height / 2

    // The steering surface must actually be the element under the finger.
    const target = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px, py)?.className?.toString() ?? '',
      [x, y],
    )
    expect(target).toContain('thumb-zone')

    const trackBefore = await page.evaluate(
      () => getComputedStyle(document.querySelector('.app-track')!).transform,
    )

    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 90, y - 30, { steps: 8 })
    await page.waitForTimeout(250)

    // The stick has engaged and followed the drag.
    const stick = await page.evaluate(() => {
      const element = document.querySelector('.thumb-stick')!
      return {
        active: element.getAttribute('data-active'),
        transform: getComputedStyle(element).transform,
      }
    })
    expect(stick.active).toBe('true')
    expect(stick.transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)')

    await page.mouse.up()
    await page.waitForTimeout(400)

    // ...and the page did not slide while doing it.
    const trackAfter = await page.evaluate(
      () => getComputedStyle(document.querySelector('.app-track')!).transform,
    )
    expect(trackAfter).toBe(trackBefore)
  })

  test('HUD controls stay tappable above the steering surface', async ({ page }) => {
    await openFresh(page)
    await page.getByTestId('primary-action').click()
    await expect(page.getByTestId('habits-page')).toBeVisible()
  })

  test('habit controls on the side pages still respond', async ({ page }) => {
    await openFresh(page)
    await openArea(page, 'Habits')
    const rate = page.locator('.habit-row').first().getByRole('button', { name: 'Erledigt', exact: true })
    await rate.click()
    await expect(rate).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('mobile layout', () => {
  test('keeps the primary controls inside the viewport', async ({ page }) => {
    await openFresh(page)
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    for (const id of ['flight-cycle-timer', 'deviation-value', 'primary-action']) {
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
