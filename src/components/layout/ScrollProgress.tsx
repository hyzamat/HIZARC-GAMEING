import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'

/**
 * Hairline reading-progress bar pinned to the very top of the viewport.
 * Spring-smoothed, brand → cyan → violet, with a bright "spark" riding the
 * leading edge. Fades out completely at the top of the page so it never sits
 * over the hero on load.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const spring = useSpring(scrollYProgress, { stiffness: 160, damping: 28, mass: 0.35, restDelta: 0.0005 })
  // Reduced motion: follow the scroll position exactly, no spring lag.
  const progress = reduce ? scrollYProgress : spring
  const opacity = useTransform(scrollYProgress, [0, 0.006, 0.03], [0, 0, 1])
  // The spark wrapper is full-width and translated by the progress, so its
  // right edge always sits exactly on the end of the bar.
  const sparkX = useTransform(progress, (v) => `${(v - 1) * 100}%`)

  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-3 overflow-hidden" style={{ opacity }}>
      <motion.div
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-brand via-cyan to-violet shadow-[0_0_10px_rgba(46,230,255,0.55)]"
        style={{ scaleX: progress }}
      />
      <motion.div className="absolute inset-x-0 top-0 h-3" style={{ x: sparkX }}>
        <span className="absolute top-0 right-0 h-[2px] w-16 bg-gradient-to-r from-transparent to-white" />
        <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-[radial-gradient(circle,rgba(185,246,255,0.95),rgba(46,230,255,0.35)_45%,transparent_70%)]" />
      </motion.div>
    </motion.div>
  )
}
