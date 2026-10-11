import { useSyncExternalStore } from 'react'

/**
 * Tiny global flag for the intro/preloader.
 * The Preloader calls markIntroDone() when its exit animation starts;
 * hero (and anything above the fold) waits on useIntroDone() before
 * playing entrance animations, so nothing animates hidden behind the loader.
 */

let done = false
const listeners = new Set<() => void>()

export function markIntroDone() {
  if (done) return
  done = true
  listeners.forEach((l) => l())
}

export function isIntroDone() {
  return done
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useIntroDone() {
  return useSyncExternalStore(
    subscribe,
    () => done,
    () => done,
  )
}
