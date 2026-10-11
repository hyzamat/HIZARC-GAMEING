import type Lenis from 'lenis'

/**
 * Global scroll helpers. The <SmoothScroll> provider registers the Lenis
 * instance here; everything else should use these helpers instead of
 * touching window.scrollTo directly so smooth scrolling stays consistent.
 */

let lenis: Lenis | null = null
let lockCount = 0

export function registerLenis(instance: Lenis | null) {
  lenis = instance
}

export function getLenis() {
  return lenis
}

/** Header height to offset anchor scrolling by. */
export const NAV_OFFSET = 72

/**
 * Smooth-scroll to a section id ("games" or "#games"), an element, or a y position.
 * Falls back to native scrolling when Lenis is disabled (reduced motion).
 */
export function scrollToTarget(target: string | HTMLElement | number, opts: { offset?: number; immediate?: boolean } = {}) {
  const offset = opts.offset ?? (typeof target === 'number' ? 0 : -NAV_OFFSET + 8)
  let el: HTMLElement | number | null = null
  if (typeof target === 'string') {
    const id = target.replace(/^#/, '')
    el = id === '' || id === 'top' ? 0 : document.getElementById(id)
  } else {
    el = target
  }
  if (el === null) return

  if (lenis) {
    lenis.scrollTo(el, { offset: el === 0 ? 0 : offset, immediate: opts.immediate, duration: 1.4 })
    return
  }
  const y = typeof el === 'number' ? el : el.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' })
}

/**
 * Lock page scroll (modals, mobile menu). Reference-counted so nested locks work.
 * Always pair with unlockScroll().
 */
export function lockScroll() {
  lockCount++
  if (lockCount > 1) return
  lenis?.stop()
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  document.documentElement.style.overflow = 'hidden'
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return
  document.documentElement.style.overflow = ''
  document.body.style.paddingRight = ''
  lenis?.start()
}
