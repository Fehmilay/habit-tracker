import { defineConfig, devices } from '@playwright/test'
import { resolveChromiumExecutable, WEBGL_LAUNCH_ARGS } from './e2e/chromium'

const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    // Software WebGL still needs these in headless containers.
    launchOptions: {
      executablePath: resolveChromiumExecutable(),
      args: WEBGL_LAUNCH_ARGS,
    },
  },
  projects: [
    {
      name: 'iphone-se-375x667',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, isMobile: false },
    },
    {
      name: 'iphone-14-390x844',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
    {
      name: 'iphone-pro-max-430x932',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 }, isMobile: false },
    },
    {
      name: 'ipad-820x1180',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, isMobile: false },
    },
    {
      name: 'desktop-1440x900',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
