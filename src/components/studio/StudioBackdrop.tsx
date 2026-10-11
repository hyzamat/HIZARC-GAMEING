import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { LogoMark } from '@/components/brand/Logo'

/**
 * Atmosphere for the Studio section: blueprint grid, colour pools and an enormous faint logo that
 * drifts against the scroll. Clipped in its own layer so the section can keep sticky children.
 */
export function StudioBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const markY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '12%'])

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(75%_32%_at_50%_0%,#000_10%,transparent_75%)]" />
      <div className="absolute top-[4%] -left-56 h-[40rem] w-[40rem] bg-[radial-gradient(closest-side,rgb(10_124_255/0.16),transparent)]" />
      <div className="absolute top-[40%] -right-60 h-[48rem] w-[48rem] bg-[radial-gradient(closest-side,rgb(124_92_255/0.15),transparent)]" />
      <div className="absolute bottom-[8%] left-[14%] h-[34rem] w-[44rem] bg-[radial-gradient(closest-side,rgb(46_230_255/0.07),transparent)]" />

      <motion.div style={{ y: markY }} className="absolute top-[14%] -right-24 w-[30rem] text-white/[0.03] sm:w-[40rem] lg:-right-10 lg:w-[52rem]">
        <LogoMark variant="mono" title="" />
      </motion.div>
    </div>
  )
}
