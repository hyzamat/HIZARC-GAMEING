import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useId, type MouseEvent, type PointerEvent, type Ref } from 'react'
import { GameArt } from '@/components/art/GameArt'
import { EASE_OUT } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import type { Game } from '@/data/games'
import { useFinePointer, useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { PlatformIcons, Rating } from './GameMeta'
import { artLayoutId, GRID_LAYOUT_SPRING, SHARED_ART_TRANSITION, withAlpha } from './shared'

/** Max tilt in degrees. */
const TILT = 7
const TILT_SPRING = { stiffness: 220, damping: 22, mass: 0.6 }

type GameCardProps = {
  game: Game
  /** Grid has scrolled into view — play the entrance. */
  revealed: boolean
  /** Entrance delay (s) for the stagger. */
  delay: number
  /** Lift above the modal layer while the art flies back into this card. */
  elevated?: boolean
  onOpen: (game: Game, opener: HTMLElement) => void
  className?: string
  ref?: Ref<HTMLLIElement>
}

/**
 * Library card. The whole card is clickable through a stretched <button> inside the <h3>
 * (accessible name = game title). Fine pointers get a 3D tilt, a cursor-following
 * specular highlight and a border that glows in the game's palette.
 */
export function GameCard({ game, revealed, delay, elevated = false, onOpen, className, ref }: GameCardProps) {
  const fine = useFinePointer()
  // Below 640px the cards live in the scroll-driven snap rail, whose depth effect owns the transform.
  const grid = useMediaQuery('(min-width: 640px)')
  const reduce = useReducedMotion()
  const tilt = fine && grid && !reduce
  const descId = useId()

  // Pointer position: normalised (tilt) and in px (gradients).
  const nx = useMotionValue(0.5)
  const ny = useMotionValue(0.5)
  const px = useMotionValue(-400)
  const py = useMotionValue(-400)
  const rotateX = useSpring(useTransform(ny, [0, 1], [TILT, -TILT]), TILT_SPRING)
  const rotateY = useSpring(useTransform(nx, [0, 1], [-TILT, TILT]), TILT_SPRING)
  const glare = useMotionTemplate`radial-gradient(420px circle at ${px}px ${py}px, rgba(255,255,255,0.13), transparent 42%)`
  const borderGlow = useMotionTemplate`radial-gradient(280px circle at ${px}px ${py}px, ${game.palette.to}, transparent 70%)`

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!tilt || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    nx.set(x / r.width)
    ny.set(y / r.height)
    px.set(x)
    py.set(y)
  }
  const resetTilt = () => {
    nx.set(0.5)
    ny.set(0.5)
  }

  const open = (e: MouseEvent<HTMLButtonElement>) => {
    const opener = e.currentTarget
    if (!tilt) return onOpen(game, opener)
    // Flatten the card first so the shared-art morph starts from an untilted box.
    resetTilt()
    rotateX.jump(0)
    rotateY.jump(0)
    requestAnimationFrame(() => onOpen(game, opener))
  }

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : undefined}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25, ease: EASE_OUT } }}
      transition={{ default: { duration: 0.85, ease: EASE_OUT, delay }, layout: GRID_LAYOUT_SPRING }}
      className={cn('relative', elevated && 'z-[71]', className)}
    >
      <motion.article
        onPointerMove={onMove}
        onPointerLeave={resetTilt}
        style={tilt ? { rotateX, rotateY, transformPerspective: 1000 } : undefined}
        className="group relative isolate flex h-full flex-col outline-cyan has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4"
      >
        {/* palette glow behind the card (hover) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(60% 55% at 50% 45%, ${withAlpha(game.palette.to, 0.22)}, transparent 72%)` }}
        />

        {/* frame: hairline border + cursor glow + surface */}
        <span aria-hidden className="absolute inset-0 -z-10 bg-white/[0.09] transition-colors duration-500 chamfer group-hover:bg-white/[0.16]">
          {tilt && <motion.span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: borderGlow }} />}
          <span className="absolute inset-px bg-ink-800 chamfer [--cut:13.5px]" />
        </span>

        {/* key art — shared element with the modal header */}
        <motion.div
          layoutId={artLayoutId(game.slug)}
          transition={{ layout: SHARED_ART_TRANSITION }}
          className="relative m-px mb-0 aspect-[16/10] overflow-hidden [clip-path:polygon(13px_0,100%_0,100%_100%,0_100%,0_13px)]"
        >
          <span className="absolute inset-0 transition-transform duration-[1.1s] ease-out-expo group-hover:scale-[1.07]">
            <GameArt palette={game.palette} motif={game.motif} seed={game.slug} image={game.image} alt={game.imageAlt} className="absolute inset-0" />
          </span>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-800 via-ink-800/35 to-transparent" />
          <span className="absolute top-3 left-3 flex flex-wrap gap-1.5 sm:top-4 sm:left-4">
            {/* solid-ish fills instead of backdrop blur: a dozen blurred layers inside a scrolling rail is costly on phones */}
            <Tag className="bg-ink-950/75 text-snow ring-white/15">{game.category}</Tag>
            {game.badge && (
              <Tag tone="volt" dot className="bg-ink-950/75">
                {game.badge}
              </Tag>
            )}
          </span>
        </motion.div>

        {/* body */}
        <div className="flex flex-1 flex-col px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
          <p className="font-mono text-[0.66rem] tracking-[0.22em] text-haze uppercase">
            {game.genre} <span className="text-white/20">/</span> {game.releaseStatus ?? game.year}
          </p>
          <h3 className="mt-2 font-display text-[1.3rem] leading-tight font-bold tracking-[-0.01em] text-snow sm:text-[1.4rem]">
            <button
              type="button"
              onClick={open}
              aria-describedby={descId}
              aria-haspopup="dialog"
              className="text-left after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
            >
              {game.title}
            </button>
          </h3>
          <p id={descId} className="mt-2 line-clamp-2 text-sm leading-relaxed text-mist">
            {game.tagline}
          </p>

          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <PlatformIcons platforms={game.platforms} className="text-mist" />
              <div className="flex items-center gap-3">
                <Rating rating={game.rating} />
                <span
                  aria-hidden
                  className="grid size-9 place-items-center bg-white/[0.06] text-snow transition-[background-color,color] duration-300 chamfer-sm group-hover:bg-brand group-hover:text-white"
                >
                  <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* specular highlight that follows the cursor */}
        {tilt && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-500 chamfer group-hover:opacity-100"
            style={{ background: glare }}
          />
        )}
      </motion.article>
    </motion.li>
  )
}
