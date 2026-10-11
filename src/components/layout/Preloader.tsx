import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type TargetAndTransition } from 'framer-motion'
import { LogoMark } from '@/components/brand/Logo'
import { EASE_OUT } from '@/components/ui/Reveal'
import { topicFromHash } from '@/lib/contact'
import { markIntroDone } from '@/lib/intro'
import { lockScroll, scrollToTarget, unlockScroll, getLenis } from '@/lib/scroll'

const SEEN_KEY = 'hz-intro-seen'
/** tan(28°) — the slant of the cuts in the Hizarc "H". */
const SLANT = Math.tan((28 * Math.PI) / 180)
/** Hard ceiling: the intro is always gone by this point, whatever happens. */
const SAFETY_MS = 3500
const WIPE_EASE = [0.76, 0, 0.24, 1] as const

/**
 * Timeline for a first visit vs. a repeat visit in the same browser session.
 * full ≈ 1.25s of loading + 0.8s wipe (≈ 2.0s); fast ≈ 0.2s + 0.39s (< 0.6s).
 */
const TIMING = {
  full: { fill: 0.95, finish: 0.18, hold: 100, fontsCap: 1050, wipe: 0.75, blade: 0.06 },
  fast: { fill: 0.12, finish: 0.04, hold: 0, fontsCap: 150, wipe: 0.36, blade: 0.03 },
} as const

const STATUS = ['Booting engine', 'Compiling shaders', 'Spawning worlds', 'Ready, player one'] as const

const CORNERS = [
  { label: 'Hizarc Games', place: 'top-0 left-0', bracket: 'top-0 left-0 border-t border-l', text: 'pl-6 pt-[3px]' },
  { label: 'Loading worlds', place: 'top-0 right-0', bracket: 'top-0 right-0 border-t border-r', text: 'pr-6 pt-[3px]', live: true },
  { label: 'Calicut · India', place: 'bottom-0 left-0', bracket: 'bottom-0 left-0 border-b border-l', text: 'pl-6 pb-[3px]' },
  { label: 'v1.0', place: 'bottom-0 right-0', bracket: 'bottom-0 right-0 border-b border-r', text: 'pr-6 pb-[3px]' },
] as const

function readSeen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function writeSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable (private mode / blocked) — the intro simply replays */
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function fontsReady(capMs: number) {
  const ready = typeof document !== 'undefined' && document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve()
  return Promise.race([ready, wait(capMs)])
}

/**
 * Where a deep link should land: the element itself when it exists, the
 * contact section for topic links (#contact-careers), otherwise nowhere.
 */
function resolveHashTarget(hash: string) {
  if (hash.length < 2) return null
  let id = hash.slice(1)
  try {
    id = decodeURIComponent(id)
  } catch {
    /* malformed escape — use the raw id */
  }
  if (document.getElementById(id)) return `#${id}`
  if (topicFromHash(hash) && document.getElementById('contact')) return '#contact'
  return null
}

/**
 * Full-screen intro. The Hizarc mark assembles piece by piece over a HUD
 * frame while a counter runs 000 → 100, then the whole curtain leaves upward
 * on a 28° diagonal (the logo's own slant) with a brand-blue blade trailing
 * the leading edge. markIntroDone() fires the instant the wipe begins so the
 * hero choreography plays as it is uncovered.
 */
export function Preloader() {
  const reduce = useReducedMotion()

  // Reduced motion: no intro at all — release the page before first paint.
  // Native anchors already handle real ids; topic links (#contact-press-media)
  // have no element of their own, so jump to the contact section for them.
  useLayoutEffect(() => {
    if (!reduce) return
    markIntroDone()
    const hash = window.location.hash
    const target = resolveHashTarget(hash)
    if (!target || target === hash) return
    const raf = requestAnimationFrame(() => scrollToTarget(target, { immediate: true }))
    return () => cancelAnimationFrame(raf)
  }, [reduce])

  if (reduce) return null
  return <PreloaderCurtain />
}

function PreloaderCurtain() {
  // Read once, before any effect writes the flag (safe under StrictMode).
  const [fast] = useState(readSeen)
  const timing = fast ? TIMING.fast : TIMING.full

  const [visible, setVisible] = useState(true)
  const [gone, setGone] = useState(false)
  const [ready, setReady] = useState(false)
  const [rise, setRise] = useState(() => (typeof window === 'undefined' ? 200 : Math.round(window.innerWidth * SLANT)))

  const progress = useMotionValue(0)
  const counter = useTransform(progress, (v) => String(Math.round(v)).padStart(3, '0'))
  const barScale = useTransform(progress, [0, 100], [0, 1])
  const sparkLeft = useTransform(progress, (v) => `${v}%`)
  const status = useTransform(progress, (v): string => STATUS[v >= 100 ? 3 : v >= 62 ? 2 : v >= 28 ? 1 : 0])

  const lockedRef = useRef(false)
  const doneRef = useRef(false)

  // Keep the diagonal true to 28° whatever the viewport.
  useEffect(() => {
    const onResize = () => setRise(Math.round(window.innerWidth * SLANT))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    doneRef.current = false

    try {
      window.history.scrollRestoration = 'manual'
    } catch {
      /* not supported */
    }
    window.scrollTo(0, 0)

    if (!lockedRef.current) {
      lockedRef.current = true
      lockScroll()
    }
    // Lenis is created by the parent provider *after* this effect runs —
    // stop it on the next frame so wheel input can't scroll behind the curtain.
    const raf = requestAnimationFrame(() => {
      if (lockedRef.current) getLenis()?.stop()
      window.scrollTo(0, 0)
    })

    const release = () => {
      if (!lockedRef.current) return
      lockedRef.current = false
      unlockScroll()
    }

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      writeSeen()
      release()
      markIntroDone()
      setVisible(false)
      // Belt and braces: drop the overlay even if the exit animation is interrupted.
      window.setTimeout(() => setGone(true), (timing.wipe + timing.blade) * 1000 + 1200)
      // Honour deep links (hizarc.com/#contact, /#contact-careers) once the page is released.
      const target = resolveHashTarget(window.location.hash)
      if (target) requestAnimationFrame(() => scrollToTarget(target))
    }

    const safety = window.setTimeout(finish, SAFETY_MS)
    const controls: { stop: () => void }[] = []

    const run = async () => {
      const fonts = fontsReady(timing.fontsCap)
      const fill = animate(progress, fast ? 100 : 86, { duration: timing.fill, ease: [0.62, 0.04, 0.3, 1] })
      controls.push(fill)
      await Promise.all([fill, fonts])
      if (cancelled) return
      const last = animate(progress, 100, { duration: timing.finish, ease: EASE_OUT })
      controls.push(last)
      await last
      if (cancelled) return
      setReady(true)
      if (timing.hold) await wait(timing.hold)
      if (!cancelled) finish()
    }
    run()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(safety)
      controls.forEach((c) => c.stop())
      release()
    }
  }, [fast, progress, timing])

  const panelExit: TargetAndTransition = { y: '-100%', transition: { duration: timing.wipe, ease: WIPE_EASE } }
  const bladeExit: TargetAndTransition = { y: '-100%', transition: { duration: timing.wipe, ease: WIPE_EASE, delay: timing.blade } }
  const contentExit: TargetAndTransition = { y: -70, opacity: 0, transition: { duration: timing.wipe * 0.55, ease: [0.7, 0, 0.84, 0] } }

  // Taller than the viewport by the slant's rise, so the slanted bottom edge
  // starts fully below the fold and the panel clears the top at y = -100%.
  const curtainStyle = {
    height: `calc(100% + ${rise}px)`,
    clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - ${rise}px))`,
  }

  if (gone) return null

  return (
    <AnimatePresence onExitComplete={() => setGone(true)}>
      {visible && (
        <motion.div key="hz-preloader" exit={{ opacity: 1 }} className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" role="status" aria-live="polite">
          <span className="sr-only">Loading Hizarc Games</span>

          {/* Trailing blade: revealed as a slanted band behind the leading edge */}
          <motion.div
            aria-hidden
            exit={bladeExit}
            className="absolute inset-x-0 top-0 bg-[linear-gradient(100deg,#0062d6_0%,#0a7cff_45%,#2ee6ff_100%)]"
            style={curtainStyle}
          />

          {/* Main curtain */}
          <motion.div exit={panelExit} className="pointer-events-auto absolute inset-x-0 top-0 bg-ink-950" style={curtainStyle}>
            <motion.div exit={contentExit} aria-hidden className="absolute inset-x-0 top-0" style={{ height: `calc(100% - ${rise}px)` }}>
              {/* Atmosphere */}
              <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_65%)]" />
              <div className="absolute top-1/2 left-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(10,124,255,0.22)_0%,rgba(46,230,255,0.06)_38%,transparent_66%)]" />

              {/* 28° slash lines drawing through the centre */}
              <div className="absolute top-1/2 left-1/2 w-[140vmax] -translate-x-1/2 -translate-y-1/2 rotate-[28deg]">
                <motion.div
                  className="h-px origin-left bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: fast ? 0.2 : 1.1, ease: EASE_OUT, delay: fast ? 0 : 0.15 }}
                />
                <motion.div
                  className="mt-24 h-px origin-right bg-gradient-to-r from-transparent via-brand/30 to-transparent sm:mt-40"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: fast ? 0.2 : 1.1, ease: EASE_OUT, delay: fast ? 0 : 0.3 }}
                />
              </div>

              {/* HUD frame */}
              <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] bottom-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-8 sm:top-8 sm:bottom-8 lg:inset-x-10 lg:top-10 lg:bottom-10">
                {CORNERS.map((c, i) => (
                  <motion.div
                    key={c.label}
                    className={`absolute ${c.place}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: fast ? 0.1 : 0.5, delay: fast ? 0 : 0.1 + i * 0.08 }}
                  >
                    <span className={`absolute size-3.5 border-white/30 ${c.bracket}`} />
                    <span
                      className={`flex items-center gap-2 font-mono text-[0.6rem] tracking-[0.25em] whitespace-nowrap text-haze uppercase sm:text-[0.68rem] ${c.text}`}
                    >
                      {'live' in c && <span className="size-1.5 animate-pulse-soft bg-volt" />}
                      {c.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Centre stage */}
              <div className="relative flex h-full flex-col items-center justify-center px-6">
                <div className="relative">
                  <motion.span
                    className="absolute inset-[-28%] rounded-full border border-cyan/50"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={ready ? { opacity: [0, 0.9, 0], scale: [0.7, 1.15, 1.45] } : { opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.7, ease: EASE_OUT }}
                  />
                  <motion.div
                    initial={false}
                    animate={ready ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                  >
                    <LogoMark variant="gradient" animate={!fast} delay={0.1} title="" className="w-[118px] sm:w-[136px] lg:w-[150px]" />
                  </motion.div>
                  {/* Scanner sweeping the mark while it "compiles" */}
                  {!fast && (
                    <motion.span
                      className="pointer-events-none absolute -inset-x-[18%] top-0 bottom-0"
                      initial={{ y: '-6%', opacity: 0 }}
                      animate={ready ? { opacity: 0 } : { y: ['-6%', '104%'], opacity: [0, 1, 1, 0] }}
                      transition={ready ? { duration: 0.2 } : { duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.1, delay: 0.35 }}
                    >
                      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent shadow-[0_0_10px_rgba(46,230,255,0.9)]" />
                    </motion.span>
                  )}
                </div>

                <motion.div
                  className="mt-12 w-[min(240px,70vw)] sm:mt-14"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: fast ? 0.1 : 0.6, delay: fast ? 0 : 0.35, ease: EASE_OUT }}
                >
                  <div className="flex items-end justify-between font-mono text-[0.62rem] tracking-[0.25em] text-haze uppercase sm:text-[0.68rem]">
                    <span>Sync</span>
                    {/* The readout flashes electric cyan the instant the load completes */}
                    <motion.span
                      className="text-[0.85rem] tracking-[0.12em] text-snow tabular-nums sm:text-[0.95rem]"
                      initial={false}
                      animate={ready ? { color: '#2ee6ff', textShadow: '0 0 14px rgba(46,230,255,0.85)' } : { color: '#f4f7ff', textShadow: '0 0 0 rgba(46,230,255,0)' }}
                      transition={{ duration: 0.25 }}
                    >
                      <motion.span>{counter}</motion.span>
                      <span className="text-haze">%</span>
                    </motion.span>
                  </div>
                  <div className="relative mt-3 h-[2px] w-full bg-white/10">
                    <motion.div
                      className="absolute inset-0 origin-left bg-gradient-to-r from-brand to-cyan shadow-[0_0_12px_rgba(46,230,255,0.8)]"
                      style={{ scaleX: barScale }}
                    />
                    {/* Slanted spark riding the leading edge of the bar */}
                    <motion.span
                      aria-hidden
                      className="absolute top-1/2 -ml-[2px] h-[9px] w-[3px] -translate-y-1/2 -skew-x-[28deg] bg-white shadow-[0_0_10px_2px_rgba(46,230,255,0.9)]"
                      style={{ left: sparkLeft }}
                    />
                  </div>
                  <motion.p className="mt-3 text-center font-mono text-[0.6rem] tracking-[0.25em] whitespace-nowrap text-haze/80 uppercase">
                    {status}
                  </motion.p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
