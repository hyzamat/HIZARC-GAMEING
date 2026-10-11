import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue, type Variants } from 'framer-motion'

/** Gradient stops, ultraviolet → Hizarc blue → electric cyan. */
const STOPS = [
  [124, 92, 255],
  [10, 124, 255],
  [46, 230, 255],
] as const

/** Colour at position t (0–1) along the three-stop gradient. */
function colorAt(t: number) {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x))
  const f = x - i
  const [a, b] = [STOPS[i], STOPS[i + 1]]
  return `rgb(${[0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)).join(' ')})`
}

/**
 * Line height of the wordmark (em) and the run of a 28° edge across the
 * clipped band (-20% … 120% of the line = 1.4 lines): run = 1.4 × 0.9 / tan 28°.
 */
const RUN_EM = (1.4 * 0.9) / Math.tan((28 * Math.PI) / 180)

/** Slanted wipe edge — leaning at the logo's 28° — that sweeps 0 → 1 across the word. */
function wipe(p: number) {
  if (p >= 0.999) return 'none'
  const x = (p * 100).toFixed(3)
  return `polygon(0% -20%, calc(${x}% + ${p.toFixed(4)} * var(--wm-run)) -20%, calc(${x}% - ${(1 - p).toFixed(4)} * var(--wm-run)) 120%, 0% 120%)`
}

const rowVariants = (delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: delay } },
})

const letterVariants: Variants = {
  hidden: { y: '46%', opacity: 0 },
  show: {
    y: '0%',
    opacity: 1,
    transition: { y: { type: 'spring', stiffness: 120, damping: 17, mass: 0.9 }, opacity: { duration: 0.45, ease: 'easeOut' } },
  },
}

/**
 * Keep a single line of text exactly as wide as its box: measure the row at its
 * current size, then scale the font so the row's width equals the box's width.
 * Re-fits on resize and whenever web fonts finish loading. Writes one CSS
 * variable (`--wm-size`) so React never re-renders for it.
 */
function useFit(box: RefObject<HTMLDivElement | null>, row: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const boxEl = box.current
    const rowEl = row.current
    if (!boxEl || !rowEl) return

    let raf = 0
    let disposed = false
    const fit = () => {
      raf = 0
      if (disposed) return
      const available = boxEl.getBoundingClientRect().width
      const natural = rowEl.getBoundingClientRect().width
      const size = parseFloat(getComputedStyle(rowEl).fontSize)
      // 0-width = this breakpoint variant is display:none right now.
      if (available < 1 || natural < 1 || !size) return
      const next = size * (available / natural) * 0.998
      if (Math.abs(next - size) > 0.05) boxEl.style.setProperty('--wm-size', `${next.toFixed(2)}px`)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(fit)
    }

    fit()
    const ro = new ResizeObserver(schedule)
    ro.observe(boxEl)
    ro.observe(rowEl)
    const fonts = document.fonts
    fonts?.ready.then(schedule)
    fonts?.addEventListener('loadingdone', schedule)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      fonts?.removeEventListener('loadingdone', schedule)
    }
  }, [box, row])
}

type RowProps = {
  text: string
  layer: 'ghost' | 'fill'
  /** Slice of the page-wide gradient this line covers. */
  tone: [number, number]
  fallback: string
  play: boolean
  reduce: boolean
  delay: number
  rowRef?: RefObject<HTMLDivElement | null>
  clip?: MotionValue<string>
}

/** One layer of one line: a flex row of letters that rise in on a stagger. */
function WordRow({ text, layer, tone, fallback, play, reduce, delay, rowRef, clip }: RowProps) {
  const chars = Array.from(text)
  const filled = layer === 'fill'
  return (
    <motion.div
      ref={rowRef}
      aria-hidden
      className={
        filled
          ? 'pointer-events-none absolute top-0 left-0 flex w-max font-display leading-[0.9] font-extrabold tracking-[-0.025em] uppercase select-none'
          : 'flex w-max font-display leading-[0.9] font-extrabold tracking-[-0.025em] text-white/[0.06] uppercase select-none'
      }
      // geometricPrecision keeps glyph advances perfectly linear in font-size, so the fit never drifts
      style={{ fontSize: `var(--wm-size, ${fallback})`, textRendering: 'geometricPrecision', ...(clip ? { clipPath: clip } : null) }}
      variants={rowVariants(delay)}
      initial={reduce ? false : 'hidden'}
      animate={play || reduce ? 'show' : 'hidden'}
    >
      {chars.map((ch, i) => {
        const t0 = tone[0] + ((tone[1] - tone[0]) * i) / chars.length
        const t1 = tone[0] + ((tone[1] - tone[0]) * (i + 1)) / chars.length
        // Each letter carries its own slice of the gradient (background-clip:text
        // would break on a transformed parent), so the word still reads as one sweep.
        const paint: CSSProperties | undefined = filled
          ? {
              backgroundImage: `linear-gradient(90deg, ${colorAt(t0)}, ${colorAt(t1)})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }
          : undefined
        return (
          <motion.span key={i} variants={letterVariants} className="block" style={paint}>
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        )
      })}
    </motion.div>
  )
}

type LineProps = {
  text: string
  tone: [number, number]
  /** Scroll progress range (of the whole wordmark) over which this line fills. */
  fillRange: [number, number]
  fill: MotionValue<number>
  fallback: string
  play: boolean
  reduce: boolean
  delay: number
}

/** A self-fitting line: ghost letters underneath, gradient letters revealed by the scroll wipe. */
function FitLine({ text, tone, fillRange, fill, fallback, play, reduce, delay }: LineProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  useFit(boxRef, ghostRef)

  const progress = useTransform(fill, fillRange, [0, 1], { clamp: true })
  const clip = useTransform(progress, wipe)

  return (
    <div ref={boxRef} className="relative w-full" style={{ '--wm-run': `calc(var(--wm-size, ${fallback}) * ${RUN_EM.toFixed(3)})` } as CSSProperties}>
      <WordRow text={text} layer="ghost" tone={tone} fallback={fallback} play={play} reduce={reduce} delay={delay} rowRef={ghostRef} />
      <WordRow text={text} layer="fill" tone={tone} fallback={fallback} play={play} reduce={reduce} delay={delay} clip={clip} />
    </div>
  )
}

/**
 * Giant edge-to-edge "HIZARC GAMES" wordmark for the footer.
 *  - Sized by measurement so it fills the viewport width exactly (no overflow) on any screen;
 *    phones stack it on two lines so it stays monumental.
 *  - Letters rise in on a stagger when it enters; the whole block drifts up with scroll.
 *  - A ghost-white word is progressively filled with the brand gradient by scroll, behind a
 *    28° slanted leading edge.
 */
export function FooterWordmark() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const play = useInView(ref, { once: true, amount: 0.3 })

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.4 })
  const still = useMotionValue(1)
  const fill = reduce ? still : smooth
  const lift = useTransform(smooth, [0, 1], ['26%', '0%'])
  const rule = useTransform(fill, [0.1, 0.95], [0, 1], { clamp: true })

  return (
    <div ref={ref} data-nosnippet className="relative w-full px-[max(0.5rem,1.1vw)] pt-10 sm:pt-16">
      <motion.div style={reduce ? undefined : { y: lift }}>
        {/* Phones: two monumental lines */}
        <div className="flex flex-col gap-[1.8vw] sm:hidden">
          <FitLine text="HIZARC" tone={[0, 0.55]} fillRange={[0.05, 0.75]} fill={fill} fallback="19vw" play={play} reduce={reduce} delay={0} />
          <FitLine text="GAMES" tone={[0.45, 1]} fillRange={[0.25, 0.95]} fill={fill} fallback="20vw" play={play} reduce={reduce} delay={0.25} />
        </div>
        {/* sm and up: one line, edge to edge */}
        <div className="hidden sm:block">
          <FitLine text="HIZARC GAMES" tone={[0, 1]} fillRange={[0.08, 0.92]} fill={fill} fallback="10.2vw" play={play} reduce={reduce} delay={0} />
        </div>

        {/* Hairline that charges up with the fill */}
        <div className="relative mt-[1.6vw] h-px bg-white/10 sm:mt-[1vw]">
          <motion.div
            aria-hidden
            className="absolute inset-0 origin-left bg-gradient-to-r from-violet via-brand to-cyan shadow-[0_0_12px_rgba(46,230,255,0.5)]"
            style={{ scaleX: rule }}
          />
        </div>
      </motion.div>
    </div>
  )
}
