import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'
import { LayoutGroup, motion, useMotionValueEvent, useScroll, type Variants } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { SoundToggle } from '@/components/fx'
import { Container } from '@/components/ui/Container'
import { EASE_OUT } from '@/components/ui/Reveal'
import { nav, site } from '@/config/site'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { useIntroDone } from '@/lib/intro'
import { lockScroll, scrollToTarget, unlockScroll } from '@/lib/scroll'
import { displayHost, navIndex } from './links'
import { MenuIcon } from './MenuIcon'
import { MobileMenu } from './MobileMenu'

const MENU_ID = 'hz-mobile-menu'
/** Section ids derived from the nav config ('#games' → 'games'), so new items are tracked automatically. */
const SECTION_IDS = nav.map((n) => n.href.slice(1))
/** Below this scroll depth the bar never hides. */
const HIDE_AFTER = 320
/** Pixels of travel in one direction before the bar reacts (kills trackpad jitter). */
const DIRECTION_SLOP = 10
/** After choosing a destination the bar stays put this long, so the scroll-spy visibly lands (ms). */
const PIN_MS = 1800

const bar: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: -16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
}

/**
 * Scroll-spy: the nav section whose box crosses a thin band ~45% down the
 * viewport is "active". Nothing is active over the hero or between sections.
 * Sections that mount late (lazy sections, a future #arcade) are picked up
 * by a light MutationObserver that disconnects once every id is found.
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (ids.length === 0) return
    const inBand = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => inBand.set(e.target.id, e.isIntersecting))
        setActive(ids.filter((id) => inBand.get(id)).pop() ?? null)
      },
      { rootMargin: '-45% 0px -54% 0px', threshold: 0 },
    )

    const observed = new Set<string>()
    let raf = 0
    const scan = () => {
      raf = 0
      ids.forEach((id) => {
        if (observed.has(id)) return
        const el = document.getElementById(id)
        if (!el) return
        observed.add(id)
        io.observe(el)
      })
      if (observed.size === ids.length) mo.disconnect()
    }
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(scan)
    })
    mo.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      io.disconnect()
    }
  }, [ids])

  return active
}

function isKeyboardFocus(el: EventTarget | null) {
  if (!(el instanceof Element)) return false
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * Fixed top bar. Transparent over the hero, frosted glass once scrolled,
 * tucks away on scroll-down and returns on scroll-up. Desktop gets centred
 * links with a spring "pill" that follows hover / the active section; phones
 * and tablets get a morphing hamburger that opens the full-screen menu.
 */
export function Navbar() {
  const introDone = useIntroDone()
  const isLg = useMediaQuery('(min-width: 1024px)')
  const active = useActiveSection(SECTION_IDS)

  const [open, setOpen] = useState(false)
  const menuOpen = open && !isLg
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const lockedRef = useRef(false)
  const travelRef = useRef(0)
  const wasOpenRef = useRef(false)
  const pinnedUntil = useRef(0)

  /* ---------------- scroll behaviour ---------------- */
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    const delta = y - (scrollY.getPrevious() ?? y)
    if (delta !== 0 && Math.sign(delta) !== Math.sign(travelRef.current)) travelRef.current = 0
    travelRef.current += delta

    setScrolled(y > 24)
    if (y < HIDE_AFTER || performance.now() < pinnedUntil.current) setHidden(false)
    else if (travelRef.current > DIRECTION_SLOP) setHidden(true)
    else if (travelRef.current < -DIRECTION_SLOP) setHidden(false)
  })

  const shown = !hidden || menuOpen || focusWithin

  /* ---------------- menu: scroll lock, focus, resize ---------------- */
  const releaseLock = useCallback(() => {
    if (!lockedRef.current) return
    lockedRef.current = false
    unlockScroll()
  }, [])

  useEffect(() => {
    if (menuOpen) {
      if (!lockedRef.current) {
        lockedRef.current = true
        lockScroll()
      }
    } else {
      releaseLock()
    }
  }, [menuOpen, releaseLock])

  useEffect(() => releaseLock, [releaseLock])

  // Growing past lg closes the menu (the desktop bar takes over).
  useEffect(() => {
    if (isLg) setOpen(false)
  }, [isLg])

  // Hand focus back to the toggle whenever the menu closes.
  useEffect(() => {
    if (wasOpenRef.current && !menuOpen) toggleRef.current?.focus({ preventScroll: true })
    wasOpenRef.current = menuOpen
  }, [menuOpen])

  const closeMenu = useCallback(() => setOpen(false), [])

  // Picking a destination keeps the bar on screen while the page travels there.
  const pinBar = useCallback(() => {
    pinnedUntil.current = performance.now() + PIN_MS
    setHidden(false)
  }, [])

  const navigateFromMenu = useCallback(
    (href: string) => {
      // Unlock first — Lenis ignores scrollTo while stopped.
      releaseLock()
      pinBar()
      setOpen(false)
      scrollToTarget(href)
      const clean = window.location.pathname + window.location.search
      window.history.replaceState(null, '', href === '#top' ? clean : href)
    },
    [releaseLock, pinBar],
  )

  /* ---------------- focus-within keeps the bar pinned for keyboard users ---------------- */
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (isKeyboardFocus(e.target)) setFocusWithin(true)
  }
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false)
  }

  const highlight = hovered ?? (active ? `#${active}` : null)

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 isolate pt-safe"
        initial={false}
        animate={{ y: shown ? '0%' : '-110%' }}
        transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {/* Legibility scrim over the hero, swapped for glass once scrolled */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-ink-950/75 to-transparent"
          initial={false}
          animate={{ opacity: scrolled ? 0 : introDone ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 bg-ink-950/70 backdrop-blur-xl backdrop-saturate-150"
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-px origin-center bg-gradient-to-r from-transparent via-white/[0.16] to-transparent"
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0, scaleX: scrolled ? 1 : 0.3 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
        <motion.div
          aria-hidden
          className="absolute bottom-0 left-1/2 -z-10 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-400 to-transparent"
          initial={false}
          animate={{ opacity: scrolled ? 0.9 : 0 }}
          transition={{ duration: 0.6 }}
        />

        <motion.div variants={bar} initial="hidden" animate={introDone ? 'show' : 'hidden'}>
          {/* Three flex zones: the two sides share free space equally, so the
              links sit dead-centre when there's room and can never overlap. */}
          <Container className="flex h-16 items-center gap-4 lg:h-[72px]">
            {/* Brand */}
            <div className="flex flex-1 basis-0 items-center">
              <motion.a
                variants={item}
                href="#top"
                aria-label="Hizarc Games, back to top"
                className="group -m-2 flex min-h-11 shrink-0 items-center gap-2.5 p-2"
              >
                <LogoMark
                  animate={introDone}
                  delay={0.4}
                  title=""
                  className="w-7 transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-110"
                />
                <Wordmark className="text-[0.85rem] min-[380px]:text-[0.95rem]" />
              </motion.a>
            </div>

            {/* Desktop links */}
            <nav aria-label="Primary" className="hidden shrink-0 lg:block">
              <LayoutGroup id="hz-nav">
                <ul className="flex items-center gap-0.5 xl:gap-1" onMouseLeave={() => setHovered(null)}>
                  {nav.map((link, i) => {
                    const isActive = active === link.href.slice(1)
                    const lit = highlight === link.href
                    return (
                      <motion.li key={link.href} variants={item}>
                        <a
                          href={link.href}
                          aria-current={isActive ? 'true' : undefined}
                          onClick={pinBar}
                          onMouseEnter={() => setHovered(link.href)}
                          onFocus={() => setHovered(link.href)}
                          onBlur={() => setHovered(null)}
                          className={cn(
                            'relative isolate flex h-11 items-center px-2.5 font-display text-[0.68rem] font-medium tracking-[0.14em] uppercase transition-colors duration-300 xl:px-4',
                            isActive || lit ? 'text-snow' : 'text-mist',
                          )}
                        >
                          {lit && (
                            <motion.span
                              layoutId="hz-nav-pill"
                              aria-hidden
                              className="absolute inset-0 -z-10 chamfer-sm bg-white/[0.07]"
                              transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                            />
                          )}
                          {/* HUD index, tucked into the padding like a footnote so it costs no width */}
                          <span
                            aria-hidden
                            className={cn(
                              'pointer-events-none absolute top-[13px] left-[3px] hidden font-mono text-[0.5rem] leading-none tracking-normal tabular-nums transition-colors duration-300 xl:block',
                              isActive ? 'text-cyan' : 'text-haze',
                            )}
                          >
                            {navIndex(i)}
                          </span>
                          {link.label}
                          {isActive && (
                            <motion.span
                              layoutId="hz-nav-active"
                              aria-hidden
                              className="absolute inset-x-0 bottom-1 mx-auto h-[2px] w-5 bg-gradient-to-r from-brand to-cyan shadow-[0_0_10px_rgba(46,230,255,0.7)]"
                              style={{ skewX: -28 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          )}
                        </a>
                      </motion.li>
                    )
                  })}
                </ul>
              </LayoutGroup>
            </nav>

            {/* Actions */}
            <div className="flex flex-1 basis-0 items-center justify-end gap-2 sm:gap-3 xl:gap-4">
              <motion.a
                variants={item}
                href={site.parentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group hidden min-h-11 shrink-0 items-center gap-1.5 font-mono text-[0.66rem] tracking-[0.22em] text-haze uppercase transition-colors hover:text-snow min-[1400px]:inline-flex"
              >
                {displayHost(site.parentUrl)}
                <ArrowUpRight
                  className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.2}
                />
                <span className="sr-only">(opens in a new tab)</span>
              </motion.a>

              {/* 44×44 sound-effects switch — joins the entrance stagger, visible at every breakpoint */}
              <motion.div variants={item} className="shrink-0">
                <SoundToggle />
              </motion.div>

              {/* Compact at lg (no arrow, tighter padding) so five nav links still clear it; full size from xl */}
              <motion.div variants={item} className="hidden shrink-0 sm:block">
                <Button
                  href="#contact"
                  size="md"
                  onClick={pinBar}
                  className="lg:px-5 xl:px-6"
                  icon={
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 lg:hidden xl:block"
                      strokeWidth={2.4}
                    />
                  }
                >
                  Reach out
                </Button>
              </motion.div>

              <motion.div variants={item} className="shrink-0 lg:hidden">
                <button
                  ref={toggleRef}
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-controls={MENU_ID}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  className="group relative grid size-11 place-items-center text-snow"
                >
                  {/* Chamfer lives on a backing layer so it never clips the focus ring */}
                  <span aria-hidden className="absolute inset-0 chamfer-sm bg-white/[0.07] transition-colors group-hover:bg-white/[0.12]" />
                  <span className="relative">
                    <MenuIcon open={menuOpen} />
                  </span>
                </button>
              </motion.div>
            </div>
          </Container>
        </motion.div>
      </motion.header>

      <MobileMenu open={menuOpen} id={MENU_ID} active={active} onClose={closeMenu} onNavigate={navigateFromMenu} />
    </>
  )
}
