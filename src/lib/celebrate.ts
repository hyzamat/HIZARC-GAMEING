/**
 * Tiny celebration event bus. Anything can fire `celebrate()` — the contact
 * form on success, the arcade on a new best, the Konami easter egg — and the
 * single mounted <Celebration /> layer (components/fx) renders the confetti
 * burst + optional HUD label. With no subscriber mounted it is a no-op.
 */

export type CelebrateIntensity = 'small' | 'big'

export type CelebrateOptions = {
  /** Burst origin in viewport px (clientX). Defaults to the screen centre. */
  x?: number
  /** Burst origin in viewport px (clientY). Defaults to the screen centre. */
  y?: number
  /** 'small' ≈ 50 pieces from the origin; 'big' ≈ 160 pieces + a shockwave ring. Default 'small'. */
  intensity?: CelebrateIntensity
  /** Optional centred HUD label, e.g. 'CHEAT CODE ACTIVATED · +30 LIVES' (text after " · " becomes a sub-line). */
  label?: string
  /** Announce the label to screen readers (default true). Pass false when the caller announces itself. */
  announce?: boolean
}

type Listener = (opts: CelebrateOptions) => void

const listeners = new Set<Listener>()

/** Fire a celebration burst. */
export function celebrate(opts: CelebrateOptions = {}) {
  listeners.forEach((l) => l(opts))
}

/** Subscribe to celebrations. Returns an unsubscribe function. */
export function onCelebrate(cb: Listener) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Viewport centre of an element — handy as a burst origin: `celebrate({ ...centerOf(btn), label })`. */
export function centerOf(el: Element | null | undefined): { x?: number; y?: number } {
  if (!el) return {}
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
