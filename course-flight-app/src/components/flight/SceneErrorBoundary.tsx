'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface SceneErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface SceneErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches failures inside the WebGL scene - a lost context, a shader that will
 * not compile on an unusual driver, a geometry build that throws - and swaps in
 * the 2D fallback instead of blanking the whole page.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[course-flight] 3D scene failed, using 2D fallback', error, info)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
