import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Star } from 'lucide-react'
import { GameArt } from '@/components/art/GameArt'
import { EASE_OUT } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { Equalizer } from './NowPlaying'
import { useHeroTiming } from './timing'
import { pad2, useNowPlaying } from './useNowPlaying'

type NowPlayingChipProps = {
  /** Intro finished — the chip may enter (pass useIntroDone()). */
  play: boolean
  /** Hero is on screen — the timer only runs while true. */
  active: boolean
  className?: string
}

/** One full pass through the games, then it rests (no endless auto-updating on a phone). */
const LOOPS = 1

/**
 * Phone / small-tablet version of the "now playing" card: a single compact glass
 * row that tells which game is up, with a hairline progress bar along its
 * bottom edge. Only mounted when the screen is tall enough for it to sit well
 * clear of the calls to action. Tap → #games.
 */
export function NowPlayingChip({ play, active, className }: NowPlayingChipProps) {
  const t = useHeroTiming()
  const [entered, setEntered] = useState(false)
  const { reduce, index, total, game, progress, running } = useNowPlaying({ ready: play && entered, active, hold: false, maxLoops: LOOPS })

  if (total === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay: t.card }}
      onAnimationComplete={() => {
        if (play) setEntered(true)
      }}
      className={cn('relative isolate w-full sm:max-w-[22rem]', className)}
    >
      <div className="chamfer bg-gradient-to-br from-white/25 via-white/[0.05] to-brand/45 p-px [--cut:14px]">
        <a
          href="#games"
          aria-label={`Now playing: ${game.title}. See all our games`}
          className="chamfer group relative block h-14 overflow-hidden bg-ink-900/90 outline-offset-[-3px] [--cut:13px]"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={game.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="absolute inset-0 flex items-center gap-3 pr-3 pl-3"
            >
              <GameArt
                palette={game.palette}
                motif={game.motif}
                seed={game.slug}
                image={game.image}
                animated={false}
                className="chamfer-sm size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-mono text-[0.56rem] tracking-[0.22em] text-haze uppercase">
                  <Equalizer paused={!running} />
                  <span>Now playing</span>
                  <span className="ml-auto tracking-[0.1em] text-haze/70 tabular-nums">
                    {pad2(index + 1)}/{pad2(total)}
                  </span>
                </p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="truncate font-display text-[0.78rem] leading-none font-semibold tracking-tight text-snow">{game.title}</span>
                  {game.rating !== undefined && (
                    <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.68rem] text-volt">
                      <Star className="size-3 fill-current" strokeWidth={0} aria-hidden />
                      {game.rating.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-mist transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} aria-hidden />
            </motion.div>
          </AnimatePresence>

          {/* Hairline timer along the bottom edge */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
            <motion.span className="absolute inset-0 origin-left bg-gradient-to-r from-brand to-cyan" style={{ scaleX: reduce ? 0 : progress }} />
          </span>
        </a>
      </div>
    </motion.div>
  )
}
