import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from 'framer-motion'
import { registerLenis, scrollToTarget } from '@/lib/scroll'

/**
 * Buttery smooth wheel scrolling via Lenis (touch devices keep native
 * momentum scrolling). Disabled entirely for prefers-reduced-motion.
 * Also upgrades every in-page <a href="#id"> link to a smooth scroll.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
    })
    registerLenis(lenis)

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      registerLenis(null)
      lenis.destroy()
    }
  }, [reduce])

  // Smooth in-page anchor navigation for any <a href="#section">.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      if (!a) return
      const hash = a.getAttribute('href') ?? ''
      // Bare "#" = placeholder link (e.g. a store URL not set yet) — do nothing, don't jump to top.
      if (hash === '#') {
        e.preventDefault()
        return
      }
      const id = hash.slice(1)
      if (id && id !== 'top' && !document.getElementById(id)) return
      e.preventDefault()
      scrollToTarget(hash)
      if (id && id !== 'top') history.replaceState(null, '', hash)
      else history.replaceState(null, '', window.location.pathname)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return <>{children}</>
}
