import { useReducedMotion, type Variants } from 'framer-motion'
import { EASE_OUT } from '@/components/ui/Reveal'

const BASE = {
  floor: 0,
  glows: 0.1,
  eyebrow: 0.2,
  title: 0.28,
  emblem: 0.45,
  sub: 0.95,
  ctas: 1.1,
  pill: 1.3,
  card: 1.45,
  hud: 1.55,
}

export type HeroTiming = Record<keyof typeof BASE, number>

/**
 * Hero entrance choreography, in seconds after the preloader starts its exit
 * (useIntroDone() flips to true). One table so every layer lands in order:
 * floor → eyebrow → headline → emblem assembly → copy → CTAs → HUD.
 */
export const HERO_T: HeroTiming = BASE

/** Same order, squeezed to a fifth: reduced-motion visitors get a quick fade, not a long wait. */
const HERO_T_REDUCED = Object.fromEntries(Object.entries(BASE).map(([key, seconds]) => [key, +(seconds * 0.2).toFixed(3)])) as HeroTiming

/** The choreography table to use right now (honours prefers-reduced-motion). */
export function useHeroTiming(): HeroTiming {
  return useReducedMotion() ? HERO_T_REDUCED : HERO_T
}

/** Fade + rise, used by the copy blocks. Parent sets initial="hidden" / animate="show". */
export const heroFadeUp = (delay: number, y = 26): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration: 0.95, ease: EASE_OUT, delay } },
})

/** Plain fade, for layers that should not move (HUD, glows). */
export const heroFade = (delay: number, duration = 1.2): Variants => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration, ease: 'easeOut', delay } },
})
