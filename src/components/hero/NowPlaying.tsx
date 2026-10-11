import { useState, type FocusEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, Star } from 'lucide-react'
import { GameArt } from '@/components/art/GameArt'
import { EASE_OUT } from '@/components/ui/Reveal'
import { games } from '@/data/games'
import { cn } from '@/lib/cn'
import { useHeroTiming } from './timing'
import { pad2, useNowPlaying } from './useNowPlaying'

type NowPlayingProps = {
  /** Intro finished — the card may enter (pass useIntroDone()). */
  play: boolean
  /** Hero is on screen — the timer only runs while true. */
  active: boolean
  className?: string
}

/**
 * Glass "NOW PLAYING" HUD card (tablet & desktop). Auto-cycles through the
 * released games every ~4s with a slide/crossfade, a story-style segmented
 * progress bar and a soft glow tinted by the current game's palette. Pauses on
 * hover / keyboard focus, when the hero leaves the screen, when the tab is
 * hidden or when the visitor presses the pause button. Reduced motion: no
 * autoplay — the segments become a manual selector. Click → #games.
 */
export function NowPlaying({ play, active, className }: NowPlayingProps) {
  const t = useHeroTiming()
  const [entered, setEntered] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)

  const { reduce, index, total, game, progress, running, select } = useNowPlaying({
    ready: play && entered,
    active,
    hold: hovered || focused || userPaused,
  })

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    // Only keyboard focus pauses; a mouse click on a segment must not freeze the cycle.
    if (e.target.matches(':focus-visible')) setFocused(true)
  }

  if (total === 0) return null

  return (
    <motion.div
      role="group"
      aria-label="Now playing"
      initial="hidden"
      animate={play ? 'show' : 'hidden'}
      variants={{
        hidden: { opacity: 0, x: 56 },
        show: { opacity: 1, x: 0, transition: { duration: 1.1, ease: EASE_OUT, delay: t.card } },
      }}
      onAnimationComplete={(def) => {
        if (def === 'show') setEntered(true)
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={() => setFocused(false)}
      className={cn('relative isolate w-[19rem] lg:w-[21rem]', className)}
    >
      {/* Palette-tinted glow behind the card (crossfades per game) */}
      <AnimatePresence initial={false}>
        <motion.span
          key={game.slug}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
          className="pointer-events-none absolute -inset-10 -z-10"
          style={{ background: `radial-gradient(closest-side, ${game.palette.to}33, transparent)` }}
        />
      </AnimatePresence>

      {/* Gradient hairline frame → glass body (both chamfered like the logo's cuts) */}
      <div className="chamfer bg-gradient-to-br from-white/30 via-white/[0.06] to-brand/50 p-px [--cut:18px]">
        <div className="chamfer bg-ink-900/85 backdrop-blur-md [--cut:17px]">
          <a href="#games" aria-label={`Now playing: ${game.title}. See all our games`} className="group relative block outline-offset-[-3px]">
            <div className="relative h-[5.5rem] overflow-hidden">
              <AnimatePresence initial={false}>
                <motion.div
                  key={game.slug}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                  className="absolute inset-0 flex items-center gap-4 px-4"
                >
                  <GameArt
                    palette={game.palette}
                    motif={game.motif}
                    seed={game.slug}
                    image={game.image}
                    animated={false}
                    className="chamfer-sm size-16 shrink-0 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.25em] text-haze uppercase">
                      <Equalizer paused={!running} />
                      <span>Now playing</span>
                      <span className="ml-auto pr-0.5 tracking-[0.12em] text-haze/70 tabular-nums">
                        {pad2(index + 1)}/{pad2(total)}
                      </span>
                    </p>
                    <p className="mt-1.5 truncate font-display text-[0.95rem] leading-tight font-semibold tracking-tight text-snow">{game.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-mist">
                      <span className="truncate">{game.genre}</span>
                      {game.rating !== undefined && (
                        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-volt">
                          <Star className="size-3 fill-current" strokeWidth={0} aria-hidden />
                          {game.rating.toFixed(1)}
                        </span>
                      )}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </a>

          {/* Story-style segments (done / running / waiting) — buttons, so the card is also a manual selector — plus a pause switch */}
          <div className="flex items-center gap-1.5 pr-2 pb-1.5 pl-4">
            {games.map((g, i) => (
              <button
                key={g.slug}
                type="button"
                aria-label={`Show ${g.title}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => select(i)}
                className="group/seg flex h-6 min-w-0 flex-1 items-center pointer-coarse:h-11"
              >
                <span className="relative h-[3px] w-full -skew-x-[28deg] overflow-hidden bg-white/12 transition-colors group-hover/seg:bg-white/25">
                  {i < index && <span className="absolute inset-0 bg-white/55" />}
                  {i === index && (
                    <motion.span className="absolute inset-0 origin-left bg-gradient-to-r from-brand to-cyan" style={{ scaleX: reduce ? 1 : progress }} />
                  )}
                </span>
              </button>
            ))}
            {!reduce && total > 1 && (
              <button
                type="button"
                aria-label={userPaused ? 'Resume the rotation' : 'Pause the rotation'}
                aria-pressed={userPaused}
                onClick={() => setUserPaused((v) => !v)}
                className="ml-1 grid size-6 shrink-0 place-items-center text-haze transition-colors hover:text-snow pointer-coarse:size-11"
              >
                {userPaused ? <Play className="size-3 fill-current" strokeWidth={0} aria-hidden /> : <Pause className="size-3 fill-current" strokeWidth={0} aria-hidden />}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Three volt bars bouncing like a level meter; frozen while the card is paused. */
export function Equalizer({ paused }: { paused: boolean }) {
  return (
    <span aria-hidden className="flex h-3 items-end gap-[2px]">
      {[0, -0.35, -0.7].map((delay) => (
        <span
          key={delay}
          className={cn('h-full w-[2px] origin-bottom animate-[hz-eq_0.9s_ease-in-out_infinite] bg-volt', paused && '[animation-play-state:paused]')}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  )
}
