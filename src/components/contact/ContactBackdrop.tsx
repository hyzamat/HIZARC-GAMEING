import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import type { RefObject } from 'react'
import { LOGO_PIECES, LOGO_VIEWBOX, type LogoPiece } from '@/components/brand/Logo'

type ContactBackdropProps = {
  /** The section — drives scroll-linked parallax and pauses the beam sweep when off-screen. */
  sectionRef: RefObject<HTMLElement | null>
}

/** One piece of the blueprint "H": drifts in from its own direction and locks into place mid-section. */
function BlueprintPiece({ piece, progress, still }: { piece: LogoPiece; progress: MotionValue<number>; still: boolean }) {
  const x = useTransform(progress, [0.05, 0.42], still ? [0, 0] : [piece.from.x * 0.9, 0], { clamp: true })
  const y = useTransform(progress, [0.05, 0.42], still ? [0, 0] : [piece.from.y * 0.9, 0], { clamp: true })
  const blue = piece.tone === 'blue'
  return (
    <motion.polygon
      points={piece.points}
      style={{ x, y }}
      fill={blue ? 'rgba(10,124,255,0.07)' : 'rgba(255,255,255,0.015)'}
      stroke={blue ? 'rgba(61,155,255,0.38)' : 'rgba(170,181,211,0.22)'}
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      strokeLinejoin="round"
    />
  )
}

/**
 * Contact section atmosphere (all clipped, pointer-events-none, behind content):
 * masked blueprint grid, big pre-blurred brand + violet glows, a light beam slanted at the
 * logo's 28° with a travelling glint, and a wireframe Hizarc "H" that assembles as you scroll in.
 * Only transforms/opacity animate; parallax is disabled for reduced motion.
 */
export function ContactBackdrop({ sectionRef }: ContactBackdropProps) {
  const reduce = Boolean(useReducedMotion())
  const inView = useInView(sectionRef, { margin: '0px 0px -10% 0px' })
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })

  const glowA = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-90, 90])
  const glowB = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [120, -80])
  const beamY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [140, -140])
  const markY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [80, -60])
  const markRotate = useTransform(scrollYProgress, [0, 0.42], reduce ? [0, 0] : [-6, 0], { clamp: true })

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* blueprint grid, faded out with a radial mask */}
      <div className="absolute inset-0 bg-grid opacity-80 [mask-image:radial-gradient(ellipse_80%_55%_at_50%_42%,#000_10%,transparent_72%)]" />

      {/* brand glow — top left */}
      <motion.div
        style={{ y: glowA }}
        className="absolute -top-[18%] -left-[45%] aspect-square w-[150vw] max-w-[1500px] bg-[radial-gradient(closest-side,rgba(10,124,255,0.22),rgba(10,124,255,0.07)_55%,transparent)] sm:-left-[30%] sm:w-[95vw]"
      />
      {/* ultraviolet glow — bottom right */}
      <motion.div
        style={{ y: glowB }}
        className="absolute -right-[50%] -bottom-[14%] aspect-square w-[150vw] max-w-[1500px] bg-[radial-gradient(closest-side,rgba(124,92,255,0.2),rgba(124,92,255,0.06)_55%,transparent)] sm:-right-[28%] sm:w-[90vw]"
      />
      {/* cyan kiss behind the form (desktop) */}
      <div className="absolute top-[30%] right-[6%] hidden aspect-square w-[42vw] max-w-[640px] bg-[radial-gradient(closest-side,rgba(46,230,255,0.1),transparent)] lg:block" />

      {/* light beam at the logo's 28° slant */}
      <motion.div style={{ y: beamY }} className="absolute inset-x-[-60%] top-[26%] sm:top-[22%]">
        <div className="relative h-48 rotate-[28deg] [mask-image:linear-gradient(90deg,transparent,#000_28%,#000_72%,transparent)] sm:h-72">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(125,185,255,0.05)_38%,rgba(46,230,255,0.09)_50%,rgba(125,185,255,0.05)_62%,transparent)]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan/35 to-transparent" />
          {/* travelling glint along the core */}
          {!reduce && (
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 w-1/5 bg-[linear-gradient(90deg,transparent,rgba(185,246,255,0.12),transparent)]"
                initial={{ x: '-100%' }}
                animate={inView ? { x: '520%' } : { x: '-100%' }}
                transition={inView ? { duration: 5.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2.5 } : { duration: 0 }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* wireframe "H" that assembles as the section scrolls in */}
      <motion.div
        style={{ y: markY, rotate: markRotate }}
        className="absolute -top-6 -right-[22%] w-[78vw] max-w-[620px] opacity-60 sm:-right-[8%] sm:w-[52vw] lg:top-8 lg:right-[2%] lg:w-[38vw]"
      >
        <svg viewBox={LOGO_VIEWBOX} className="h-auto w-full overflow-visible">
          {LOGO_PIECES.map((p) => (
            <BlueprintPiece key={p.id} piece={p} progress={scrollYProgress} still={reduce} />
          ))}
        </svg>
      </motion.div>

      {/* blend into the neighbouring sections */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink-950 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-ink-950 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
    </div>
  )
}
