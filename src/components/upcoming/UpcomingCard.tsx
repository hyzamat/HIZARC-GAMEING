import { motion, useInView, type MotionValue, type Variants } from 'framer-motion'
import { Bell, Heart } from 'lucide-react'
import { Fragment, useId, useRef } from 'react'
import { GameArt } from '@/components/art/GameArt'
import { Button } from '@/components/ui/Button'
import { EASE_OUT } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import type { UpcomingGame } from '@/data/games'
import { cn } from '@/lib/cn'
import { DevProgress, StagePipeline } from './DevProgress'
import { isLiveStage, pad2, stageAccent, stageTone, withAlpha } from './meta'
import { PlatformList } from './PlatformList'
import { ReleaseHud } from './ReleaseHud'

/* ---------------------------------------------------------------- */
/*  Choreography                                                    */
/* ---------------------------------------------------------------- */

/** Fade-rise; `custom` = order within the block (staggers by 70ms). */
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_OUT, delay: 0.08 + i * 0.07 } }),
}

/** Title words rise from behind a mask. */
const word: Variants = {
  hidden: { y: '115%', rotate: 3 },
  show: (i: number = 0) => ({ y: '0%', rotate: 0, transition: { duration: 0.95, ease: EASE_OUT, delay: 0.12 + i * 0.07 } }),
}

/** HUD panel "scans in" top → bottom. */
const scanIn: Variants = {
  hidden: { opacity: 0, y: 24, clipPath: 'inset(0% 0% 100% 0%)' },
  show: { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 0.9, ease: EASE_OUT, delay: 0.1 } },
}

const once = (amount: number) => ({ initial: 'hidden' as const, whileInView: 'show' as const, viewport: { once: true, amount } })

/* ---------------------------------------------------------------- */
/*  Card                                                            */
/* ---------------------------------------------------------------- */

type UpcomingCardProps = {
  game: UpcomingGame
  index: number
  total: number
  /** False while the card is buried under the deck — pauses the art loop and the countdown. */
  live?: boolean
  /** Deck mode: arrival parallax for the key art. */
  artY?: MotionValue<string>
  artScale?: MotionValue<number>
  /** Deck mode: darkening as later cards pile on top (0–1). */
  dim?: MotionValue<number>
  /** Deck mode: a slanted band of light crossing the card as it lands (x in %, opacity 0–1). */
  sweepX?: MotionValue<string>
  sweepOpacity?: MotionValue<number>
  className?: string
}

/**
 * Cinematic "in development" card: full-bleed procedural key art, stage tag, huge title,
 * highlights and a HUD panel with the live launch countdown + segmented dev progress.
 * Phones: one stacked column. Desktop (lg): info left, glass HUD right.
 */
export function UpcomingCard({ game, index, total, live = true, artY, artScale, dim, sweepX, sweepOpacity, className }: UpcomingCardProps) {
  const titleId = useId()
  const hudRef = useRef<HTMLDivElement>(null)
  const hudVisible = useInView(hudRef)
  const hudShown = useInView(hudRef, { once: true, amount: 0.35 })
  const accent = stageAccent[game.stage]
  const { palette } = game
  const words = game.title.split(' ')

  const frame = `linear-gradient(180deg, ${withAlpha(palette.to, 0.95)} 0%, rgb(255 255 255 / 0.16) 14%, rgb(255 255 255 / 0.07) 55%, ${withAlpha(palette.to, 0.4)} 100%)`

  return (
    <div className={cn('relative flex flex-col p-px chamfer [--cut:20px] lg:[--cut:30px]', className)} style={{ background: frame }}>
      <article aria-labelledby={titleId} className="relative isolate flex flex-1 flex-col overflow-hidden bg-ink-900 chamfer [--cut:19.5px] lg:[--cut:29.5px]">
        {/* ---------- key art + legibility layers ---------- */}
        <motion.div aria-hidden className={cn('absolute inset-0 -z-10', artY && 'will-change-transform')} style={artY ? { y: artY, scale: artScale } : undefined}>
          <GameArt palette={palette} motif={game.motif} seed={game.slug} image={game.image} alt={game.imageAlt} animated={live} className="absolute inset-0" />
        </motion.div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.035)_0_1px,transparent_1px_3px)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/0 lg:via-ink-950/50" />
        <div aria-hidden className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-ink-950/85 via-ink-950/25 to-transparent lg:block" />
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-ink-950/70 to-transparent" />
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `radial-gradient(70% 55% at 12% 100%, ${withAlpha(palette.to, 0.22)}, transparent 70%)` }} />
        {sweepX && sweepOpacity && (
          // skew on an inner plain node: framer's inline transform (x) would override a skew class
          <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[22%]" style={{ x: sweepX, opacity: sweepOpacity }}>
            <div className="h-full -skew-x-[28deg] bg-gradient-to-r from-transparent via-white/[0.06] to-white/[0.2]" />
          </motion.div>
        )}

        {/* giant outlined deck index */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 right-3 font-display text-[5.25rem] leading-none font-bold tracking-[-0.04em] text-outline select-none sm:top-2 sm:right-6 sm:text-[7.5rem] lg:top-3 lg:right-9 lg:text-[10.5rem]"
        >
          {pad2(index + 1)}
        </span>

        <div className="relative flex flex-1 flex-col gap-4 p-4 sm:p-7 lg:p-10 lg:[@media(max-height:760px)]:p-7">
          {/* ---------- top row ---------- */}
          <motion.div {...once(0.8)} variants={rise} className="flex flex-wrap items-center gap-2 pr-24 sm:pr-40">
            <Tag tone={stageTone[game.stage]} dot={isLiveStage(game.stage)} className="bg-ink-950/75">
              {game.stage}
            </Tag>
            <span className="hidden font-mono text-[0.62rem] tracking-[0.24em] text-mist/80 uppercase sm:inline">
              <span className="text-haze">[</span>
              {pad2(index + 1)}/{pad2(total)}
              <span className="text-haze">]</span> In development
            </span>
          </motion.div>

          <div className="mt-auto grid gap-3.5 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,392px)] lg:gap-x-12 lg:gap-y-7">
            {/* ---------- info ---------- */}
            <motion.div {...once(0.4)} className="min-w-0 lg:col-start-1 lg:row-start-1">
              <motion.p variants={rise} custom={0} className="font-mono text-[0.62rem] tracking-[0.22em] text-mist/85 uppercase sm:text-[0.68rem]">
                {game.genre} <span className="text-white/25">/</span> {game.engine}
              </motion.p>
              <h3
                id={titleId}
                aria-label={game.title}
                className="mt-1.5 font-display text-[clamp(1.75rem,8.2vw,2.5rem)] leading-[0.98] font-bold tracking-[-0.02em] [overflow-wrap:anywhere] text-snow uppercase sm:mt-2 sm:text-[clamp(2.4rem,6.2vw,3.5rem)] lg:text-[clamp(2.75rem,4.3vw,4.5rem)]"
              >
                {/* the space must sit outside the inline-block mask, or it collapses ("KICKOFFKINGS") */}
                {words.map((w, i) => (
                  <Fragment key={i}>
                    <span aria-hidden className="-mb-[0.1em] inline-block overflow-hidden pb-[0.1em] align-bottom">
                      <motion.span variants={word} custom={i} className="inline-block">
                        {w}
                      </motion.span>
                    </span>
                    {i < words.length - 1 && ' '}
                  </Fragment>
                ))}
              </h3>
              <motion.p variants={rise} custom={2} className="mt-2 text-[0.95rem] leading-snug text-snow/85 sm:mt-3 sm:text-lg lg:text-xl">
                {game.tagline}
              </motion.p>
              <motion.p
                variants={rise}
                custom={3}
                className="mt-3 hidden max-w-xl text-[0.95rem] leading-relaxed text-mist lg:[@media(min-height:781px)]:block"
              >
                {game.description}
              </motion.p>
              <ul className="mt-3 grid gap-1.5 sm:mt-4 sm:gap-2 max-sm:[@media(max-height:720px)]:hidden" aria-label="Highlights">
                {game.highlights.map((h, i) => (
                  <motion.li key={h} variants={rise} custom={4 + i} className="flex items-center gap-2.5 text-[0.85rem] text-snow/90 sm:text-[0.95rem]">
                    <span aria-hidden className="h-2 w-3 shrink-0 -skew-x-[28deg]" style={{ backgroundColor: accent }} />
                    {h}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* ---------- HUD: release + progress ----------
                The in-view trigger lives on this UNCLIPPED wrapper: the panel itself starts at
                clip-path inset(0 0 100% 0), and IntersectionObserver counts a fully clipped
                target as never intersecting — so observing it directly never revealed it. */}
            <div ref={hudRef} className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end">
              <motion.div
                initial="hidden"
                animate={hudShown ? 'show' : 'hidden'}
                variants={scanIn}
                className="relative bg-ink-950/65 p-3.5 ring-1 ring-white/10 ring-inset sm:p-5 lg:bg-ink-950/45 lg:p-6 lg:backdrop-blur-md"
              >
                <HudBrackets color={accent} />
                <div className="sm:grid sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] sm:items-end sm:gap-6 lg:block">
                  <ReleaseHud releaseDate={game.releaseDate} releaseWindow={game.releaseWindow} active={live && hudVisible} accent={accent} />
                  <div aria-hidden className="my-3.5 h-px bg-gradient-to-r from-white/15 via-white/[0.06] to-transparent sm:hidden lg:my-5 lg:block" />
                  <DevProgress progress={game.progress} accent={accent} />
                </div>
                <StagePipeline stage={game.stage} accent={accent} className="mt-5 hidden lg:[@media(min-height:761px)]:block" />
              </motion.div>
            </div>

            {/* ---------- CTA ---------- */}
            <motion.div
              {...once(0.6)}
              variants={rise}
              custom={1}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:col-start-1 lg:row-start-2 lg:justify-start lg:gap-8"
            >
              {/* `inert` while buried under the deck: the button can't be focused when it's invisible */}
              <div inert={!live}>
                {game.wishlistUrl ? (
                  <Button href={game.wishlistUrl} icon={<Heart aria-hidden className="size-4" strokeWidth={2.2} />} aria-label={`Wishlist ${game.title}`} className="lg:h-14 lg:px-8">
                    Wishlist
                  </Button>
                ) : (
                  <Button href="#contact" icon={<Bell aria-hidden className="size-4" strokeWidth={2.2} />} aria-label={`Get notified about ${game.title}`} className="lg:h-14 lg:px-8">
                    Get notified
                  </Button>
                )}
              </div>
              <PlatformList platforms={game.platforms} labels="lg" className="justify-end text-mist lg:justify-start" />
            </motion.div>
          </div>
        </div>

        {/* deck darkening (on top of everything) */}
        {dim && <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-ink-950" style={{ opacity: dim }} />}
      </article>
    </div>
  )
}

/** Four HUD corner brackets in the stage colour. */
function HudBrackets({ color }: { color: string }) {
  const base = 'pointer-events-none absolute size-3 sm:size-3.5'
  return (
    <span aria-hidden style={{ color }}>
      <span className={cn(base, 'top-0 left-0 border-t-2 border-l-2 border-current')} />
      <span className={cn(base, 'top-0 right-0 border-t-2 border-r-2 border-current')} />
      <span className={cn(base, 'bottom-0 left-0 border-b-2 border-l-2 border-current')} />
      <span className={cn(base, 'right-0 bottom-0 border-r-2 border-b-2 border-current')} />
    </span>
  )
}
