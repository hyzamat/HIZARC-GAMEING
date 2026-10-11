import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EASE_OUT } from '@/components/ui/Reveal'
import type { Game } from '@/data/games'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { GameCard } from './GameCard'
import { PartnerCard } from './PartnerCard'
import { pad2, type GameFilter } from './shared'
import './games.css'

type GameLibraryProps = {
  /** Games to show for the current filter. */
  items: Game[]
  filter: GameFilter
  /** Card that is being flown back into by the closing modal (lifted above it). */
  liftedSlug: string | null
  onOpen: (game: Game, opener: HTMLElement) => void
}

/** Classes that turn each list item into a snap card on phones. */
const RAIL_ITEM = 'max-sm:w-[min(80vw,21rem)] max-sm:shrink-0 max-sm:snap-start'

/** Rail items that are really in the flow (exiting cards are popped out as absolute). */
function railCards(ul: HTMLElement) {
  return [...ul.children].filter((el): el is HTMLElement => el instanceof HTMLElement && getComputedStyle(el).position !== 'absolute')
}

/**
 * The games library.
 *   phones : premium snap carousel with a peeking next card, scroll-driven depth
 *            (cards ease toward the edge: scale / dim / yaw) and a segmented progress bar
 *   sm     : 2-column grid · lg : 3-column grid
 * One list serves all of them, so filtering is a single choreographed layout animation.
 */
export function GameLibrary({ items, filter, liftedSlug, onOpen }: GameLibraryProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const ulRef = useRef<HTMLUListElement>(null)
  const segRefs = useRef<(HTMLSpanElement | null)[]>([])
  const revealed = useInView(wrapRef, { once: true, amount: 0.1 })
  const reduce = useReducedMotion()
  const isGrid = useMediaQuery('(min-width: 640px)')
  const [active, setActive] = useState(0)

  const slides = [...items.map((g) => ({ key: g.slug, label: g.title })), { key: 'partner', label: 'Partner with us' }]

  /** Read the rail's scroll position → depth variables, progress fills and the active index. */
  const sync = useCallback(() => {
    const ul = ulRef.current
    if (!ul || window.matchMedia('(min-width: 640px)').matches) return // grid layout: no rail to track
    const cards = railCards(ul)
    if (cards.length === 0) return

    // All layout reads first, writes after: one layout pass per frame, no thrash.
    const pad = parseFloat(getComputedStyle(ul).paddingLeft) || 0
    const sl = ul.scrollLeft
    const max = Math.max(0, ul.scrollWidth - ul.clientWidth)
    const lefts = cards.map((c) => c.offsetLeft)
    const step = Math.max(1, cards.length > 1 ? lefts[1] - lefts[0] : cards[0].offsetWidth)

    // Fractional slide index, interpolated between the positions the rail can actually rest at.
    const snaps = lefts.map((l) => Math.min(Math.max(0, l - pad), max))
    let i = 0
    while (i < snaps.length - 1 && snaps[i + 1] <= sl) i++
    const span = i < snaps.length - 1 ? snaps[i + 1] - snaps[i] : 0
    const pos = span > 0 ? i + Math.min(1, Math.max(0, (sl - snaps[i]) / span)) : i

    if (!reduce) {
      cards.forEach((c, n) => {
        // Written on the card's <article> (where games.css reads them). The properties are registered as
        // non-inherited there, so a scroll frame never restyles the art SVG inside each card.
        const face = c.firstElementChild
        if (!(face instanceof HTMLElement)) return
        const d = Math.max(-1, Math.min(1, (lefts[n] - pad - sl) / step))
        face.style.setProperty('--d', d.toFixed(3))
        face.style.setProperty('--a', Math.abs(d).toFixed(3))
      })
    }
    cards.forEach((_, n) => segRefs.current[n]?.style.setProperty('--f', Math.max(0, 1 - Math.abs(pos - n)).toFixed(3)))

    const idx = Math.round(pos)
    setActive((prev) => (prev === idx ? prev : idx))
  }, [reduce])

  // Phone rail: follow scrolling + resizes.
  useEffect(() => {
    if (isGrid) return
    const ul = ulRef.current
    if (!ul) return
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        sync()
      })
    }
    ul.addEventListener('scroll', schedule, { passive: true })
    const ro = new ResizeObserver(schedule)
    ro.observe(ul)
    sync()
    return () => {
      cancelAnimationFrame(raf)
      ul.removeEventListener('scroll', schedule)
      ro.disconnect()
    }
  }, [isGrid, sync])

  // New filter → start at the first card.
  useLayoutEffect(() => {
    const ul = ulRef.current
    if (!ul) return
    ul.scrollLeft = 0
    if (!isGrid) sync()
  }, [filter, isGrid, sync])

  const goTo = (n: number) => {
    const ul = ulRef.current
    if (!ul) return
    const card = railCards(ul)[n]
    if (!card) return
    const pad = parseFloat(getComputedStyle(ul).paddingLeft) || 0
    const left = Math.min(Math.max(0, card.offsetLeft - pad), ul.scrollWidth - ul.clientWidth)
    ul.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    // flow-root: the phone rail has a large negative margin; without its own formatting context that
    // margin collapses through this wrapper and stretches the box the entrance observer watches.
    <div ref={wrapRef} className="flow-root">
      <AnimatePresence>
        {items.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="mb-5 flex flex-col items-start gap-2 border border-dashed border-line-strong bg-white/[0.02] p-6 chamfer-sm"
          >
            <p className="font-display text-lg font-bold text-snow">No {filter} games shipped yet.</p>
            <p className="text-sm text-mist">Something is brewing in the studio.</p>
            <a href="#upcoming" className="mt-2 inline-flex h-11 items-center gap-2 font-mono text-[0.7rem] tracking-[0.2em] text-cyan uppercase">
              See what&apos;s in development <span aria-hidden>→</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.ul
        ref={ulRef}
        layout
        layoutScroll
        aria-label={filter === 'All' ? 'Games' : `${filter} games`}
        className={cn(
          'games-rail relative -mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto overscroll-x-contain px-5 no-scrollbar',
          // Phones: a scroll container clips its children, which would cut off the key art while it
          // flies back from the closing sheet. Padding + equal negative margin = room to fly, no layout
          // change; the list ignores the pointer outside its cards so nothing underneath is blocked.
          'max-sm:pointer-events-none max-sm:my-[-100dvh] max-sm:py-[calc(100dvh+0.75rem)] max-sm:[&>li]:pointer-events-auto',
          'sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:p-0 lg:grid-cols-3 lg:gap-6',
        )}
      >
        <AnimatePresence mode="popLayout" onExitComplete={sync}>
          {items.map((game, i) => (
            <GameCard
              key={game.slug}
              game={game}
              revealed={revealed}
              delay={Math.min(i, 5) * 0.08}
              elevated={liftedSlug === game.slug}
              onOpen={onOpen}
              className={RAIL_ITEM}
            />
          ))}
        </AnimatePresence>
        <PartnerCard revealed={revealed} delay={Math.min(items.length, 5) * 0.08} className={RAIL_ITEM} />
      </motion.ul>

      {/* phones: segmented progress + counter */}
      <div className="mt-4 flex items-center gap-4 sm:hidden">
        <ol aria-label="Jump to a game" className="flex min-w-0 flex-1 items-center">
          {slides.map((s, n) => (
            <li key={s.key} className="min-w-0 flex-1">
              {/* the gap between segments is padding inside the button, so touch targets are contiguous (44px tall) */}
              <button
                type="button"
                onClick={() => goTo(n)}
                aria-label={`Show ${s.label}`}
                aria-current={n === active ? 'true' : undefined}
                className="flex h-11 w-full items-center px-[3px]"
              >
                <span className="relative block h-[5px] w-full -skew-x-[28deg] overflow-hidden bg-white/12">
                  <span
                    ref={(el) => {
                      segRefs.current[n] = el
                    }}
                    className="absolute inset-0 origin-left bg-gradient-to-r from-brand to-cyan"
                    style={{ transform: 'scaleX(var(--f, 0))' }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p aria-hidden className="shrink-0 font-mono text-[0.72rem] tracking-[0.12em] text-snow tabular-nums">
          {pad2(Math.min(active, slides.length - 1) + 1)}
          <span className="text-haze"> / {pad2(slides.length)}</span>
        </p>
      </div>
    </div>
  )
}
