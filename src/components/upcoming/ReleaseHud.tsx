import { motion } from 'framer-motion'
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { isPrerender, useNow } from './clock'
import { formatLaunch, parseLaunch } from './meta'
import { RollingNumber } from './RollingNumber'

/* ---------------------------------------------------------------- */
/*  Time maths                                                      */
/* ---------------------------------------------------------------- */

export type DurationParts = { d: number; h: number; m: number; s: number }

/** Milliseconds → whole days / hours / minutes / seconds (never negative). */
export function splitDuration(ms: number): DurationParts {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(total / 86_400),
    h: Math.floor(total / 3_600) % 24,
    m: Math.floor(total / 60) % 60,
    s: total % 60,
  }
}

const UNITS = [
  { key: 'd', label: 'Days', short: 'd' },
  { key: 'h', label: 'Hrs', short: 'h' },
  { key: 'm', label: 'Min', short: 'm' },
  { key: 's', label: 'Sec', short: 's' },
] as const

function srDuration({ d, h, m }: DurationParts) {
  return `${d} ${d === 1 ? 'day' : 'days'}, ${h} ${h === 1 ? 'hour' : 'hours'} and ${m} ${m === 1 ? 'minute' : 'minutes'} to go`
}

/* ---------------------------------------------------------------- */
/*  Release HUD (inside each upcoming card)                         */
/* ---------------------------------------------------------------- */

type ReleaseHudProps = {
  releaseDate?: string
  releaseWindow?: string
  /** Tick the countdown (card visible and not buried under the deck). */
  active: boolean
  /** Stage accent colour for the small HUD markers. */
  accent: string
  className?: string
}

/**
 * The "when" block of a card:
 *  - exact `releaseDate` in the future → live D/H/M/S countdown
 *  - `releaseDate` in the past         → "Out now"
 *  - no date                           → "Coming {releaseWindow}"
 */
export function ReleaseHud({ releaseDate, releaseWindow, active, accent, className }: ReleaseHudProps) {
  const launch = parseLaunch(releaseDate)
  const now = useNow(active && launch !== null)

  if (launch === null) {
    return (
      <div className={className}>
        <HudLabel accent={accent} left="Release window" right="Date TBA" />
        <p className="mt-2.5 flex items-baseline gap-3 font-display leading-none font-bold uppercase sm:mt-3">
          <span className="text-[0.9rem] tracking-[0.04em] text-mist sm:text-base">Coming</span>
          <span className="text-gradient text-[2.3rem] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem]">{releaseWindow ?? 'Soon'}</span>
        </p>
      </div>
    )
  }

  const { date, time } = formatLaunch(launch)
  if (isPrerender) {
    // Static HTML: just the (stable) launch date. The countdown appears once the app boots.
    return (
      <div className={className}>
        <HudLabel accent={accent} left="Launch" right={`${date} · ${time}`} />
      </div>
    )
  }
  const left = launch - now

  if (left <= 0) {
    return (
      <div className={className}>
        <HudLabel accent={accent} left="Launched" right={date} />
        <p className="mt-2.5 inline-flex items-center gap-3 font-display text-[2.1rem] leading-none font-bold text-volt uppercase sm:mt-3 sm:text-[2.6rem]">
          <span aria-hidden className="size-2.5 animate-pulse-soft rounded-full bg-volt shadow-[0_0_14px_rgba(215,255,58,0.8)]" />
          Out now
        </p>
      </div>
    )
  }

  const parts = splitDuration(left)
  return (
    <div className={className}>
      <HudLabel accent={accent} left="Launch in" right={`${date} · ${time}`} />
      <div role="timer" aria-label={`Countdown to launch on ${date}, ${time}`} className="mt-2.5 flex items-stretch gap-1 sm:mt-3 sm:gap-1.5">
        <span className="sr-only">{srDuration(parts)}</span>
        {UNITS.map((u, i) => (
          <Fragment key={u.key}>
            {i > 0 && (
              <span aria-hidden className="animate-pulse-soft self-start pt-1.5 font-display text-base leading-none text-volt/70 sm:pt-2 sm:text-xl lg:text-2xl">
                :
              </span>
            )}
            <div
              aria-hidden
              // a third day-digit (100+ days out) gets a wider cell so the row never overflows
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center bg-white/[0.045] px-1 pt-2 pb-1.5 ring-1 ring-white/[0.07] ring-inset chamfer-sm sm:pt-2.5 sm:pb-2',
                u.key === 'd' && parts.d >= 100 && 'flex-[1.4]',
              )}
            >
              <RollingNumber
                value={parts[u.key]}
                className="font-display text-[clamp(1.1rem,6.1vw,1.45rem)] leading-none font-semibold text-snow sm:text-[1.8rem] lg:text-[2.15rem]"
              />
              <span className="mt-1 font-mono text-[0.56rem] tracking-[0.2em] text-mist/80 uppercase sm:mt-1.5 sm:text-[0.6rem]">{u.label}</span>
              {u.key === 's' && (
                // one sweep per second — the "tick"
                <motion.span
                  key={parts.s}
                  className="absolute inset-x-2 bottom-0 h-[2px] origin-left bg-volt/80"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              )}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function HudLabel({ left, right, accent }: { left: ReactNode; right: ReactNode; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[0.6rem] tracking-[0.2em] uppercase sm:text-[0.64rem]">
      <span className="inline-flex shrink-0 items-center gap-2 text-haze">
        <span aria-hidden className="h-[3px] w-3.5 -skew-x-[28deg]" style={{ backgroundColor: accent }} />
        {left}
      </span>
      <span className="min-w-0 truncate text-right text-snow/90">{right}</span>
    </div>
  )
}

/* ---------------------------------------------------------------- */
/*  Compact inline countdown ("69d 04h 22m 09s")                    */
/* ---------------------------------------------------------------- */

export function CompactCountdown({ ms, className }: { ms: number; className?: string }) {
  const parts = splitDuration(ms)
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2.5 font-mono text-snow', className)}>
      <span className="sr-only">{srDuration(parts)}</span>
      {UNITS.map((u) => (
        <span key={u.key} aria-hidden className="inline-flex items-baseline">
          <RollingNumber value={parts[u.key]} slotClassName="h-[1.25em] w-[0.62em]" />
          <span className="ml-0.5 text-[0.7em] text-haze">{u.short}</span>
        </span>
      ))}
    </span>
  )
}
