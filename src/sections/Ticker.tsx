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
import { EASE_OUT } from '@/components/ui/Reveal'
import { engines, platformsWeBuildFor } from '@/config/site'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

/** Engines + platforms from the site config, as shown on the band. */
const TECH: { text: string; hot: boolean }[] = [...engines, ...platformsWeBuildFor].map((raw) => {
  const text = raw === 'Web / WebGL' ? 'WebGL' : raw === 'iOS' ? raw : raw.toUpperCase()
  // a few words are filled cyan, the rest stay outlined
  return { text, hot: ['UNREAL ENGINE', 'PC', 'AR / VR'].includes(text) }
})

const SR_TEXT = `Hizarc Games builds in ${engines.join(' and ')} for ${platformsWeBuildFor.join(', ')}.`

/* ------------------------------------------------------------------ */
/*  Geometry                                                          */
/*                                                                    */
/*  Band height --h; the band is rotated +1.5°, so at the viewport    */
/*  edge it drifts ±tan(1.5°)·50vw ≈ ±1.31vw off its centre line.     */
/*  The wrapper leaves that much room (plus 10px) above and below,    */
/*  so the band is never clipped.                                     */
/* ------------------------------------------------------------------ */

const WRAP_STYLE: CSSProperties = { height: 'calc(var(--h) + 2.62vw + 20px)' }
const ROW_STYLE: CSSProperties = { top: 'calc(1.31vw + 10px)' }

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
 * A full-bleed marquee band crossing the page at a slight angle: dark,
 * outlined type with a few cyan-filled words (tech & platforms).
 * It speeds up / leans with the scroll velocity (and reverses when you
 * scroll back up). Reduced motion → static band.
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
        <motion.div
          className="absolute -left-[15%] flex h-[var(--h)] w-[130%] items-center overflow-hidden border-y border-line-strong bg-ink-900 font-display text-[1rem] font-bold tracking-[0.06em] uppercase sm:text-[1.2rem] lg:text-[1.5rem]"
          style={{ ...ROW_STYLE, rotate: 1.5 }}
          initial={{ opacity: 0, x: '9%' }}
          animate={entered ? { opacity: 1, x: '0%' } : undefined}
          transition={{ duration: 1.2, ease: EASE_OUT }}
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
