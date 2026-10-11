import { motion, useReducedMotion, type MotionValue } from 'framer-motion'
import { ParticleField } from './ParticleField'
import { heroFade, useHeroTiming } from './timing'

type HeroBackdropProps = {
  /** Intro finished — layers may enter. */
  play: boolean
  /** Hero is on screen — runs the particle loop. */
  active: boolean
  /** Scroll-linked zoom applied to the whole backdrop (omit for reduced motion). */
  scale?: MotionValue<number>
}

/**
 * Hero background, back → front:
 *  (a) ink base + three huge pre-blurred radial glows drifting out of phase,
 *  (b) a perspective "arena floor" grid flowing toward the viewer + glowing horizon,
 *  (c) a small canvas star/mote drift (skipped for reduced motion),
 *  (d) two shooting streaks on the logo's 28° slant, vignette and a bottom fade.
 * All loops are transform/opacity only. Decorative — hidden from assistive tech.
 */
export function HeroBackdrop({ play, active, scale }: HeroBackdropProps) {
  const reduce = useReducedMotion() === true
  const t = useHeroTiming()

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink-950 will-change-transform"
      style={scale ? { scale } : undefined}
      initial="hidden"
      animate={play ? 'show' : 'hidden'}
    >
      {/* (a) Glows */}
      <motion.div variants={heroFade(t.glows, 1.8)} className="absolute inset-0">
        <div className="absolute -top-[18%] -right-[45%] size-[135vw] max-h-[1150px] max-w-[1150px] animate-[hz-drift-a_22s_ease-in-out_infinite] rounded-full bg-[radial-gradient(closest-side,rgba(10,124,255,0.4),rgba(10,124,255,0.1)_55%,transparent)] lg:-top-[30%] lg:-right-[8%] lg:size-[78vw]" />
        <div className="absolute top-[22%] -left-[55%] size-[120vw] max-h-[1000px] max-w-[1000px] animate-[hz-drift-b_27s_ease-in-out_infinite] rounded-full bg-[radial-gradient(closest-side,rgba(124,92,255,0.3),rgba(124,92,255,0.07)_55%,transparent)] lg:top-[8%] lg:-left-[18%] lg:size-[62vw]" />
        <div className="absolute -bottom-[20%] left-1/2 h-[60%] w-[150vw] max-w-[1600px] -translate-x-1/2 animate-[hz-drift-c_18s_ease-in-out_infinite] rounded-[50%] bg-[radial-gradient(closest-side,rgba(46,230,255,0.2),rgba(10,124,255,0.08)_55%,transparent)]" />
      </motion.div>

      {/* (b) Arena floor */}
      <ArenaFloor delay={t.floor} />

      {/* (c) Star / mote drift */}
      {!reduce && (
        <motion.div variants={heroFade(t.floor + 0.3, 2)} className="absolute inset-0">
          <ParticleField active={active && play} />
        </motion.div>
      )}

      {/* (d) Streaks along the brand slant */}
      <div className="absolute top-[24%] -left-[10%] h-px w-[38vw] -rotate-[28deg] overflow-visible">
        <span className="block h-full w-full animate-[hz-streak_9s_ease-in-out_3s_infinite] bg-gradient-to-r from-transparent via-cyan/70 to-transparent opacity-0" />
      </div>
      <div className="absolute top-[58%] left-[20%] hidden h-px w-[30vw] -rotate-[28deg] md:block">
        <span className="block h-full w-full animate-[hz-streak_11s_ease-in-out_7s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0" />
      </div>

      {/* Faint blueprint grid in the upper half, masked into the glows */}
      <div className="absolute inset-x-0 top-0 h-[70%] bg-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_70%_20%,#000,transparent)]" />

      {/* Vignette + bottom fade into the page */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_38%,transparent_48%,rgba(3,5,12,0.88)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-ink-950/50 to-ink-950 sm:h-44" />
    </motion.div>
  )
}

/**
 * CSS 3D floor: a wide plane hinged at the horizon and tipped toward the viewer
 * (perspective ≈ its own height, so the near edge always lands below the fold
 * while every point stays in front of the camera). The grid layer inside slides
 * one cell per loop → lines flow toward you. Masked to fade into the horizon.
 */
function ArenaFloor({ delay }: { delay: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 70 },
        show: { opacity: 1, y: 0, transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1], delay } },
      }}
      className="absolute inset-x-0 bottom-0 h-[30svh] opacity-60 sm:h-[36svh] sm:opacity-75 lg:h-[32svh] lg:opacity-100"
    >
      <div className="absolute inset-0 overflow-hidden [perspective-origin:50%_0%] [perspective:30svh] sm:[perspective:36svh] lg:[perspective:32svh]">
        <div className="absolute -inset-x-full top-0 h-[94%] origin-top [mask-image:linear-gradient(to_bottom,transparent,#000_30%)] [transform:rotateX(70deg)]">
          <div className="absolute inset-x-0 -top-16 bottom-0 animate-[hz-floor_1.8s_linear_infinite] bg-[linear-gradient(to_right,rgba(61,155,255,0.5)_2px,transparent_2px),linear-gradient(to_bottom,rgba(61,155,255,0.5)_2px,transparent_2px)] bg-[size:64px_64px] bg-[position:center_top]" />
        </div>
      </div>

      {/* Horizon: hairline + bloom */}
      <div className="absolute inset-x-[8%] -top-14 h-28 animate-[hz-breathe_6s_ease-in-out_infinite] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(46,230,255,0.3),rgba(10,124,255,0.1)_55%,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/55 to-transparent" />
      <div className="absolute top-0 left-1/2 h-px w-[40%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-55" />
    </motion.div>
  )
}
