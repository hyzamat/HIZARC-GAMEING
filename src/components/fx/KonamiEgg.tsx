import { memo, useCallback, useEffect, useInsertionEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Power, Zap } from 'lucide-react'
import { EASE_OUT } from '@/components/ui/Reveal'
import { celebrate } from '@/lib/celebrate'
import { cn } from '@/lib/cn'
import { playSfx } from '@/lib/sfx'
import { ensureFxStyles } from './styles'

const SEQUENCE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
const GLYPHS = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A']
const LABEL = 'CHEAT CODE ACTIVATED · +30 LIVES'

const HYPER_MS = 10_000
/** Mobile trigger: this many taps on a [data-konami-tap] element… */
const TAPS = 7
/** …within this window (ms). */
const TAP_WINDOW = 2500
/** Show the progress HUD once ↑ ↑ ↓ ↓ is in (or after this many taps). */
const KEY_HINT_FROM = 4
const TAP_HINT_FROM = 3
const HINT_IDLE = 1500

type Hint = { kind: 'keys' | 'taps'; step: number } | null

/* ------------------------------------------------------------------ */
/*  Imperative trigger                                                 */
/* ------------------------------------------------------------------ */

let activate: (() => void) | null = null

/** Fire the easter egg from code (e.g. a hidden button). Works even if <KonamiEgg /> isn't mounted (no hyper mode then). */
export function triggerKonami() {
  if (activate) {
    activate()
    return
  }
  celebrate({ intensity: 'big', label: LABEL })
  playSfx('unlock')
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isTyping(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return target.closest('input, textarea, select') !== null
}

/** Normalised key name; letters fall back to the physical key so non-Latin layouts work. */
function keyName(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if (k.startsWith('arrow') || k === 'a' || k === 'b') return k
  if (e.code === 'KeyA') return 'a'
  if (e.code === 'KeyB') return 'b'
  return k
}

/** Length of the longest suffix of `buffer` that is a prefix of SEQUENCE. */
function matchLength(buffer: string[]) {
  for (let len = Math.min(buffer.length, SEQUENCE.length); len > 0; len--) {
    const start = buffer.length - len
    let ok = true
    for (let i = 0; i < len; i++) {
      if (buffer[start + i] !== SEQUENCE[i]) {
        ok = false
        break
      }
    }
    if (ok) return len
  }
  return 0
}

let greeted = false

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * The Konami code easter egg — mount ONCE (e.g. in App).
 * ↑ ↑ ↓ ↓ ← → ← → B A (ignored while typing in a field), 7 rapid taps on any
 * `[data-konami-tap]` element, or `triggerKonami()` → big logo-confetti
 * celebration, the 'unlock' sound, and 10s of "hyper mode": `html.hz-hyper`
 * plus a non-blocking full-screen frame (flowing brand-gradient border glow,
 * scanlines, HUD countdown with a Disable button; Esc also ends it).
 */
export function KonamiEgg() {
  const reduce = useReducedMotion()
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(HYPER_MS)
  const [hint, setHint] = useState<Hint>(null)
  const [announcement, setAnnouncement] = useState('')

  const hudRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useInsertionEffect(() => ensureFxStyles(), [])

  const announce = useCallback((text: string) => {
    // Clear first so a repeated message is read again.
    setAnnouncement('')
    clearTimeout(announceTimer.current)
    announceTimer.current = setTimeout(() => setAnnouncement(text), 60)
  }, [])

  const showHint = useCallback((next: Hint) => {
    clearTimeout(hintTimer.current)
    setHint(next)
    if (next) hintTimer.current = setTimeout(() => setHint(null), HINT_IDLE)
  }, [])

  const fire = useCallback(() => {
    if (document.activeElement instanceof HTMLElement && !hudRef.current?.contains(document.activeElement)) {
      restoreFocusRef.current = document.activeElement
    }
    showHint(null)
    celebrate({ intensity: 'big', label: LABEL, announce: false })
    playSfx('unlock')
    setRemaining(HYPER_MS)
    setEndsAt(Date.now() + HYPER_MS)
    announce('Cheat code activated. Hyper mode on for 10 seconds.')
  }, [announce, showHint])

  const stop = useCallback(() => {
    // Hand focus back before the HUD (and its button) unmounts.
    if (hudRef.current?.contains(document.activeElement)) {
      const prev = restoreFocusRef.current
      if (prev?.isConnected) prev.focus({ preventScroll: true })
      else (document.activeElement as HTMLElement | null)?.blur()
    }
    restoreFocusRef.current = null
    setEndsAt(null)
    playSfx('whoosh')
    announce('Hyper mode off.')
  }, [announce])

  // Imperative trigger registration.
  useEffect(() => {
    activate = fire
    return () => {
      if (activate === fire) activate = null
    }
  }, [fire])

  // A wink for the curious who open devtools.
  useEffect(() => {
    if (greeted) return
    greeted = true
    console.info(
      '%c HIZARC GAMES %c Psst, player one: ↑ ↑ ↓ ↓ ← → ← → B A',
      'background:#0a7cff;color:#fff;font-weight:700;padding:3px 6px;border-radius:2px',
      'color:#2ee6ff;padding:3px 6px',
    )
  }, [])

  // Keyboard sequence + mobile tap streak.
  useEffect(() => {
    let buffer: string[] = []
    let taps: number[] = []

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.repeat) return
      if (e.key === 'Shift' || e.key === 'CapsLock') return
      if (isTyping(e.target)) return

      buffer.push(keyName(e))
      if (buffer.length > SEQUENCE.length) buffer.shift()
      const step = matchLength(buffer)

      if (step === SEQUENCE.length) {
        buffer = []
        fire()
        return
      }
      if (step >= KEY_HINT_FROM) {
        playSfx('hover')
        showHint({ kind: 'keys', step })
      } else {
        setHint((h) => (h?.kind === 'keys' ? null : h))
      }
    }

    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-konami-tap]')) return
      const now = performance.now()
      taps = taps.filter((t) => now - t < TAP_WINDOW)
      // Mid-streak taps shouldn't also re-run the element's own action (e.g. a footer
      // logo that is a "#top" link would thrash the scroll position 7 times).
      if (taps.length > 0) e.preventDefault()
      taps.push(now)
      if (taps.length >= TAPS) {
        taps = []
        fire()
      } else if (taps.length >= TAP_HINT_FROM) {
        showHint({ kind: 'taps', step: taps.length })
      }
    }

    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
    }
  }, [fire, showHint])

  // Hyper mode lifetime: html class + countdown.
  useEffect(() => {
    if (endsAt === null) return
    const root = document.documentElement
    root.classList.add('hz-hyper')
    const tick = () => {
      const left = endsAt - Date.now()
      if (left <= 0) stop()
      else setRemaining(left)
    }
    const id = setInterval(tick, 250)
    // Keyboard escape hatch: Esc ends hyper mode early.
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) stop()
    }
    window.addEventListener('keydown', onEsc)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', onEsc)
      root.classList.remove('hz-hyper')
    }
  }, [endsAt, stop])

  // Timers on unmount.
  useEffect(
    () => () => {
      clearTimeout(announceTimer.current)
      clearTimeout(hintTimer.current)
    },
    [],
  )

  const active = endsAt !== null
  const seconds = Math.max(0, Math.ceil(remaining / 1000))

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            key="hyper"
            className="pointer-events-none fixed inset-0 z-[84] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <HyperFrame reduce={!!reduce} />

            <motion.div
              ref={hudRef}
              role="group"
              aria-label="Hyper mode"
              className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 w-[min(17rem,calc(100vw-2rem))] sm:bottom-6 sm:left-6"
              initial={{ opacity: 0, x: reduce ? 0 : -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -20 }}
              transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
            >
              <div className="chamfer bg-gradient-to-br from-volt/70 via-cyan/50 to-violet/70 p-px [--cut:14px]">
                <div className="relative chamfer bg-ink-950/90 p-4 backdrop-blur-md [--cut:13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-display text-[0.72rem] font-bold tracking-[0.16em] text-snow uppercase">
                      <Zap aria-hidden className="size-3.5 text-volt" fill="currentColor" strokeWidth={1.5} />
                      Hyper mode
                    </span>
                    <span aria-hidden className="font-mono text-[0.82rem] font-medium tracking-[0.12em] text-volt tabular-nums">
                      <span className="hz-blink">●</span> 00:{String(seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-[0.6rem] tracking-[0.22em] text-mist uppercase">+30 lives · cheats on</p>
                  <div aria-hidden className="mt-3 h-[3px] overflow-hidden bg-white/10">
                    <div
                      className="h-full origin-left bg-gradient-to-r from-volt via-cyan to-brand transition-transform duration-300 ease-linear"
                      style={{ transform: `scaleX(${remaining / HYPER_MS})` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={stop}
                    data-sfx="off"
                    className="group pointer-events-auto relative mt-3 inline-flex h-11 w-full items-center justify-center gap-2 font-display text-[0.66rem] font-semibold tracking-[0.14em] text-snow uppercase"
                  >
                    {/* Chamfer lives on a backing layer so it never clips the focus ring */}
                    <span aria-hidden className="absolute inset-0 chamfer-sm bg-white/[0.08] transition-colors group-hover:bg-white/[0.15]" />
                    <Power aria-hidden className="relative size-3.5" strokeWidth={2.4} />
                    <span className="relative">
                      Disable<span className="sr-only"> hyper mode</span>
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{hint && !active && <ProgressHint key="hint" hint={hint} />}</AnimatePresence>

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

const bracket = 'absolute size-7 border-cyan/80 sm:size-9'

/** Decorative full-screen frame: vignette, pulsing inner glow, scanlines, flowing gradient edges. */
const HyperFrame = memo(function HyperFrame({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgba(124,92,255,0.14)_82%,rgba(10,124,255,0.26)_100%)]" />
      <div className="hz-hyper-pulse absolute inset-0 shadow-[inset_0_0_70px_rgba(46,230,255,0.26),inset_0_0_200px_rgba(124,92,255,0.2)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.035)_0_1px,transparent_1px_3px)]" />
      {!reduce && <div className="hz-hyper-scan absolute inset-x-0 top-0 h-[26vh] bg-gradient-to-b from-transparent via-cyan/[0.07] to-transparent" />}

      {/* Flowing brand-gradient edges (clockwise) */}
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden shadow-[0_0_16px_2px_rgba(46,230,255,0.55)]">
        <div className="hz-flow-x hz-flow-rev hz-hyper-gradient-x h-full w-[200%]" />
      </div>
      <div className="absolute inset-y-0 right-0 w-[3px] overflow-hidden shadow-[0_0_16px_2px_rgba(124,92,255,0.55)]">
        <div className="hz-flow-y hz-flow-rev hz-hyper-gradient-y h-[200%] w-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden shadow-[0_0_16px_2px_rgba(10,124,255,0.55)]">
        <div className="hz-flow-x hz-hyper-gradient-x h-full w-[200%]" />
      </div>
      <div className="absolute inset-y-0 left-0 w-[3px] overflow-hidden shadow-[0_0_16px_2px_rgba(215,255,58,0.45)]">
        <div className="hz-flow-y hz-hyper-gradient-y h-[200%] w-full" />
      </div>

      {/* HUD corner brackets */}
      <span className={`${bracket} top-3 left-3 border-t-2 border-l-2 sm:top-5 sm:left-5`} />
      <span className={`${bracket} top-3 right-3 border-t-2 border-r-2 sm:top-5 sm:right-5`} />
      <span className={`${bracket} bottom-3 left-3 border-b-2 border-l-2 sm:bottom-5 sm:left-5`} />
      <span className={`${bracket} right-3 bottom-3 border-r-2 border-b-2 sm:right-5 sm:bottom-5`} />
    </div>
  )
})

/** Little "you're on to something" HUD while the code (or tap streak) is being entered. */
function ProgressHint({ hint }: { hint: NonNullable<Hint> }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[84] flex justify-center px-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      <div className="flex items-center gap-1.5 chamfer-sm bg-ink-950/85 px-3 py-2 ring-1 ring-white/10 backdrop-blur-md ring-inset">
        {hint.kind === 'keys'
          ? GLYPHS.map((g, i) => (
              <span
                key={i}
                className={cn(
                  'grid size-6 place-items-center font-mono text-[0.72rem] font-semibold',
                  i < hint.step ? 'hz-key-pop bg-cyan/12 text-cyan' : 'bg-white/[0.04] text-haze',
                )}
              >
                {g}
              </span>
            ))
          : Array.from({ length: TAPS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-3.5 w-2.5 -skew-x-[28deg] transition-colors duration-200',
                  i < hint.step ? 'hz-key-pop bg-volt shadow-[0_0_8px_rgba(215,255,58,0.6)]' : 'bg-white/10',
                )}
              />
            ))}
      </div>
    </motion.div>
  )
}
