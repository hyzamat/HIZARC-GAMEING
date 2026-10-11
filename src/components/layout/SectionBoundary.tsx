import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Isolates each page section: if one section throws while rendering, only that
 * section disappears — the rest of the site keeps working instead of going blank.
 */
export class SectionBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Hizarc] "${this.props.name}" section crashed and was hidden.`, error, info.componentStack)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
