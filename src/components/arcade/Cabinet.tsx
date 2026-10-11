import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Pause } from 'lucide-react'
import { celebrate } from '@/lib/celebrate'
import { playSfx } from '@/lib/sfx'
import { cn } from '@/lib/cn'
import type { Phase, RunResult } from './engine'
import { DashGame } from './game'
import { Keycap } from './Keycap'
import { GameOverOverlay, PauseOverlay, TitleOverlay, type OverState } from './Overlays'
import { sanitizeInitials, type ArcadeScores } from './scores'
import { scoreText, shareScore } from './share'

const GAME_LABEL =
  'HIZARC DASH, an endless side-scrolling runner. A glowing Hizarc logo dashes across a neon Calicut skyline, jumping over shards and gaps and collecting volt orbs.'

const bracket = 'pointer-events-none absolute z-[6] size-4 border-cyan/70'
const mono = 'font-mono text-[0.62rem] tracking-[0.22em] uppercase sm:text-[0.68rem]'

/**
 * The arcade cabinet: chamfered glowing frame, top bar, the canvas stage with its
 * CRT overlay + DOM overlays (title / pause / game over) and a controls strip.
 * Owns the DashGame instance; all scoring flows through the `scores` hook.
 */
export function Cabinet({ scores }: { scores: ArcadeScores }) {
  const reduced = useReducedMotion() ?? false
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fpsRef = useRef<HTMLSpanElement>(null)
  const gameRef = useRef<DashGame | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const announceFlip = useRef(false)

  const [phase, setPhase] = useState<Phase>('title')
  const [over, setOver] = useState<OverState | null>(null)
  const [initials, setInitials] = useState(scores.lastName)
  const [roomy, setRoomy] = useState(false)
  const [short, setShort] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [unsupported, setUnsupported] = useState(false)

  // Always-fresh snapshot for callbacks that outlive a render (game events, timers).
  const live = useRef({ scores, over, initials, reduced })
  useEffect(() => {
    live.current = { scores, over, initials, reduced }
  })

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  /** Update the game-over state AND its always-fresh mirror, so a second caller in the same tick sees it. */
  const commitOver = useCallback((next: OverState | null) => {
    live.current.over = next
    setOver(next)
  }, [])

  /** Store the finished run on the local board (once) under the initials typed so far. */
  const saveInitials = useCallback(() => {
    const { scores: s, over: o, initials: name } = live.current
    if (!o || o.rank === null || o.saved) return
    s.saveEntry(name || s.lastName, o.score)
    commitOver({ ...o, saved: true })
  }, [commitOver])

  /* ---- game lifecycle ------------------------------------------------ */

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    const scope = rootRef.current
    if (!canvas || !stage || !scope) return

    const handleOver = (result: RunResult) => {
      const { scores: s } = live.current
      const isNewBest = result.score > s.best && result.score > 0
      const rank = s.rankFor(result.score)
      s.recordRun(result.score)
      gameRef.current?.setBest(Math.max(s.best, result.score))
      commitOver({ ...result, isNewBest, rank, saved: false })
      // The trailing zero-width space flips each time so an identical result is still re-announced.
      announceFlip.current = !announceFlip.current
      setAnnounce(
        `Game over. You scored ${result.score}. ${isNewBest ? 'New best score!' : `Your best is ${Math.max(s.best, result.score)}.`}${rank !== null ? ` Rank ${rank} on your local top five.` : ''}${announceFlip.current ? '\u200b' : ''}`,
      )
      if (isNewBest) {
        gameRef.current?.engine.celebrate()
        gameRef.current?.kick()
        playSfx('success')
        const r = stage.getBoundingClientRect()
        celebrate({ x: r.left + r.width / 2, y: r.top + r.height * 0.4, intensity: 'small', announce: false })
      }
    }

    const game = DashGame.create({
      canvas,
      stage,
      scope,
      onPhase: (next) => {
        setPhase(next)
        if (next === 'playing') {
          // However the visitor left the game-over card (button, Space, tap), an unsaved top-5 run is kept.
          saveInitials()
          commitOver(null)
        }
      },
      onGameOver: handleOver,
      onFps: (fps) => {
        if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`
      },
    })
    if (!game) {
      setUnsupported(true)
      return
    }
    gameRef.current = game
    game.setBest(live.current.scores.best)
    game.setReduced(live.current.reduced)

    // How much room does the game-over card have inside the stage?
    const ro = new ResizeObserver(() => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      setRoomy(w >= 540 && h >= 300)
      setShort(h < 380)
    })
    ro.observe(stage)

    return () => {
      ro.disconnect()
      game.destroy()
      gameRef.current = null
      window.clearTimeout(toastTimer.current)
    }
  }, [commitOver, saveInitials])

  useEffect(() => {
    gameRef.current?.setBest(scores.best)
  }, [scores.best])

  useEffect(() => {
    gameRef.current?.setReduced(reduced)
  }, [reduced])

  /* ---- actions ------------------------------------------------------- */

  // Starting a run also stores the previous one (see onPhase above), so this is all "Play" has to do.
  const play = useCallback(() => {
    gameRef.current?.start()
  }, [])

  const share = useCallback(async () => {
    const o = live.current.over
    if (!o) return
    const result = await shareScore(o.score)
    if (result === 'copied') showToast('Score copied to clipboard')
    else if (result === 'failed') showToast(`Copy blocked. Your line: ${scoreText(o.score)}`)
  }, [showToast])

  const playing = phase === 'playing'

  return (
    <div ref={rootRef} className="relative">
      {/* Glow behind the cabinet */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-[7%] -inset-y-[11%] -z-10 animate-pulse-soft bg-[radial-gradient(closest-side,rgba(10,124,255,0.36)_72%,rgba(124,92,255,0.14)_88%,transparent)]"
      />

      {/* Gradient hairline frame */}
      <div className="chamfer-lg bg-gradient-to-br from-brand via-cyan/70 to-violet p-px shadow-[0_30px_90px_-30px_rgba(10,124,255,0.7)]">
        <div className="chamfer bg-ink-900 [--cut:27px]">
          {/* Top bar */}
          <div className={cn(mono, 'flex h-11 items-center justify-between gap-3 border-b border-line px-4 text-haze sm:px-6')}>
            <span className="flex items-center gap-2.5 text-snow">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-volt shadow-[0_0_8px_rgba(215,255,58,0.8)]" />
              Player 1
            </span>
            <span className="hidden min-[400px]:inline">
              Insert coin: <span className="animate-pulse-soft text-volt">free</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="hidden items-center gap-2 sm:flex">
                <span className="size-1.5 animate-pulse-soft rounded-full bg-cyan" />
                <span ref={fpsRef} className="tabular-nums">-- FPS</span>
              </span>
              {/* inert while there is nothing to pause: out of the tab order, the click path and the a11y tree */}
              <button
                type="button"
                aria-label="Pause game"
                inert={!playing}
                onClick={() => gameRef.current?.pause()}
                className={cn(
                  '-mr-2.5 grid size-11 place-items-center text-mist transition-[opacity,color] hover:text-snow',
                  playing ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <Pause className="size-4" strokeWidth={2.4} />
              </button>
            </span>
          </div>

          {/* Stage */}
          <div
            ref={stageRef}
            tabIndex={0}
            role="group"
            aria-label="HIZARC DASH game area. Press Space, Up Arrow or W to jump, Escape to pause."
            className="relative aspect-[4/5] max-h-[max(300px,62svh)] w-full touch-manipulation overflow-hidden bg-ink-950 select-none [-webkit-touch-callout:none] focus-visible:outline-offset-[-4px] sm:aspect-video"
          >
            {unsupported ? (
              <div className="grid size-full place-items-center p-6 text-center text-sm text-mist">
                This browser can&apos;t run the mini-game. Our real games are just above.
              </div>
            ) : (
              <canvas ref={canvasRef} role="img" aria-label={GAME_LABEL} className="absolute inset-0 size-full" />
            )}

            {/* CRT: scanlines + vignette */}
            <span aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0.14)_0_1px,transparent_1px_3px)] opacity-60" />
            <span aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(ellipse_at_center,transparent_64%,rgba(3,5,12,0.46)_100%)]" />
            {/* HUD corner brackets */}
            <span aria-hidden className={cn(bracket, 'top-2.5 left-2.5 border-t-2 border-l-2')} />
            <span aria-hidden className={cn(bracket, 'top-2.5 right-2.5 border-t-2 border-r-2')} />
            <span aria-hidden className={cn(bracket, 'bottom-2.5 left-2.5 border-b-2 border-l-2')} />
            <span aria-hidden className={cn(bracket, 'right-2.5 bottom-2.5 border-r-2 border-b-2')} />

            <AnimatePresence>
              {!unsupported && phase === 'title' && <TitleOverlay key="title" best={scores.best} reduced={reduced} onPlay={play} />}
              {phase === 'paused' && <PauseOverlay key="paused" onResume={() => gameRef.current?.resume()} />}
              {phase === 'over' && over && (
                <GameOverOverlay
                  key="over"
                  over={over}
                  best={Math.max(scores.best, over.score)}
                  board={scores.board}
                  latest={scores.latest}
                  roomy={roomy}
                  short={short}
                  reduced={reduced}
                  initials={initials}
                  onInitials={(value) => setInitials(sanitizeInitials(value))}
                  onSave={saveInitials}
                  onPlayAgain={play}
                  onShare={share}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {toast && (
                <motion.p
                  key="toast"
                  role="status"
                  className="chamfer-sm absolute bottom-4 left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 bg-snow px-4 py-2.5 text-center font-mono text-[0.68rem] leading-snug font-medium tracking-[0.12em] text-balance text-ink-950 uppercase"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  {toast}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Controls strip — always visible */}
          <p className={cn(mono, 'flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-haze sm:px-6')}>
            <span className="flex items-center gap-2">
              <Keycap>Space</Keycap>
              <span className="hidden sm:inline">/</span>
              <Keycap className="sm:hidden">Tap</Keycap>
              <span className="text-mist">Jump</span>
            </span>
            <span>
              Hold <span className="text-mist">higher</span>
            </span>
            <span>
              Again in air <span className="text-mist">double jump</span>
            </span>
            <span className="hidden items-center gap-2 md:flex">
              <Keycap>Esc</Keycap>
              <span className="text-mist">Pause</span>
            </span>
          </p>
        </div>
      </div>

      {/* Screen-reader announcements (score on game over) */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </p>
    </div>
  )
}
