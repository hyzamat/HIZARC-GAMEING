import { motion, type Transition, type Variants } from 'framer-motion'

const spring: Transition = { type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }

const top: Variants = { closed: { y: 0, rotate: 0 }, open: { y: 6, rotate: 45 } }
const middle: Variants = { closed: { opacity: 1, scaleX: 1 }, open: { opacity: 0, scaleX: 0 } }
const bottom: Variants = { closed: { y: 0, rotate: 0 }, open: { y: -6, rotate: -45 } }

/**
 * Three-bar hamburger (short, right-aligned middle bar) that morphs into an X.
 * `from` sets the state to animate from on mount; omit to render without a mount animation.
 */
export function MenuIcon({ open, from }: { open: boolean; from?: 'open' | 'closed' }) {
  return (
    <motion.span aria-hidden className="relative block h-3.5 w-5" initial={from ?? false} animate={open ? 'open' : 'closed'}>
      <motion.span variants={top} transition={spring} className="absolute top-0 left-0 h-0.5 w-5 rounded-full bg-current" />
      <motion.span variants={middle} transition={spring} className="absolute top-1.5 right-0 h-0.5 w-3 origin-right rounded-full bg-current" />
      <motion.span variants={bottom} transition={spring} className="absolute top-3 left-0 h-0.5 w-5 rounded-full bg-current" />
    </motion.span>
  )
}
