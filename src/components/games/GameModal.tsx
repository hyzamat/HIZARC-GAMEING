import { AnimatePresence, motion, useDragControls, useIsPresent, type Variants } from 'framer-motion'
import { ArrowRight, Check, Star, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { GameArt } from '@/components/art/GameArt'
import { EASE_OUT } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import { games, type Game } from '@/data/games'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { lockScroll, scrollToTarget, unlockScroll } from '@/lib/scroll'
import { platformText } from './GameMeta'
import { StoreButtons, storeEntries } from './StoreButtons'
import { artLayoutId, pad2, SHARED_ART_TRANSITION, withAlpha } from './shared'
import './games.css'

type GameModalProps = {
  /** Game to show. `null` closes the dialog (exit animation plays). */
  game: Game | null
  /** Morph the card's key art into the header (only when opened from a library card). */
  sharedArt: boolean
  /** Element that opened the dialog — focus returns to it on close. */
  openerRef: RefObject<HTMLElement | null>
  onClose: () => void
  /** Fires once the exit animation (including the art flying home) has finished. */
  onExitComplete?: () => void
}

/* ---------------------------------------------------------------- */
/*  motion                                                          */
/* ---------------------------------------------------------------- */

const headStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.32 } },
}
const bodyStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.45 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT } },
}
const featureList: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT, staggerChildren: 0.07, delayChildren: 0.12 } },
}
const featureItem: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

/* ---------------------------------------------------------------- */
/*  a11y helpers                                                    */
/* ---------------------------------------------------------------- */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keep Tab / Shift+Tab inside the dialog. */
function trapTab(e: KeyboardEvent, root: HTMLElement) {
  const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0)
  if (nodes.length === 0) {
    e.preventDefault()
    root.focus({ preventScroll: true })
    return
  }
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  const current = document.activeElement
  const outside = !root.contains(current) || current === root
  if (e.shiftKey && (current === first || outside)) {
    e.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!e.shiftKey && (current === last || outside)) {
    e.preventDefault()
    first.focus({ preventScroll: true })
  }
}

/* ---------------------------------------------------------------- */
/*  meta                                                            */
/* ---------------------------------------------------------------- */

type MetaCell = { label: string; value: string; star?: boolean }

function metaCells(game: Game): MetaCell[] {
  const cells: (MetaCell | null)[] = [
    { label: 'Genre', value: game.genre },
    { label: 'Engine', value: game.engine },
    { label: 'Platforms', value: platformText(game.platforms) },
    game.releaseStatus ? { label: 'Release', value: game.releaseStatus } : { label: 'Released', value: String(game.year) },
    game.rating != null ? { label: 'Rating', value: `${game.rating.toFixed(1)} / 5`, star: true } : null,
    game.players ? { label: 'Players', value: game.players } : null,
  ]
  return cells.filter((c): c is MetaCell => c !== null)
}

/* ---------------------------------------------------------------- */
/*  public component                                                */
/* ---------------------------------------------------------------- */

/**
 * Game detail dialog, portalled to <body> at z-[70].
 * Phones: full-height bottom sheet (drag the header down to dismiss).
 * md+: centred chamfered panel over a blurred backdrop.
 * The header art shares a layoutId with the library card, so it visibly
 * grows out of the card and flies back into it on close.
 */
export function GameModal({ game, sharedArt, openerRef, onClose, onExitComplete }: GameModalProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {game && <ModalLayer key={game.slug} game={game} sharedArt={sharedArt} openerRef={openerRef} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  )
}

/* ---------------------------------------------------------------- */
/*  the dialog itself                                               */
/* ---------------------------------------------------------------- */

type LayerProps = {
  game: Game
  sharedArt: boolean
  openerRef: RefObject<HTMLElement | null>
  onClose: () => void
}

function ModalLayer({ game, sharedArt, openerRef, onClose }: LayerProps) {
  const desktop = useIsDesktop()
  const sheet = !desktop
  const isPresent = useIsPresent()
  const titleId = useId()
  const descId = useId()
  const featuresId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const dragControls = useDragControls()
  // Pixel offset used for the sheet's off-screen position (drag needs numeric y, not %).
  const [offscreen] = useState(() => window.innerHeight)

  const { palette } = game
  const number = games.findIndex((g) => g.slug === game.slug) + 1
  const cells = metaCells(game)
  const hasStores = storeEntries(game.links).length > 0

  // Scroll lock, focus handling, Esc + Tab trap. Released the moment closing starts
  // (isPresent flips) so the page is usable again while the exit animation plays.
  useEffect(() => {
    if (!isPresent) return
    const opener = openerRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    lockScroll()
    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus({ preventScroll: true }))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab' && panelRef.current) {
        trapTab(e, panelRef.current)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey, true)
      unlockScroll()
      opener?.focus({ preventScroll: true })
    }
  }, [isPresent, onClose, openerRef])

  // "What's next from the studio?" → close first, then glide to the games in development.
  const goUpcoming = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    onClose()
    window.setTimeout(() => {
      scrollToTarget('#upcoming')
      history.replaceState(null, '', '#upcoming')
    }, 160)
  }

  return (
    // While the exit animation plays the page is already unlocked, so the layer must not eat taps.
    <div className={cn('fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-6 lg:p-10', !isPresent && 'pointer-events-none')}>
      {/* backdrop */}
      <motion.div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/80 md:backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeOut' } }}
        transition={{ duration: 0.45 }}
      />

      {/* panel */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        initial={sheet ? { y: offscreen } : { opacity: 0, y: 44 }}
        animate={sheet ? { y: 0 } : { opacity: 1, y: 0 }}
        exit={
          sheet
            ? { y: offscreen, transition: { duration: 0.5, ease: EASE_OUT } }
            : { opacity: 0, y: 28, transition: { duration: 0.35, ease: EASE_OUT } }
        }
        transition={sheet ? SHARED_ART_TRANSITION : { duration: 0.6, ease: EASE_OUT, opacity: { duration: 0.25 } }}
        drag={sheet ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 650) onClose()
        }}
        className="relative flex h-[calc(100dvh-0.75rem)] w-full flex-col outline-none md:h-auto md:max-h-[min(54rem,calc(100dvh-3rem))] md:max-w-4xl"
      >
        {/* palette glow around the panel (md+) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-10 hidden md:block"
          style={{ background: `radial-gradient(55% 55% at 50% 40%, ${withAlpha(palette.to, 0.22)}, transparent 72%)` }}
        />

        {/* chamfered frame: hairline + surface */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/[0.14] gm-clip">
          <span className="absolute inset-px bg-ink-900 gm-clip [--cut:27px]" />
        </span>

        {/* header: key art + title. Grab it on phones to drag the sheet away. */}
        <div className="relative shrink-0 max-md:touch-none" onPointerDown={sheet ? (e) => dragControls.start(e) : undefined}>
          <motion.div
            layoutId={sharedArt ? artLayoutId(game.slug) : undefined}
            transition={{ layout: SHARED_ART_TRANSITION }}
            // max-h keeps the scrolling body reachable on short screens (phone in landscape)
            className="gm-art-clip relative aspect-[16/10] max-h-[44dvh] overflow-hidden md:aspect-[16/9] md:max-h-[min(42dvh,380px)]"
          >
            <motion.div
              className="absolute inset-0"
              initial={sharedArt ? false : { scale: 1.14 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.6, ease: EASE_OUT }}
            >
              <GameArt palette={palette} motif={game.motif} seed={game.slug} image={game.image} alt={game.imageAlt} className="absolute inset-0" />
            </motion.div>
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/30 to-ink-900/10" />
          </motion.div>

          {/* sheet grabber (phones) */}
          <span aria-hidden className="absolute top-2.5 left-1/2 h-1 w-11 -translate-x-1/2 rounded-full bg-white/45 md:hidden" />

          {/* HUD index */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute top-5 left-6 font-mono text-[0.62rem] tracking-[0.25em] text-snow/80 uppercase md:top-7 md:left-9 md:text-[0.68rem]"
          >
            No. {pad2(number)} <span className="text-white/35">/ {pad2(games.length)}</span>
          </motion.p>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close dialog"
            className="absolute top-3 right-3 z-20 grid size-11 place-items-center bg-ink-950/60 text-snow ring-1 ring-white/20 backdrop-blur-sm transition-colors duration-300 ring-inset chamfer-sm hover:bg-brand hover:text-white md:top-5 md:right-5"
          >
            <X aria-hidden className="size-5" strokeWidth={2.2} />
          </button>

          {/* title block over the art (kept outside the shared element so it never stretches mid-flight) */}
          <motion.div
            variants={headStagger}
            initial="hidden"
            animate="show"
            className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4 md:px-9 md:pb-6"
          >
            <motion.div variants={rise} className="flex flex-wrap gap-2">
              {game.badge && (
                <Tag tone="volt" dot className="bg-ink-950/55 backdrop-blur-sm">
                  {game.badge}
                </Tag>
              )}
              <Tag className="bg-ink-950/55 text-snow backdrop-blur-sm">{game.category}</Tag>
            </motion.div>
            <motion.h2
              id={titleId}
              variants={rise}
              className="mt-3 font-display text-[clamp(1.75rem,8vw,3.25rem)] leading-[0.95] font-black tracking-[-0.03em] [overflow-wrap:anywhere] text-snow"
            >
              {game.title}
            </motion.h2>
            <motion.p variants={rise} className="mt-2 text-base font-medium text-snow/90 sm:text-lg">
              {game.tagline}
            </motion.p>
          </motion.div>
        </div>

        {/* scrolling body */}
        <div
          data-lenis-prevent
          className="gm-scroll gm-body-clip relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-safe md:px-9 md:pt-7 md:pb-10"
        >
          <motion.div
            variants={bodyStagger}
            initial="hidden"
            animate="show"
            className="grid gap-7 md:grid-cols-[1.2fr_1fr] md:gap-x-10 md:gap-y-8"
          >
            {/* left column on md+ (flattened into the grid on phones so the order can differ) */}
            <div className="contents md:flex md:flex-col md:gap-8">
              <motion.p id={descId} variants={rise} className="order-1 text-base leading-relaxed text-mist sm:text-[1.05rem] md:order-none">
                {game.description}
              </motion.p>

              <motion.section variants={rise} aria-labelledby={featuresId} className="order-3 md:order-none">
                <h3 id={featuresId} className="font-mono text-[0.68rem] tracking-[0.25em] text-cyan uppercase">
                  [ Key features ]
                </h3>
                <motion.ul variants={featureList} className="mt-4 space-y-3">
                  {game.features.map((f) => (
                    <motion.li key={f} variants={featureItem} className="flex items-start gap-3 text-[0.95rem] leading-snug text-snow/90">
                      <span aria-hidden className="mt-px grid size-5 shrink-0 place-items-center bg-cyan/12 text-cyan chamfer [--cut:5px]">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      {f}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.section>
            </div>

            {/* right column on md+ */}
            <div className="contents md:flex md:flex-col md:gap-8">
              {hasStores && (
                <motion.div variants={rise} className="order-2 md:order-none">
                  <p className="mb-3 font-mono text-[0.68rem] tracking-[0.25em] text-cyan uppercase">[ Get the game ]</p>
                  <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
                    <StoreButtons links={game.links} title={game.title} itemClassName="w-full gap-2.5 px-3" />
                  </div>
                </motion.div>
              )}

              <motion.dl
                variants={rise}
                className="order-4 grid grid-cols-2 gap-px overflow-hidden bg-white/10 ring-1 ring-white/10 chamfer-sm md:order-none [&>*:last-child:nth-child(odd)]:col-span-2"
              >
                {cells.map((c) => (
                  <div key={c.label} className="bg-ink-900 px-4 py-3.5">
                    <dt className="font-mono text-[0.6rem] tracking-[0.22em] text-haze uppercase">{c.label}</dt>
                    <dd className="mt-1.5 flex items-center gap-1.5 font-display text-[0.82rem] leading-snug font-semibold text-snow">
                      {c.star && <Star aria-hidden className="size-3.5 shrink-0 fill-volt text-volt" strokeWidth={1.5} />}
                      {c.value}
                    </dd>
                  </div>
                ))}
              </motion.dl>
            </div>

            {/* what's-next CTA */}
            <motion.a
              variants={rise}
              href="#upcoming"
              onClick={goUpcoming}
              className="group order-5 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between md:order-none md:col-span-2"
            >
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-snow sm:text-lg">What&apos;s next from the studio?</span>
                <span className="mt-1 block text-sm text-mist">Sequels and a brand-new open world are already in development.</span>
              </span>
              <span className="inline-flex h-12 shrink-0 items-center justify-center gap-2.5 bg-brand px-6 font-display text-[0.72rem] font-semibold tracking-[0.08em] text-white uppercase shadow-[0_10px_40px_-10px_rgba(10,124,255,0.75)] transition-colors duration-300 chamfer-sm group-hover:bg-brand-400">
                See upcoming games
                <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.4} />
              </span>
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
