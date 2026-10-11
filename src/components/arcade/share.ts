import { site } from '@/config/site'

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export function scoreText(score: number) {
  const host = site.url.replace(/^https?:\/\//, '')
  return `I scored ${score} in HIZARC DASH 🎮 ${host}`
}

/** Clipboard write with an execCommand fallback for non-secure contexts / older browsers. */
async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
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

/** Native share sheet when available (phones, some desktops), otherwise copy the brag line. */
export async function shareScore(score: number): Promise<ShareResult> {
  const text = scoreText(score)
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'HIZARC DASH', text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      /* share failed for another reason — try the clipboard instead */
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}
