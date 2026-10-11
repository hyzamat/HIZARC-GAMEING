import { motion, motionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useLayoutEffect, useRef, useState } from 'react'
import type { UpcomingGame } from '@/data/games'
import { cn } from '@/lib/cn'
import { UpcomingCard } from './UpcomingCard'

/* ---------------------------------------------------------------- */
/*  Tuning                                                          */
/* ---------------------------------------------------------------- */

/** How much a card shrinks per card stacked on top of it (3 cards deep → ~0.92). */
const SCALE_STEP = 0.027
/** Darkening per covering card, capped so the pile edge never goes fully black. */
const DIM_STEP = 0.2
const DIM_MAX = 0.7
/**
 * How far (px) the pinned card may run past the bottom of the screen before the deck gives up
 * pinning and falls back to a plain list (landscape phones, tiny windows). Within the tolerance
 * only the card's bottom padding is trimmed.
 */
const FIT_TOLERANCE = 24

/**
 * Card height. Phones: up to ~78svh; desktop 480–640px (fitted to the window). `min-height`
 * (not `height`) so the content can never be clipped on short screens — the card grows instead.
 * `--deck-card-h` is the tallest card, written by the deck so the whole pile is the same height
 * (a shorter card on top would otherwise leave the one beneath it peeking out at the bottom).
 */
const CARD_SIZE = [
  'min-h-[max(min(78svh,40rem),var(--deck-card-h,0px))]',
  'sm:min-h-[max(min(70svh,38rem),var(--deck-card-h,0px))]',
  'lg:min-h-[max(clamp(30rem,calc(100svh_-_14rem),40rem),var(--deck-card-h,0px))]',
].join(' ')

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Per-card scroll signals, written by the deck and read by each card. */
type Signal = {
  /** 0 → 1 while this card travels from the bottom of the screen to its pinned position. */
  arrival: MotionValue<number>
  /** Sum of the arrival progress of every card stacked ABOVE this one (0 … n-1). */
  depth: MotionValue<number>
}

/* ---------------------------------------------------------------- */
/*  Public component                                                */
/* ---------------------------------------------------------------- */

type UpcomingDeckProps = { games: UpcomingGame[] }

/**
 * Sticky stacking deck — the section's signature effect. Every card pins under the navbar a few
 * pixels lower than the one before it; as the next card slides up over it the earlier card
 * shrinks toward its top edge and dims, so the cards pile up like a hand of playing cards.
 * Reduced motion → a plain vertical list (no pinning, no scaling).
 */
export function UpcomingDeck({ games }: UpcomingDeckProps) {
  const reduce = useReducedMotion()
  return reduce ? <PlainList games={games} /> : <StackedDeck games={games} />
}

function PlainList({ games }: UpcomingDeckProps) {
  return (
    <ol aria-label="Games in development" className="grid gap-5 sm:gap-8">
      {games.map((game, i) => (
        <li key={game.slug}>
          <UpcomingCard game={game} index={i} total={games.length} className={CARD_SIZE} />
        </li>
      ))}
    </ol>
  )
}

/* ---------------------------------------------------------------- */
/*  Stacked deck                                                    */
/* ---------------------------------------------------------------- */

function StackedDeck({ games }: UpcomingDeckProps) {
  const stackRef = useRef<HTMLOListElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const flatRef = useRef(false)
  const [flat, setFlat] = useState(false)
  const [signals] = useState<Signal[]>(() => games.map(() => ({ arrival: motionValue(0), depth: motionValue(0) })))
  const { scrollY } = useScroll()

  // One scroll subscription drives every card. Geometry is measured once (and on resize / font
  // load); per frame we only read the stack's viewport position, so layout shifts above the
  // section can never desync the effect.
  useLayoutEffect(() => {
    const stack = stackRef.current
    if (!stack) return

    let offsets: number[] = [] // flow top of each card, relative to the stack
    let pins: number[] = [] // sticky `top` of each card (px from viewport top)
    let vh = 1
    let raf = 0
    let alive = true

    const apply = () => {
      const stackTop = stack.getBoundingClientRect().top
      const arrival = offsets.map((offset, i) => clamp01((vh - (stackTop + offset)) / Math.max(1, vh - pins[i])))
      for (let i = 0; i < arrival.length; i++) {
        let depth = 0
        if (!flatRef.current) for (let j = i + 1; j < arrival.length; j++) depth += arrival[j]
        signals[i].arrival.set(arrival[i])
        signals[i].depth.set(depth)
      }
    }

    const measure = () => {
      // Natural heights first (drop the equaliser), then pin every card to the tallest.
      stack.style.removeProperty('--deck-card-h')
      const els = itemRefs.current.filter((el): el is HTMLLIElement => el !== null)
      const gap = parseFloat(getComputedStyle(stack).rowGap) || 0
      const tallest = els.reduce((max, el) => Math.max(max, el.offsetHeight), 0)
      stack.style.setProperty('--deck-card-h', `${tallest}px`)

      pins = els.map((el) => parseFloat(getComputedStyle(el).top) || 0)
      offsets = els.map((_, i) => i * (tallest + gap))
      vh = window.innerHeight

      // Pinning only works when a card fits under the navbar. `svh` (not innerHeight) so a collapsing
      // mobile toolbar can't flip the mode back and forth mid-scroll.
      const svh = probeRef.current?.offsetHeight || vh
      const overflow = Math.max(0, ...pins.map((pin) => pin + tallest - svh))
      const nextFlat = overflow > FIT_TOLERANCE
      if (nextFlat !== flatRef.current) {
        flatRef.current = nextFlat
        setFlat(nextFlat)
      }
      apply()
    }

    // Coalesce bursts (ResizeObserver, resize, fonts) into one measurement per frame — and never
    // resize things from inside the observer callback itself.
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    measure()
    const unsubscribe = scrollY.on('change', apply)
    const observer = new ResizeObserver(schedule)
    observer.observe(stack)
    itemRefs.current.forEach((el) => el && observer.observe(el))
    window.addEventListener('resize', schedule)
    // Web fonts change line breaks (and so card heights) after first paint.
    void document.fonts?.ready.then(() => alive && schedule())
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      unsubscribe()
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [scrollY, signals])

  return (
    <div className="relative">
      {/* 100svh probe: a stable viewport height that ignores the mobile URL bar. */}
      <span ref={probeRef} aria-hidden className="pointer-events-none invisible fixed top-0 left-0 h-svh w-0" />
      {!flat && <DeckRail signals={signals} />}
      <ol ref={stackRef} aria-label="Games in development" className={cn('relative flex flex-col', flat ? 'gap-5 sm:gap-8' : 'gap-[var(--deck-gap)]')}>
        {games.map((game, i) => (
          <DeckItem
            key={game.slug}
            game={game}
            index={i}
            total={games.length}
            signal={signals[i]}
            flat={flat}
            liRef={(el) => {
              itemRefs.current[i] = el
            }}
          />
        ))}
        {/* Runway after the last card: keeps the finished pile pinned for a beat before it scrolls away. */}
        {!flat && <li aria-hidden className="h-[4svh]" />}
      </ol>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Pager rail                                                      */
/* ---------------------------------------------------------------- */

/**
 * Wide screens only: a slim rail of slanted pips in the left gutter that rides along with the pinned
 * pile and fills in as each card lands. Purely decorative (the cards carry their own 01/04 index).
 */
function DeckRail({ signals }: { signals: Signal[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-full mr-4 hidden w-6 xl:block 2xl:mr-6 2xl:w-8">
      <div className="sticky flex flex-col items-end gap-2.5" style={{ top: 'var(--deck-top)' }}>
        {signals.map((signal, i) => (
          <RailPip key={i} signal={signal} />
        ))}
      </div>
    </div>
  )
}

function RailPip({ signal }: { signal: Signal }) {
  const { arrival, depth } = signal
  // Lit while the card is arriving / on top, softly dimmed once it is buried.
  const opacity = useTransform([arrival, depth], ([a, d]: number[]) => 0.3 + 0.7 * a * (1 - 0.55 * Math.min(1, d)))
  const fill = useTransform(arrival, [0.35, 1], [0, 1])
  return (
    // The skewed node only animates opacity; the scaleX fill is its child — framer's inline transform
    // on the skewed node itself would override the skew class.
    <motion.span style={{ opacity }} className="block h-1.5 w-full -skew-x-[28deg] overflow-hidden bg-white/15">
      <motion.span style={{ scaleX: fill }} className="block h-full origin-left bg-gradient-to-r from-cyan to-brand" />
    </motion.span>
  )
}

type DeckItemProps = {
  game: UpcomingGame
  index: number
  total: number
  signal: Signal
  /** Too little height to pin: render in the normal flow (no sticky, no stacking). */
  flat: boolean
  liRef: (el: HTMLLIElement | null) => void
}

function DeckItem({ game, index, total, signal, flat, liRef }: DeckItemProps) {
  const { arrival, depth } = signal
  const scale = useTransform(depth, (d) => 1 - d * SCALE_STEP)
  const dim = useTransform(depth, (d) => Math.min(DIM_MAX, d * DIM_STEP))
  // Arrival "push-in": the art starts oversized and a touch high, then settles as the card pins.
  const artY = useTransform(arrival, [0, 1], ['-5%', '0%'])
  const artScale = useTransform(arrival, [0, 1], [1.12, 1])
  // A slanted band of light sweeps across the card as it lands (the logo's 28° cut, in motion).
  const sweepX = useTransform(arrival, [0.2, 1], ['-100%', '470%'])
  const sweepOpacity = useTransform(arrival, [0.2, 0.4, 0.85, 1], [0, 1, 1, 0])

  // Fully buried → pause the art loop and the countdown (and take the CTA out of the tab order).
  const [live, setLive] = useState(true)
  useMotionValueEvent(depth, 'change', (d) => setLive(d < 1))

  return (
    <li
      ref={liRef}
      className={cn(!flat && 'sticky')}
      // Pins stagger down the screen (phones 76 + 14i px, desktop 96 + 22i px — set on the section).
      style={{ top: `calc(var(--deck-top) + ${index} * var(--deck-step))`, zIndex: index + 1 }}
    >
      <motion.div className={cn('origin-top', !flat && 'will-change-transform')} style={{ scale }}>
        <UpcomingCard
          game={game}
          index={index}
          total={total}
          live={live}
          artY={artY}
          artScale={artScale}
          dim={dim}
          sweepX={sweepX}
          sweepOpacity={sweepOpacity}
          className={CARD_SIZE}
        />
      </motion.div>
    </li>
  )
}
