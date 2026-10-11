import type { Transition } from 'framer-motion'
import { EASE_OUT } from '@/components/ui/Reveal'
import type { Category } from '@/data/games'

/** Filter value for the games library. */
export type GameFilter = 'All' | Category

/** Shared-element id that links a card's key art to the modal header art. */
export const artLayoutId = (slug: string) => `game-art-${slug}`

/** Timing of the card → modal "expand" (and the reverse on close). */
export const SHARED_ART_TRANSITION: Transition = { duration: 0.7, ease: EASE_OUT }

/** Springy re-flow used when the grid is filtered. */
export const GRID_LAYOUT_SPRING: Transition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }

/** `#rrggbb` + alpha (0–1) → `#rrggbbaa`. Palettes in data/games are 6-digit hex. */
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex.slice(0, 7)}${a}`
}

/** 5 → "05" for HUD counters. */
export const pad2 = (n: number) => String(n).padStart(2, '0')

/** True for links that are still placeholders ('#'). */
export const isPlaceholderHref = (href: string) => href.trim() === '#'

/** True for absolute http(s) links — those open in a new tab. */
export const isExternalHref = (href: string) => /^https?:\/\//i.test(href.trim())
