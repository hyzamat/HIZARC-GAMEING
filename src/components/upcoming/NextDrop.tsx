import { useInView } from 'framer-motion'
import { useRef } from 'react'
import type { UpcomingGame } from '@/data/games'
import { cn } from '@/lib/cn'
import { useNow } from './clock'
import { parseLaunch } from './meta'
import { CompactCountdown } from './ReleaseHud'

type NextDropProps = { games: UpcomingGame[]; className?: string }

/**
 * Section-header readout: the soonest dated launch with a live "69d 04h 22m 09s" countdown.
 * Ticks only while on screen (shares the single page-wide clock).
 */
export function NextDrop({ games, className }: NextDropProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visible = useInView(ref)
  const now = useNow(visible)

  let next: { title: string; at: number } | null = null
  for (const game of games) {
    const at = parseLaunch(game.releaseDate)
    if (at !== null && at > now && (!next || at < next.at)) next = { title: game.title, at }
  }

  return (
    <div ref={ref} className={cn('relative w-full bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/10 ring-inset chamfer-sm sm:w-auto sm:min-w-[19rem] sm:px-5', className)}>
      <span aria-hidden className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-volt to-volt/0" />
      {next ? (
        <>
          <p className="flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.22em] text-haze uppercase">
            <span aria-hidden className="size-1.5 shrink-0 animate-pulse-soft rounded-full bg-volt shadow-[0_0_10px_rgba(215,255,58,0.8)]" />
            Next drop
            <span className="truncate text-snow">{next.title}</span>
          </p>
          <CompactCountdown ms={next.at - now} className="mt-2 text-base sm:text-[1.05rem]" />
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.22em] text-haze uppercase">
            <span aria-hidden className="size-1.5 shrink-0 animate-pulse-soft rounded-full bg-cyan" />
            In the pipeline
          </p>
          <p className="mt-2 font-display text-base font-semibold text-snow">{games.length} projects in development</p>
        </>
      )}
    </div>
  )
}
