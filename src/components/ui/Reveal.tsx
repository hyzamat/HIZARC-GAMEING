import { motion, type HTMLMotionProps, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

/** Shared easing — "expo out": fast start, long soft landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const

type RevealProps = {
  children: ReactNode
  delay?: number
  /** Vertical travel in px (default 28). */
  y?: number
  x?: number
  /** Start slightly blurred (default false — blur is costly on phones). */
  blur?: boolean
  duration?: number
  /** Fraction of the element that must be visible (default 0.25). */
  amount?: number
  className?: string
  as?: 'div' | 'li' | 'span' | 'p' | 'section' | 'article'
} & Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView' | 'viewport' | 'transition' | 'children'>

/** Fade + slide in once when scrolled into view. */
export function Reveal({ children, delay = 0, y = 28, x = 0, blur = false, duration = 0.9, amount = 0.25, className, as = 'div', ...rest }: RevealProps) {
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp
      className={className}
      // Only touch `filter` when blurring — a lingering inline filter creates a needless
      // stacking context/compositing layer on every revealed element.
      initial={blur ? { opacity: 0, y, x, filter: 'blur(8px)' } : { opacity: 0, y, x }}
      whileInView={blur ? { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' } : { opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Comp>
  )
}

/** Parent/child variants for staggered lists: put `staggerParent` on the list, `staggerChild` on items. */
export const staggerParent = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
})

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
}
