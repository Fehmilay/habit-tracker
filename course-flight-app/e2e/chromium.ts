import { existsSync, readdirSync } from 'node:fs'

/**
 * Locate a usable Chromium.
 *
 * CI images often ship a pinned Playwright browser build that does not match
 * the version this project depends on, which makes Playwright refuse to launch
 * and ask for a fresh download. Rather than pulling a second copy of Chromium,
 * fall back to whatever full build is already installed.
 *
 * Returns `undefined` when Playwright's own managed browser should be used.
 */
export function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.CHROMIUM_EXECUTABLE_PATH
  if (fromEnv && existsSync(fromEnv)) return fromEnv

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return undefined

  // Full Chromium only - the headless shell lacks the GPU stack that WebGL
  // needs, even under software rendering.
  const directories = readdirSync(root).filter((entry) =>
    /^chromium(-\d+)?$/.test(entry),
  )

  for (const directory of directories) {
    const candidate = `${root}/${directory}/chrome-linux/chrome`
    if (existsSync(candidate)) return candidate
  }

  return undefined
}

/** Flags needed for software-rendered WebGL in a headless container. */
export const WEBGL_LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
]
