/**
 * WebGL capability detection.
 *
 * Runs once, before the heavy Three.js bundle is even requested, so a device
 * without WebGL never downloads it and gets the 2D fallback instead.
 */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')

    if (!context) return false

    // Free the context immediately - browsers cap how many can be live at once.
    const lose = (context as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()

    return true
  } catch {
    return false
  }
}
