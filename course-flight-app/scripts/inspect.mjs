import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { readdir, mkdir } from 'node:fs/promises'

async function exe() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  for (const e of (await readdir(root)).filter(n => /^chromium(-\d+)?$/.test(n))) {
    const c = `${root}/${e}/chrome-linux/chrome`
    if (existsSync(c)) return c
  }
}
await mkdir('/tmp/inspect', { recursive: true })
const browser = await chromium.launch({ executablePath: await exe(), args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 900, height: 620 }, deviceScaleFactor: 2 })
await page.goto('http://127.0.0.1:3100/', { waitUntil: 'networkidle' })
await page.waitForSelector('canvas'); await page.waitForTimeout(2200)

const hide = () => page.addStyleTag({ content: '#overlay-hide [data-testid=dev-controls],[data-testid=dev-controls],[data-testid=flight-hud]{opacity:0 !important}' })

await hide()
await page.screenshot({ path: '/tmp/inspect/aircraft-level.png', clip: { x: 230, y: 180, width: 460, height: 400 } })

// dispatchEvent bypasses the visibility check on the faded-out control
await page.getByTestId('dev-set-3').dispatchEvent('click')
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/inspect/aircraft-banking.png', clip: { x: 230, y: 180, width: 460, height: 400 } })
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/inspect/aircraft-settled.png', clip: { x: 230, y: 180, width: 460, height: 400 } })
await browser.close()
