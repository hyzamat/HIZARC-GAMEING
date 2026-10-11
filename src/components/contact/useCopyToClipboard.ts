import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

/** Legacy fallback for non-secure contexts / older browsers. */
function legacyCopy(text: string) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.top = '0'
  ta.style.left = '0'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'
  const active = document.activeElement as HTMLElement | null
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  active?.focus({ preventScroll: true })
  return ok
}

/**
 * Copy text to the clipboard (async Clipboard API with an execCommand fallback).
 * `state` flips to 'copied' / 'failed' and resets to 'idle' after `resetMs`.
 */
export function useCopyToClipboard(resetMs = 1900) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      let ok = false
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
          ok = true
        }
      } catch {
        ok = false
      }
      if (!ok) ok = legacyCopy(text)
      setState(ok ? 'copied' : 'failed')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setState('idle'), resetMs)
      return ok
    },
    [resetMs],
  )

  return { state, copy }
}
