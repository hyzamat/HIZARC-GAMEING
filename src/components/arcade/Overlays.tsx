import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useIsPresent } from 'framer-motion'
import { Play, RotateCcw, Share2 } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { EASE_OUT } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { padScore } from './constants'
import type { RunResult } from './engine'
import { Leaderboard } from './Leaderboard'
import { sanitizeInitials, type ScoreEntry } from './scores'

/** Everything the game-over card needs about the run that just ended. */
export type OverState = RunResult & {
  isNewBest: boolean
  /** 1-based spot on the local board this score would take (null = misses the top 5). */
  rank: number | null
  /** Initials already stored for this run. */
  saved: boolean
}

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
}

/** Chamfered card with a gradient hairline — the overlay surface. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="chamfer w-full bg-gradient-to-br from-brand/70 via-cyan/35 to-violet/60 p-px [--cut:20px]">
      <div className={cn('chamfer relative overflow-hidden bg-ink-950/92 [--cut:19px]', className)}>{children}</div>
    </div>
  )
}

const label = 'font-mono text-[0.62rem] tracking-[0.26em] uppercase sm:text-[0.68rem]'

/* ================================================================== */
/*  Title                                                             */
/* ================================================================== */

export function TitleOverlay({ best, reduced, onPlay }: { best: number; reduced: boolean; onPlay: () => void }) {
  // While the card fades out the run is already live: its button must not eat the first jump tap.
  const present = useIsPresent()
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 text-center" {...fade}>
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(3,5,12,0.78),rgba(3,5,12,0.3)_65%,transparent)]" />
      <div className="relative flex flex-col items-center gap-2.5 sm:gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
          className="w-11 drop-shadow-[0_0_22px_rgba(46,230,255,0.55)] sm:w-14"
        >
          <LogoMark variant="gradient" title="" />
        </motion.div>
        <p className={cn(label, 'text-cyan')}>Bonus level · endless runner</p>
        <p className="font-display text-[clamp(1.75rem,7.6vw,3.5rem)] leading-none font-extrabold tracking-[-0.02em] text-snow">
          HIZARC <span className="text-gradient">DASH</span>
        </p>
        <p className={cn(label, 'text-mist', !reduced && 'animate-pulse-soft')}>{reduced ? 'Press play to start' : 'Tap / Click / Space to play'}</p>
        <div className={cn('mt-1', present ? 'pointer-events-auto' : 'pointer-events-none')}>
          <Button size="lg" icon={<Play className="size-4 fill-current" strokeWidth={2.4} />} onClick={onPlay}>
            Play
          </Button>
        </div>
        <p className={cn(label, 'text-haze')}>
          Best <span className="text-snow tabular-nums">{padScore(best)}</span>
        </p>
      </div>
    </motion.div>
  )
}

/* ================================================================== */
/*  Pause                                                             */
/* ================================================================== */

export function PauseOverlay({ onResume }: { onResume: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const present = useIsPresent()

  // The visitor just paused on purpose — move focus to Resume so Enter / Space continues.
  // (Skipped when the game paused itself because it was scrolled away: a focused button off-screen would eat Space.)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.bottom > 80 && r.top < window.innerHeight - 80) el.querySelector<HTMLElement>('a,button')?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.div className={cn('absolute inset-0 z-10 grid place-items-center bg-ink-950/65 px-4 text-center', !present && 'pointer-events-none')} {...fade}>
      <div ref={ref} className="flex flex-col items-center gap-4">
        <p className="font-display text-[clamp(1.6rem,6vw,2.6rem)] leading-none font-extrabold tracking-[0.04em] text-snow uppercase">Paused</p>
        <Button size="lg" icon={<Play className="size-4 fill-current" strokeWidth={2.4} />} onClick={onResume}>
          Resume
        </Button>
        <p className={cn(label, 'text-haze')}>Esc / P to resume</p>
      </div>
    </motion.div>
  )
}

/* ================================================================== */
/*  Game over                                                         */
/* ================================================================== */

function useCountUp(target: number, instant: boolean) {
  const [value, setValue] = useState(instant ? target : 0)
  useEffect(() => {
    if (instant) {
      setValue(target)
      return
    }
    const controls = animate(0, target, {
      duration: Math.min(1.2, 0.45 + target / 7000),
      ease: EASE_OUT,
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [target, instant])
  return value
}

type GameOverProps = {
  over: OverState
  best: number
  board: ScoreEntry[]
  latest: number | null
  /** Enough room inside the stage for the two-column card with the leaderboard. */
  roomy: boolean
  /** Stage is short (landscape phone / small tablet): drop the stats row. */
  short: boolean
  reduced: boolean
  initials: string
  onInitials: (value: string) => void
  onSave: () => void
  onPlayAgain: () => void
  onShare: () => void
}

export function GameOverOverlay({ over, best, board, latest, roomy, short, reduced, initials, onInitials, onSave, onPlayAgain, onShare }: GameOverProps) {
  const shown = useCountUp(over.score, reduced)
  const actionsRef = useRef<HTMLDivElement>(null)
  const present = useIsPresent()
  const needsInitials = over.rank !== null && !over.saved

  // Pointer taps are ignored for a beat: a player still mashing jump must not hit "Play again" / "Share"
  // by accident before they have even seen their score. (Keyboard users are not affected.)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 500)
    return () => window.clearTimeout(t)
  }, [])

  const header = (
    <div className="relative flex items-center justify-between gap-3">
      <p className={cn(label, 'text-ember')}>Game over</p>
      {over.isNewBest && (
        <motion.span
          className="relative inline-flex items-center bg-volt px-3 py-1 shadow-[0_0_26px_rgba(215,255,58,0.55)]"
          // skew via framer (not a Tailwind class): framer's inline transform for `scale` would override a class skew
          style={{ skewX: -28 }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.18, 1], opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.25, ease: EASE_OUT }}
        >
          <span className="inline-block skew-x-[28deg] font-display text-[0.68rem] font-extrabold tracking-[0.1em] text-ink-950 uppercase">New best!</span>
        </motion.span>
      )}
    </div>
  )

  const summary = (
    <>
      <p className={cn(label, 'relative mt-3 text-haze sm:mt-4')}>Score</p>
      <p
        className={cn(
          'relative font-display leading-[1.05] font-extrabold tracking-[-0.02em] tabular-nums',
          roomy ? 'text-[clamp(2.4rem,5.4vw,3.4rem)]' : 'text-[clamp(2.2rem,11.5vw,4.2rem)]',
          over.isNewBest ? 'text-gradient' : 'text-snow',
        )}
      >
        {padScore(shown)}
      </p>

      {roomy && short ? (
        <span className="mt-3 block border-t border-line" />
      ) : (
        <dl className="relative mt-2.5 grid grid-cols-3 gap-2 border-y border-line py-2.5 text-left sm:mt-3 sm:py-3">
          <Stat term="Orbs" value={String(over.orbs)} />
          <Stat term="Time" value={`${Math.round(over.seconds)}s`} />
          <Stat term="Speed" value={`x${over.topSpeed.toFixed(1)}`} />
        </dl>
      )}

      <p className={cn(label, 'relative mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-haze')}>
        <span>
          Best <span className="text-snow tabular-nums">{padScore(best)}</span>
        </span>
        {over.rank !== null && <span className="text-cyan">Local rank #{over.rank}</span>}
      </p>

      {needsInitials && (
        <form
          className="relative mt-2.5 flex items-center gap-2 sm:mt-3"
          onSubmit={(e) => {
            e.preventDefault()
            onSave()
            // The form disappears once saved — hand keyboard focus to the next sensible control.
            requestAnimationFrame(() => actionsRef.current?.querySelector('button')?.focus({ preventScroll: true }))
          }}
        >
          <label htmlFor="dash-initials" className={cn(label, 'text-volt')}>
            Initials
          </label>
          <input
            id="dash-initials"
            value={initials}
            maxLength={3}
            placeholder="YOU"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => onInitials(sanitizeInitials(e.target.value))}
            className="chamfer-sm h-11 w-24 bg-ink-700 text-center font-display text-base tracking-[0.3em] text-snow uppercase placeholder:text-haze/60"
          />
          <button
            type="submit"
            className="chamfer-sm h-11 bg-volt px-4 font-display text-[0.7rem] font-bold tracking-[0.08em] text-ink-950 uppercase transition-colors hover:bg-white"
          >
            Save
          </button>
        </form>
      )}
      {over.rank !== null && over.saved && <p className={cn(label, 'relative mt-3 text-volt')}>Saved to your local board</p>}
    </>
  )

  const actions = (
    <div ref={actionsRef} className={cn('relative flex flex-col gap-2', !roomy && 'mt-3 sm:mt-4')}>
      <Button className="w-full shrink-0" icon={<RotateCcw className="size-4" strokeWidth={2.4} />} onClick={onPlayAgain}>
        Play again
      </Button>
      <Button className="w-full shrink-0" variant="ghost" icon={<Share2 className="size-4" strokeWidth={2.4} />} onClick={onShare}>
        Share score
      </Button>
    </div>
  )

  return (
    <motion.div
      className={cn('absolute inset-0 z-10 flex overflow-y-auto p-2 sm:p-5', !(armed && present) && 'pointer-events-none')}
      data-lenis-prevent
      {...fade}
    >
      <span aria-hidden className="absolute inset-0 bg-ink-950/60" />
      {/* m-auto centres the card but still lets a too-tall card scroll from its top edge */}
      <motion.div
        className={cn('relative m-auto w-full', roomy ? 'max-w-[42rem]' : 'max-w-md')}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22, delay: 0.05 } }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      >
        <Frame className="px-5 py-4 sm:px-7 sm:py-6">
          <span aria-hidden className="absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(10,124,255,0.35),transparent)]" />
          {roomy ? (
            <div className="relative grid grid-cols-[1.08fr_1fr] gap-x-7">
              <div>
                {header}
                {summary}
              </div>
              <div className="flex flex-col justify-end gap-4">
                <div>
                  <p className={cn(label, 'mb-2.5 text-haze')}>Local top 5</p>
                  <Leaderboard board={board} latest={latest} dense />
                </div>
                {actions}
              </div>
            </div>
          ) : (
            <>
              {header}
              {summary}
              {actions}
            </>
          )}
        </Frame>
      </motion.div>
    </motion.div>
  )
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className={cn(label, 'text-[0.58rem] text-haze')}>{term}</dt>
      <dd className="mt-1 font-display text-sm font-bold text-snow tabular-nums sm:text-base">{value}</dd>
    </div>
  )
}
