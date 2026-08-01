import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'

async function exe() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  for (const e of (await readdir(root)).filter(n => /^chromium(-\d+)?$/.test(n))) {
    const c = `${root}/${e}/chrome-linux/chrome`
    if (existsSync(c)) return c
  }
}
const browser = await chromium.launch({ executablePath: await exe(), args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const logs = []
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', e => logs.push(`PAGEERROR: ${e.message}\n${e.stack}`))
await page.goto('http://127.0.0.1:3100/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
console.log('canvas count:', await page.locator('canvas').count())
console.log('fallback:', await page.locator('[data-testid=scene-fallback-2d]').count())
console.log('loading:', await page.locator('[data-testid=scene-loading]').count())
console.log(logs.join('\n---\n'))
await browser.close()
