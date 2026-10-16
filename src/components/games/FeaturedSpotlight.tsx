import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useId, useRef, type PointerEvent } from 'react'
import { GameArt } from '@/components/art/GameArt'
import { Button } from '@/components/ui/Button'
import { EASE_IN_OUT, EASE_OUT } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import type { Game } from '@/data/games'
import { useFinePointer } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { PlatformIcons, Rating } from './GameMeta'
import { StoreButtons } from './StoreButtons'
import { pad2, withAlpha } from './shared'

type FeaturedSpotlightProps = {
  game: Game
  /** Position of this game in the full catalogue (HUD "No. 01 / 06"). */
  number: number
  total: number
  onOpen: (opener: HTMLElement) => void
  className?: string
}

const content: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.75 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
}
const slideIn: Variants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT } },
}

/**
 * Cinematic spotlight for the featured title: a slanted curtain wipes away to
 * reveal the key art (which settles from a slow zoom), then the copy rises in.
 * While scrolling, the art drifts slower than the panel for depth.
 */
export function FeaturedSpotlight({ game, number, total, onOpen, className }: FeaturedSpotlightProps) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const titleId = useId()
  const inView = useInView(ref, { once: true, amount: 0.3 })

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const artY = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-8%', '8%'])

  // Mouse / trackpad only: the key art leans a few px against the cursor (on top of the scroll parallax).
  const fine = useFinePointer()
  const lean = fine && !reduce
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 70, damping: 18, mass: 0.8 })
  const sy = useSpring(my, { stiffness: 70, damping: 18, mass: 0.8 })
  const leanX = useTransform(sx, (v) => v * -26)
  const leanY = useTransform(sy, (v) => v * -16)
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!lean || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const { palette } = game

  return (
    <motion.article
      ref={ref}
      aria-labelledby={titleId}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      onPointerMove={lean ? onMove : undefined}
      onPointerLeave={lean ? onLeave : undefined}
      className={cn('relative isolate', className)}
    >
      {/* ambient glow in the game's colours (never wider than the page gutter, so it can't cause sideways scroll) */}
      <motion.div
        aria-hidden
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 1.6, delay: 0.4 } } }}
        className="pointer-events-none absolute -inset-x-4 -inset-y-10 -z-10 sm:-inset-x-8 sm:-inset-y-16 lg:-inset-x-12"
        style={{
          background: `radial-gradient(55% 50% at 30% 60%, ${withAlpha(palette.via, 0.28)}, transparent 70%), radial-gradient(45% 45% at 80% 30%, ${withAlpha(palette.to, 0.18)}, transparent 70%)`,
        }}
      />

      <div className="relative overflow-hidden bg-ink-900 chamfer [--cut:20px] sm:[--cut:28px]">
        <div className="relative flex aspect-[4/5] flex-col justify-end sm:aspect-[4/3] md:aspect-[16/10] xl:aspect-[21/9]">
          {/* art: scroll-parallax layer › cursor-lean layer › zoom-settle layer (side bleed hides the lean's edges) */}
          {/* real artwork stays visible to screen readers and image search (via its alt); generated art is decoration */}
          <motion.div aria-hidden={!game.image} className="absolute -inset-x-[4%] -top-[12%] -bottom-[12%]" style={{ y: artY }}>
            <motion.div className="absolute inset-0" style={lean ? { x: leanX, y: leanY } : undefined}>
              <motion.div
                className="absolute inset-0"
                variants={{ hidden: { scale: 1.2 }, show: { scale: 1, transition: { duration: 2.2, ease: EASE_OUT, delay: 0.15 } } }}
              >
                <GameArt palette={palette} motif={game.motif} seed={game.slug} image={game.image} alt={game.imageAlt} className="absolute inset-0" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* legibility gradients */}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-transparent md:via-ink-950/30" />
          <div aria-hidden className="absolute inset-0 hidden bg-gradient-to-r from-ink-950/85 via-ink-950/35 to-transparent md:block" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink-950/60 to-transparent" />

          {/* HUD frame */}
          <div aria-hidden className="pointer-events-none absolute inset-3 sm:inset-5">
            <span className="absolute top-0 right-0 size-4 border-t border-r border-white/40" />
            <span className="absolute bottom-0 left-0 size-4 border-b border-l border-white/40" />
          </div>

          {/* top HUD row */}
          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.8, delay: 0.9 } } }}
            className="absolute inset-x-5 top-5 z-10 flex items-center justify-between gap-3 font-mono text-[0.62rem] tracking-[0.25em] text-snow/80 uppercase sm:inset-x-8 sm:top-8 sm:text-[0.68rem]"
          >
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-volt" />
              Spotlight
            </span>
            <span>
              No. {pad2(number)} <span className="text-white/35">/ {pad2(total)}</span>
            </span>
          </motion.div>

          {/* feature list (large screens) */}
          <motion.ul
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 1.1 } } }}
            className="absolute right-10 bottom-10 z-10 hidden w-64 space-y-3 lg:block xl:right-14 xl:bottom-14"
          >
            <motion.li variants={slideIn} className="mb-4 font-mono text-[0.62rem] tracking-[0.25em] text-cyan uppercase">
              [ Highlights ]
            </motion.li>
            {game.features.slice(0, 4).map((f, i) => (
              <motion.li key={f} variants={slideIn} className="flex items-baseline gap-3 border-b border-white/10 pb-3 text-sm text-snow/90">
                <span className="font-mono text-[0.62rem] text-haze">{pad2(i + 1)}</span>
                {f}
              </motion.li>
            ))}
          </motion.ul>

          {/* copy */}
          <motion.div variants={content} className="@container relative z-10 flex flex-col p-5 pt-28 sm:p-8 sm:pt-32 md:max-w-[38rem] lg:p-12 xl:max-w-[44rem]">
            <motion.div variants={rise} className="flex flex-wrap gap-2">
              <Tag tone="volt" dot>
                {game.badge ?? 'Featured'}
              </Tag>
              <Tag className="bg-ink-950/50 backdrop-blur-sm">{game.category}</Tag>
            </motion.div>

            <motion.h3
              id={titleId}
              variants={rise}
              className="mt-4 font-display text-[clamp(2.25rem,13.5cqi,7rem)] leading-[0.9] font-black tracking-[-0.03em] text-balance break-words text-snow"
            >
              {game.title}
            </motion.h3>

            <motion.p variants={rise} className="mt-3 text-lg font-medium text-snow/90 sm:mt-4 sm:text-2xl">
              {game.tagline}
            </motion.p>

            <motion.div variants={rise} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5 sm:mt-5">
              <p className="font-mono text-[0.68rem] tracking-[0.2em] text-mist uppercase">
                {game.genre} <span className="text-white/25">·</span> {game.engine} <span className="text-white/25">·</span> {game.releaseStatus ?? game.year}
              </p>
              <span aria-hidden className="hidden h-3 w-px bg-line-strong sm:block" />
              <PlatformIcons platforms={game.platforms} className="text-snow/80" />
              <span aria-hidden className="hidden h-3 w-px bg-line-strong sm:block" />
              <Rating rating={game.rating} players={game.players} />
            </motion.div>

            <motion.div
              variants={rise}
              className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3 [&>*:last-child:nth-child(even)]:col-span-2"
            >
              <Button
                onClick={(e) => onOpen(e.currentTarget)}
                aria-haspopup="dialog"
                icon={<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.4} />}
                className="col-span-2 sm:col-auto"
              >
                View details
              </Button>
              <StoreButtons links={game.links} title={game.title} itemClassName="w-full max-sm:gap-2.5 max-sm:px-3 sm:w-auto" />
            </motion.div>
          </motion.div>

          {/* reveal curtain: a slanted ink panel that wipes off to the right */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20"
            variants={{ hidden: { x: '0%' }, show: { x: '185%', transition: { duration: 1.4, ease: EASE_IN_OUT, delay: 0.05 } } }}
          >
            {/* 2× panel width so the slanted edges always cover the corners before the wipe */}
            <div className="absolute -inset-y-8 -left-1/2 w-[200%] -skew-x-[20deg] bg-ink-950">
              <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-cyan via-brand to-violet" />
              <span className="absolute inset-y-0 left-[3px] w-28 bg-gradient-to-r from-brand/30 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.article>
  )
}
