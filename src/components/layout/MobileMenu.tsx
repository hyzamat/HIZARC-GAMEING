import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Mail } from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EASE_IN_OUT, EASE_OUT } from '@/components/ui/Reveal'
import { socialIcons } from '@/components/ui/icons'
import { nav, site } from '@/config/site'
import { cn } from '@/lib/cn'
import { externalProps, inertIfPlaceholder, navIndex, visibleSocials } from './links'
import { MenuIcon } from './MenuIcon'

/** tan(28°): the slant of the Hizarc mark, reused for the curtain edge. */
const SLANT = Math.tan((28 * Math.PI) / 180)

type MobileMenuProps = {
  open: boolean
  /** DOM id of the dialog — the navbar toggle points at it via aria-controls. */
  id: string
  /** Currently active section id (e.g. "games"), or null in the hero. */
  active: string | null
  onClose: () => void
  /** Called with a hash ("#games") when a destination is chosen. */
  onNavigate: (href: string) => void
}

/**
 * Full-screen menu for phones & tablets (< lg). Portalled to <body> so the
 * navbar's hide/show transform can't trap it. A brand-blue blade drops in on
 * a 28° diagonal with the ink curtain right behind it, then the giant
 * numbered links rise through their masks.
 */
export function MobileMenu(props: MobileMenuProps) {
  const { open } = props

  // The portal lives outside #root, so while the menu is open everything else
  // (page, navbar, easter-egg HUDs) goes inert: no focus escape, no screen-reader
  // detours. Cleared the moment `open` flips — before the exit animation — so the
  // navbar can take focus back right away.
  useEffect(() => {
    if (!open) return
    const root = document.getElementById('root')
    if (!root) return
    root.setAttribute('inert', '')
    return () => root.removeAttribute('inert')
  }, [open])

  if (typeof document === 'undefined') return null
  return createPortal(<AnimatePresence>{open && <MenuPanel key="hz-mobile-menu" {...props} />}</AnimatePresence>, document.body)
}

function MenuPanel({ id, active, onClose, onNavigate }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  // Diagonal edge as a % of the viewport height, so the angle stays 28° on any screen.
  const [slant] = useState(() => ((window.innerWidth * SLANT) / Math.max(1, window.innerHeight)) * 100)
  const s = slant.toFixed(2)
  const closed = `polygon(0% 0%, 100% 0%, 100% 0%, 0% -${s}%)`
  const opened = `polygon(0% 0%, 100% 0%, 100% ${(100 + slant).toFixed(2)}%, 0% 100%)`

  // Move focus into the dialog as it opens.
  useEffect(() => {
    firstLinkRef.current?.focus({ preventScroll: true })
  }, [])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keep Tab / Shift+Tab cycling inside the dialog.
  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const go = (href: string) => (e: MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onNavigate(href)
  }

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
  })

  return (
    // Clip-path also clips hit-testing, so only the visible curtain ever catches taps.
    <div className="pointer-events-none fixed inset-0 z-[60] lg:hidden">
      {/* Leading blade: lands first, then the curtain covers it; on close it trails behind */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(110deg,#0062d6_0%,#0a7cff_42%,#2ee6ff_100%)]"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.7, ease: EASE_IN_OUT } }}
        exit={{ clipPath: closed, transition: { duration: 0.6, ease: EASE_IN_OUT, delay: 0.14 } }}
      />

      <motion.div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        onKeyDown={trapFocus}
        className="pointer-events-auto absolute inset-0 overflow-hidden bg-ink-950"
        initial={{ clipPath: closed }}
        animate={{ clipPath: opened, transition: { duration: 0.75, ease: EASE_IN_OUT, delay: 0.08 } }}
        exit={{ clipPath: closed, transition: { duration: 0.6, ease: EASE_IN_OUT, delay: 0.05 } }}
      >
        {/* Atmosphere */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_bottom,#000_0%,transparent_80%)]" />
          <div className="absolute -top-48 -right-40 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(10,124,255,0.28)_0%,transparent_65%)]" />
          <div className="absolute -bottom-56 -left-44 size-[600px] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.2)_0%,transparent_65%)]" />
          <motion.div
            className="absolute -right-[16%] -bottom-[6%] w-[78%] max-w-[560px] text-white/[0.03]"
            initial={{ opacity: 0, x: 60, y: 40 }}
            animate={{ opacity: 1, x: 0, y: 0, transition: { duration: 1.2, ease: EASE_OUT, delay: 0.3 } }}
          >
            <LogoMark variant="mono" title="" />
          </motion.div>
        </div>

        <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain pt-safe" data-lenis-prevent>
          {/* Top bar mirrors the navbar so the logo and toggle never jump */}
          <Container className="flex h-16 shrink-0 items-center justify-between gap-4">
            <a href="#top" onClick={go('#top')} aria-label="Hizarc Games, back to top" className="-m-2 flex min-h-11 items-center gap-2.5 p-2">
              <LogoMark className="w-7" title="" />
              <Wordmark className="text-[0.85rem] min-[380px]:text-[0.95rem]" />
            </a>
            <button type="button" onClick={onClose} aria-label="Close menu" className="group relative grid size-11 place-items-center text-snow">
              <span aria-hidden className="absolute inset-0 chamfer-sm bg-white/[0.07] transition-colors group-hover:bg-white/[0.12]" />
              <span className="relative">
                <MenuIcon open from="closed" />
              </span>
            </button>
          </Container>

          <Container className="flex flex-1 flex-col justify-between gap-10 pt-6 pb-safe sm:pt-10">
            <nav aria-label="Mobile">
              <motion.p
                className="flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.25em] text-haze uppercase"
                {...rise(0.22)}
              >
                <span className="text-brand-400">[ Menu ]</span>
                <span aria-hidden className="h-px w-10 bg-line-strong" />
                Choose your level
              </motion.p>

              <ul className="mt-5 border-t border-line">
                {nav.map((item, i) => {
                  const isActive = active === item.href.slice(1)
                  return (
                    <li key={item.href} className="relative border-b border-line">
                      <motion.span
                        aria-hidden
                        className="absolute -bottom-px left-0 h-px w-full origin-left bg-gradient-to-r from-brand via-cyan to-transparent"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isActive ? 1 : 0, transition: { duration: 0.9, ease: EASE_OUT, delay: 0.4 + i * 0.06 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      />
                      <a
                        ref={i === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={go(item.href)}
                        aria-current={isActive ? 'true' : undefined}
                        className="group flex min-h-16 items-center gap-4 py-3 sm:gap-6 sm:py-5"
                      >
                        <motion.span
                          aria-hidden
                          className={cn('w-7 shrink-0 font-mono text-[0.7rem] tracking-[0.2em] tabular-nums', isActive ? 'text-cyan' : 'text-haze')}
                          {...rise(0.3 + i * 0.06)}
                        >
                          {navIndex(i)}
                        </motion.span>
                        <span className="block min-w-0 overflow-hidden py-1">
                          <motion.span
                            className={cn(
                              'block font-display text-[clamp(1.75rem,8.8vw,4rem)] leading-[1.02] font-bold tracking-[-0.01em] uppercase transition-colors duration-300',
                              isActive ? 'text-gradient' : 'text-snow group-active:text-brand-300',
                            )}
                            initial={{ y: '115%' }}
                            animate={{ y: '0%', transition: { duration: 0.85, ease: EASE_OUT, delay: 0.3 + i * 0.07 } }}
                            exit={{ y: '-115%', transition: { duration: 0.35, ease: EASE_IN_OUT, delay: i * 0.025 } }}
                          >
                            {item.label}
                          </motion.span>
                        </span>
                        <motion.span aria-hidden className="ml-auto shrink-0" {...rise(0.42 + i * 0.07)}>
                          <ArrowUpRight
                            className={cn(
                              'size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:size-6',
                              isActive ? 'text-cyan' : 'text-haze',
                            )}
                            strokeWidth={2}
                          />
                        </motion.span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="space-y-6">
              <motion.div {...rise(0.55)}>
                <Button href="#contact" onClick={go('#contact')} size="lg" className="w-full sm:w-auto" magnetic={false}>
                  Reach out
                </Button>
              </motion.div>

              <motion.a
                href={`mailto:${site.email}`}
                className="inline-flex min-h-11 items-center gap-2.5 font-mono text-[0.78rem] tracking-[0.08em] break-all text-mist transition-colors hover:text-snow"
                {...rise(0.62)}
              >
                <Mail aria-hidden className="size-4 shrink-0 text-brand-400" strokeWidth={2} />
                {site.email}
              </motion.a>

              {visibleSocials.length > 0 && (
                <motion.ul className="flex flex-wrap gap-2" aria-label="Social media" {...rise(0.68)}>
                  {visibleSocials.map((s) => {
                    const Icon = socialIcons[s.key]
                    return (
                      <li key={s.key}>
                        <a
                          href={s.href}
                          aria-label={s.label}
                          {...externalProps(s.href)}
                          {...inertIfPlaceholder(s.href)}
                          className="group relative grid size-11 place-items-center text-mist transition-colors hover:text-snow"
                        >
                          <span aria-hidden className="absolute inset-0 chamfer-sm bg-white/[0.05] transition-colors group-hover:bg-white/[0.1]" />
                          <Icon className="relative size-[18px]" />
                        </a>
                      </li>
                    )
                  })}
                </motion.ul>
              )}

              <motion.p
                className="flex items-center gap-2 border-t border-line pt-5 font-mono text-[0.65rem] tracking-[0.22em] text-haze uppercase max-[360px]:tracking-[0.12em]"
                {...rise(0.74)}
              >
                <span className="size-1.5 animate-pulse-soft bg-volt" aria-hidden />
                {site.locationShort.replace(',', ' ·')} — A {site.parentName} company
              </motion.p>
            </div>
          </Container>
        </div>
      </motion.div>
    </div>
  )
}
