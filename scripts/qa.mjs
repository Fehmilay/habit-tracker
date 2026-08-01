import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const output = 'test-results/visual-qa'
await mkdir(output, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`))

await page.addInitScript(() => window.localStorage.clear())
await page.goto('http://127.0.0.1:3100/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(12_000)
await page.screenshot({ path: `${output}/01-flight.png` })

const result = {
  canvasCount: await page.locator('canvas').count(),
  fallbackCount: await page.getByTestId('scene-fallback-2d').count(),
  loadingCount: await page.getByText('Flugszene wird geladen').count(),
  title: await page.title(),
  errors,
}

if (await page.getByRole('navigation', { name: 'Bereiche' }).count()) {
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Habits' }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${output}/02-habits.png` })
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Stats' }).click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${output}/03-stats.png` })
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Flug' }).click()
  await page.waitForTimeout(700)
  await page.getByTestId('play-flight').click()
  await page.waitForTimeout(3200)
  await page.screenshot({ path: `${output}/04-game.png` })
}

console.log(JSON.stringify(result, null, 2))
await browser.close()
