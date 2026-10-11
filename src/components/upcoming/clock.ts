import { useSyncExternalStore } from 'react'

/**
 * One shared wall-clock ticker for every countdown / live clock on the page.
 * A single timeout chain (aligned to whole seconds) runs only while at least
 * one component is subscribed, and stops as soon as the last one unmounts or
 * scrolls out of view. Components read `now` through useSyncExternalStore.
 *
 * `now` is quantised to whole seconds: every subscriber sees the same value in the same tick,
 * a countdown reads 00:00:00 only at the real launch instant, and the snapshot stays stable
 * between ticks (a React requirement for external stores).
 */

const floorSecond = (ms: number) => Math.floor(ms / 1000) * 1000

/**
 * True during the build-time prerender (no window). Live readouts (countdowns, clocks) leave their
 * time-dependent text out of the static HTML then, so crawlers never index a value frozen at build time.
 */
export const isPrerender = typeof window === 'undefined'

let now = floorSecond(Date.now())
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  now = floorSecond(Date.now())
  listeners.forEach((l) => l())
}

function schedule() {
  // Fire just after the next whole second so every digit flips in sync.
  timer = setTimeout(() => {
    timer = undefined
    emit()
    if (listeners.size > 0) schedule()
  }, 1000 - (Date.now() % 1000) + 8)
}

function onVisibility() {
  // Background tabs throttle timers — resync instantly when the tab returns.
  if (!document.hidden) emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1) {
    now = floorSecond(Date.now())
    if (timer === undefined) schedule()
    document.addEventListener('visibilitychange', onVisibility)
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }
}

const idle = () => () => {}
const getNow = () => now

/**
 * Current time in ms (whole seconds), re-rendering once per second while `active`.
 * Pass `active = false` (e.g. when off-screen) to freeze without ticking.
 */
export function useNow(active = true) {
  // Waking from idle: nothing has been refreshing `now`, so take a fresh reading before this render
  // reads it — otherwise the first frame would flash a stale countdown (and then roll every digit).
  if (active && listeners.size === 0) now = floorSecond(Date.now())
  return useSyncExternalStore(active ? subscribe : idle, getNow, getNow)
}
