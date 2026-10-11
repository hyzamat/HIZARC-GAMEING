import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
import '@/components/hero/hero.css'
import { EASE_OUT } from '@/components/ui/Reveal'
import { engines, platformsWeBuildFor } from '@/config/site'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

const VERBS = ['Play', 'Create', 'Compete', 'Conquer', 'Explore', 'Level up']

/** Engines + platforms from the site config, as shown on the second band. */
const TECH: { text: string; hot: boolean }[] = [...engines, ...platformsWeBuildFor].map((raw) => {
  const text = raw === 'Web / WebGL' ? 'WebGL' : raw === 'iOS' ? raw : raw.toUpperCase()
  // a few words are filled cyan, the rest stay outlined
  return { text, hot: ['UNREAL ENGINE', 'PC', 'AR / VR'].includes(text) }
})

const SR_TEXT = `${VERBS.join(', ')}. Hizarc Games builds in ${engines.join(' and ')} for ${platformsWeBuildFor.join(', ')}.`

/* ------------------------------------------------------------------ */
/*  Geometry                                                          */
/*                                                                    */
/*  Band height --h; the two bands are rotated -2° / +1.5°, so at the */
/*  viewport edge they drift ±tan(angle)·50vw off their centre line.  */
/*  They are stacked so they touch/overlap a little on the left and   */
/*  fan apart toward the right (a shallow wedge): always readable,    */
/*  never clipped, and ~120px tall on a phone.                        */
/* ------------------------------------------------------------------ */

const WRAP_STYLE: CSSProperties = { height: 'calc(1.7 * var(--h) + 6.12vw + 20px)' }
const ROW1_STYLE: CSSProperties = { top: 'calc(1.75vw + 10px)' }
const ROW2_STYLE: CSSProperties = { top: 'calc(4.81vw + 10px + 0.7 * var(--h))' }

/** A slanted parallelogram — a nod to the Hizarc "H" crossbar (28° cut). */
function Slash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 28" aria-hidden className={cn('h-[0.82em] w-auto shrink-0', className)} xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,0 24,13 24,28 0,15" fill="currentColor" />
    </svg>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* ------------------------------------------------------------------ */
/*  Marquee row                                                       */
/* ------------------------------------------------------------------ */

type MarqueeRowProps = {
  /** 1 = content travels left, -1 = travels right. */
  dir: 1 | -1
  /** Base speed in px/s. */
  speed: number
  /** Live multiplier driven by scroll velocity. */
  boost: MotionValue<number>
  /** Skew (deg) driven by scroll velocity. */
  lean: MotionValue<number>
  /** Run the loop (false when off-screen or for reduced motion). */
  running: boolean
  /** One logical set of items; the track renders it 3×, wrapping by exactly one set. */
  children: ReactNode
}

/**
 * Seamless marquee driven by requestAnimationFrame (transform only).
 * The track holds three identical sets; x is wrapped into (-setWidth, 0], so
 * the loop never shows a seam and its speed can change freely each frame.
 */
function MarqueeRow({ dir, speed, boost, lean, running, children }: MarqueeRowProps) {
  const x = useMotionValue(0)
  const setRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(0)
  const runningRef = useRef(running)
  runningRef.current = running

  useEffect(() => {
    const el = setRef.current
    if (!el) return
    widthRef.current = el.offsetWidth
    // Fractional layout width (offsetWidth is rounded, which would nudge the loop at every wrap)
    const ro = new ResizeObserver(([entry]) => {
      widthRef.current = entry?.borderBoxSize?.[0]?.inlineSize ?? el.offsetWidth
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useAnimationFrame((_, delta) => {
    const w = widthRef.current
    if (!runningRef.current || w <= 0) return
    const dt = Math.min(delta, 64) / 1000
    const next = x.get() - dir * speed * boost.get() * dt
    x.set(next - Math.ceil(next / w) * w) // wrap into (-w, 0]
  })

  return (
    <motion.div className="flex w-max shrink-0 items-center will-change-transform" style={{ x, skewX: lean }}>
      <div ref={setRef} className="flex shrink-0 items-center">
        {children}
      </div>
      <div className="flex shrink-0 items-center" aria-hidden>
        {children}
      </div>
      <div className="flex shrink-0 items-center" aria-hidden>
        {children}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ticker                                                            */
/* ------------------------------------------------------------------ */

/**
 * Two full-bleed marquee bands crossing the page at slight, opposing angles.
 * Band 1: Hizarc-blue, white display type (the studio's verbs).
 * Band 2: dark, outlined type with a few cyan-filled words (tech & platforms).
 * Both run opposite ways and speed up / lean with the scroll velocity (and
 * reverse when you scroll back up). Reduced motion → static bands.
 * Decorative: aria-hidden, with a single sr-only sentence.
 */
export function Ticker() {
  const reduce = useReducedMotion() === true
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { margin: '160px 0px' })
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (inView) setEntered(true)
  }, [inView])

  // Scroll velocity (px/s) → smoothed → speed multiplier + skew
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smooth = useSpring(velocity, { stiffness: 80, damping: 28, mass: 1 })
  const boost = useTransform(smooth, (v) => 1 + clamp(v / 300, -5, 9))
  const lean = useTransform(smooth, (v) => clamp(-v / 420, -7, 7))

  const still = useMotionValue(0)
  const running = inView && !reduce

  return (
    <div
      ref={wrapRef}
      className="relative isolate overflow-hidden [--h:46px] sm:[--h:54px] lg:[--h:64px] [--gap:1.1rem] sm:[--gap:1.5rem] lg:[--gap:2rem]"
      style={WRAP_STYLE}
    >
      <p className="sr-only">{SR_TEXT}</p>

      <div aria-hidden className="absolute inset-0">
        {/* Band 1 — Hizarc blue, in front */}
        <motion.div
          className="absolute -left-[15%] z-10 flex h-[var(--h)] w-[130%] items-center overflow-hidden bg-[linear-gradient(100deg,#0062d6_0%,#0a7cff_38%,#1799ff_72%,#2ee6ff_135%)] font-display text-[1rem] font-bold tracking-[0.06em] text-white uppercase shadow-[0_14px_40px_-10px_rgba(10,124,255,0.6),0_6px_18px_-6px_rgba(0,0,0,0.6)] sm:text-[1.2rem] lg:text-[1.5rem]"
          style={{ ...ROW1_STYLE, rotate: -2 }}
          initial={{ opacity: 0, x: '-9%' }}
          animate={entered ? { opacity: 1, x: '0%' } : undefined}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />
          {/* A slanted light bar sweeps the band every few seconds (compositor-only) */}
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-[hz-shine_8s_cubic-bezier(0.65,0,0.35,1)_1s_infinite]',
              !inView && '[animation-play-state:paused]',
            )}
          >
            <span className="absolute inset-0 -skew-x-[28deg] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </span>
          <MarqueeRow dir={1} speed={64} boost={boost} lean={reduce ? still : lean} running={running}>
            {[...VERBS, ...VERBS].map((word, i) => (
              <span key={i} className="flex shrink-0 items-center gap-[var(--gap)] pr-[var(--gap)] whitespace-nowrap">
                {word}
                <Slash className={i % 2 ? 'text-white' : 'text-white/55'} />
              </span>
            ))}
          </MarqueeRow>
        </motion.div>

        {/* Band 2 — dark, outlined type, travelling the other way */}
        <motion.div
          className="absolute -left-[15%] z-0 flex h-[var(--h)] w-[130%] items-center overflow-hidden border-y border-line-strong bg-ink-900 font-display text-[1rem] font-bold tracking-[0.06em] uppercase sm:text-[1.2rem] lg:text-[1.5rem]"
          style={{ ...ROW2_STYLE, rotate: 1.5 }}
          initial={{ opacity: 0, x: '9%' }}
          animate={entered ? { opacity: 1, x: '0%' } : undefined}
          transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.12 }}
        >
          <MarqueeRow dir={-1} speed={48} boost={boost} lean={reduce ? still : lean} running={running}>
            {[...TECH, ...TECH].map((item, i) => (
              <span key={i} className="flex shrink-0 items-center gap-[var(--gap)] pr-[var(--gap)] whitespace-nowrap">
                <span className={item.hot ? 'text-cyan [text-shadow:0_0_18px_rgba(46,230,255,0.45)]' : 'text-outline [-webkit-text-stroke-color:rgb(244_247_255/0.55)] [-webkit-text-stroke-width:1px] sm:[-webkit-text-stroke-width:1.5px]'}>{item.text}</span>
                <Slash className={item.hot ? 'text-cyan/70' : 'text-brand/70'} />
              </span>
            ))}
          </MarqueeRow>
        </motion.div>
      </div>
    </div>
  )
}
