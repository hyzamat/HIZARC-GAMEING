import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { EASE_IN_OUT, EASE_OUT } from '@/components/ui/Reveal'
import { onCelebrate } from '@/lib/celebrate'
import { createConfetti, type ConfettiEngine } from './confetti'

type Hud = { id: number; title: string; sub?: string; big: boolean }

/** How long the HUD label stays up (ms). */
const LABEL_MS = { small: 1900, big: 2700 }
const SEPARATOR = /\s+·\s+/

/** Module-level so a StrictMode remount can never reuse a key that is still on screen. */
let hudSeq = 0

/**
 * Full-screen celebration layer — mount ONCE (e.g. in App, after <Footer />).
 * Listens to `celebrate()` from '@/lib/celebrate' and plays a canvas burst of
 * Hizarc-logo confetti ('big' adds a shockwave ring) plus an optional centred
 * HUD label. Reduced motion: no confetti, the label simply fades.
 * Never intercepts input (pointer-events-none, z-[85]).
 */
export function Celebration() {
  const reduce = useReducedMotion()
  const reduceRef = useRef(reduce)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ConfettiEngine | null>(null)
  const [hud, setHud] = useState<Hud | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    reduceRef.current = reduce
  }, [reduce])

  useEffect(() => {
    const canvas = canvasRef.current
    engineRef.current = canvas ? createConfetti(canvas) : null
    return () => {
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    let announceTimer: ReturnType<typeof setTimeout> | undefined

    const off = onCelebrate((opts) => {
      const big = opts.intensity === 'big'
      if (!reduceRef.current) engineRef.current?.burst({ x: opts.x, y: opts.y, intensity: big ? 'big' : 'small' })

      const label = opts.label?.trim()
      if (!label) return
      const [title, ...rest] = label.split(SEPARATOR)
      hudSeq += 1
      setHud({ id: hudSeq, title, sub: rest.join(' · ') || undefined, big })
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => setHud(null), big ? LABEL_MS.big : LABEL_MS.small)

      if (opts.announce !== false) {
        // Clear first so an identical message is announced again.
        setMessage('')
        clearTimeout(announceTimer)
        announceTimer = setTimeout(() => setMessage(label.split(SEPARATOR).join('. ')), 60)
      }
    })

    return () => {
      off()
      clearTimeout(hideTimer)
      clearTimeout(announceTimer)
    }
  }, [])

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[85] overflow-hidden">
        <canvas ref={canvasRef} width={0} height={0} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 grid place-items-center px-4 sm:px-8">
          <AnimatePresence>{hud && <HudLabel key={hud.id} hud={hud} reduce={!!reduce} />}</AnimatePresence>
        </div>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </p>
    </>
  )
}

const corner = 'absolute size-4 border-cyan/80'

function HudLabel({ hud, reduce }: { hud: Hud; reduce: boolean }) {
  return (
    <motion.div
      className="relative isolate w-full max-w-[44rem] [grid-area:1/1]"
      // Reduced motion: a plain opacity fade — independent of any outer <MotionConfig>.
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 14 }}
      animate={
        reduce
          ? { opacity: 1, transition: { duration: 0.3 } }
          : { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 22, mass: 0.8 } }
      }
      exit={reduce ? { opacity: 0, transition: { duration: 0.3 } } : { opacity: 0, scale: 1.1, y: -10, transition: { duration: 0.45, ease: EASE_IN_OUT } }}
    >
      {/* Soft glow behind the panel (outside the chamfer clip) */}
      <span className="absolute -inset-x-8 -inset-y-12 -z-10 bg-[radial-gradient(closest-side,rgba(10,124,255,0.4),rgba(124,92,255,0.14)_55%,transparent)]" />

      {/* HUD corner brackets */}
      <span className={`${corner} -top-2.5 -left-2.5 border-t-2 border-l-2`} />
      <span className={`${corner} -top-2.5 -right-2.5 border-t-2 border-r-2`} />
      <span className={`${corner} -bottom-2.5 -left-2.5 border-b-2 border-l-2`} />
      <span className={`${corner} -right-2.5 -bottom-2.5 border-r-2 border-b-2`} />

      {/* Gradient hairline frame → dark chamfered panel */}
      <div className="chamfer bg-gradient-to-r from-violet via-brand-400 to-cyan p-px [--cut:18px]">
        <div className="relative chamfer overflow-hidden bg-ink-950/92 px-5 py-5 text-center [--cut:17px] sm:px-10 sm:py-7">
          <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.035)_0_1px,transparent_1px_4px)]" />
          {/* One-shot light sheen */}
          {!reduce && (
            <motion.span
              className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ skewX: -28 }}
              initial={{ x: '0%' }}
              animate={{ x: '480%' }}
              transition={{ duration: 1.2, delay: 0.18, ease: EASE_OUT }}
            />
          )}

          <p className="relative font-mono text-[0.6rem] tracking-[0.32em] text-cyan uppercase sm:text-[0.68rem]">
            <span className="text-haze">[</span> Achievement unlocked <span className="text-haze">]</span>
          </p>
          <p className="relative mt-2.5 font-display text-[clamp(1.05rem,5.4vw,2.5rem)] leading-[1.08] font-bold tracking-[0.02em] text-balance wrap-break-word text-snow uppercase [text-shadow:0_0_28px_rgba(46,230,255,0.45)]">
            {hud.title}
          </p>
          {hud.sub && (
            <p className="relative mt-3 inline-flex items-center gap-2.5 font-mono text-[0.68rem] tracking-[0.28em] text-volt uppercase sm:text-[0.76rem]">
              <span className="h-2.5 w-4 -skew-x-[28deg] bg-volt shadow-[0_0_10px_rgba(215,255,58,0.7)]" />
              {hud.sub}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
