/**
 * Development screenshot harness.
 *
 * Drives the real page in Chromium and captures the scene at each of the fixed
 * Phase 1 deviations, so the aircraft, camera and course line can be reviewed
 * visually rather than assumed to be correct.
 *
 * Usage: node scripts/shoot.mjs [outputDir] [width] [height]
 */
import { chromium } from '@playwright/test'
import { mkdir, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const OUT = process.argv[2] ?? '/tmp/shots'
const WIDTH = Number(process.argv[3] ?? 390)
const HEIGHT = Number(process.argv[4] ?? 844)
const URL = 'http://127.0.0.1:3100/'

await mkdir(OUT, { recursive: true })

// Mirrors e2e/chromium.ts: prefer an already-installed full Chromium over
// asking Playwright to download a matching build.
async function resolveExecutable() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined
  const entries = await readdir(root)
  for (const entry of entries.filter((name) => /^chromium(-\d+)?$/.test(name))) {
    const candidate = `${root}/${entry}/chrome-linux/chrome`
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

const browser = await chromium.launch({
  executablePath: await resolveExecutable(),
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})

const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('canvas', { timeout: 30_000 })
// Let the camera settle and the clouds spin up.
await page.waitForTimeout(2500)

const suffix = `${WIDTH}x${HEIGHT}`

async function shoot(name) {
  await page.screenshot({ path: `${OUT}/${name}-${suffix}.png` })
}

await shoot('01-on-course')

await page.getByTestId('dev-set-1').click()
await page.waitForTimeout(2600)
await shoot('02-plus-1')

await page.getByTestId('dev-set-3').click()
await page.waitForTimeout(3000)
await shoot('03-plus-3')

// Mid-manoeuvre back to zero, to see the aircraft actually banking.
await page.getByTestId('dev-reset').click()
await page.waitForTimeout(700)
await shoot('04-correcting')

await page.waitForTimeout(3000)
await shoot('05-back-on-course')

await page.getByTestId('dev-run-sequence').click()
await page.waitForTimeout(2200)
await shoot('06-sequence-events')
await page.waitForTimeout(4200)
await shoot('07-sequence-result')

const deviation = await page.getByTestId('deviation-value').textContent()
console.log(JSON.stringify({ suffix, deviation, errors }, null, 2))

await browser.close()
