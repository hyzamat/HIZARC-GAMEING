import { useEffect, useState } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { games } from '@/data/games'

/** Seconds each game stays on the "now playing" card. */
export const CYCLE_S = 4

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** False while the browser tab is in the background (timers should rest). */
export function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

type CycleOptions = {
  /** Intro finished and the card is on screen. */
  ready: boolean
  /** Hero is in view. */
  active: boolean
  /** Hover / focus / user pause — the timer holds its place. */
  hold: boolean
  /** Stop auto-advancing after this many full passes through the list (default: never). */
  maxLoops?: number
}

/**
 * Shared timer behind the "now playing" card (desktop) and chip (phones).
 * `progress` (0 → 1) is the current slot's fill; when it completes the index
 * advances. Pausing keeps `progress` where it is, so resuming continues the slot.
 * Reduced motion: no autoplay (the visitor can still pick a game manually).
 */
export function useNowPlaying({ ready, active, hold, maxLoops = Infinity }: CycleOptions) {
  const reduce = useReducedMotion() === true
  const pageVisible = usePageVisible()
  const [index, setIndex] = useState(0)
  const [steps, setSteps] = useState(0)
  const progress = useMotionValue(0)

  const total = games.length
  const running = ready && active && pageVisible && !hold && !reduce && total > 1 && steps < maxLoops * total

  // One timer: tween 0 → 1 over the time left in the current slot, then advance.
  useEffect(() => {
    if (!running) return
    const controls = animate(progress, 1, {
      duration: Math.max(0.05, CYCLE_S * (1 - progress.get())),
      ease: 'linear',
      onComplete: () => {
        progress.set(0)
        setSteps((s) => s + 1)
        setIndex((i) => (i + 1) % total)
      },
    })
    return () => controls.stop()
  }, [running, index, progress, total])

  const select = (i: number) => {
    if (i === index) return
    progress.set(0)
    setIndex(i)
  }

  return { reduce, index, total, game: games[index], progress, running, select }
}
