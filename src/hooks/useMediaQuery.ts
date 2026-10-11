import { useSyncExternalStore } from 'react'

/** Subscribe to a CSS media query. SSR-safe (returns `false` on the server). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** True on devices with a precise pointer that can hover (mouse / trackpad). */
export function useFinePointer() {
  return useMediaQuery('(hover: hover) and (pointer: fine)')
}

/** True at Tailwind's `md` breakpoint (768px) and up. */
export function useIsDesktop() {
  return useMediaQuery('(min-width: 768px)')
}
