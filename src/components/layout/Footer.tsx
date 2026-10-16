import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUp, ArrowUpRight, Mail } from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EASE_OUT, staggerChild, staggerParent } from '@/components/ui/Reveal'
import { socialIcons } from '@/components/ui/icons'
import { nav, site } from '@/config/site'
import { games } from '@/data/games'
import { contactHref } from '@/lib/contact'
import { scrollToTarget } from '@/lib/scroll'
import { FooterWordmark } from './FooterWordmark'
import { StudioClock } from './StudioClock'
import { displayHost, externalProps, inertIfPlaceholder, navIndex, visibleSocials } from './links'

/** Studio links land on the contact form with the matching topic preselected. */
const studioLinks = [
  { label: 'Careers', href: contactHref('Careers') },
  { label: 'Press kit', href: contactHref('Press & Media') },
  { label: 'Business enquiries', href: contactHref('Business') },
  { label: 'Player support', href: contactHref('Player Support') },
] as const

/** Games with their own website (links.site in data/games.ts), listed under Explore after the page sections. */
const gameSites = games.flatMap((g) => (g.links.site ? [{ label: g.title, href: g.links.site }] : []))

/** Column title: mono HUD label over a hairline with a 28° brand slice. The [index] sits beside the <h3> so the heading text is just the title. */
function ColumnTitle({ index, children }: { index: string; children: ReactNode }) {
  return (
    <div className="relative flex items-center gap-3 border-t border-line pt-5 font-mono text-[0.7rem] tracking-[0.25em] text-haze uppercase">
      <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-gradient-to-r from-brand to-cyan" />
      <span aria-hidden className="text-brand-400">
        [{index}]
      </span>
      <h3>{children}</h3>
    </div>
  )
}

/** Footer link: ≥44px tall; a 28° slash grows in beside the label on hover / focus. */
function FooterLink({ href, index, children }: { href: string; index?: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href)
  return (
    <a
      href={href}
      {...externalProps(href)}
      {...inertIfPlaceholder(href)}
      className="group/link relative flex min-h-11 w-fit items-center text-[0.95rem] text-mist transition-colors duration-300 hover:text-snow focus-visible:text-snow"
    >
      <span
        aria-hidden
        className="block h-4 w-0 -skew-x-[28deg] bg-gradient-to-b from-brand to-cyan opacity-0 transition-all duration-300 ease-out-expo group-hover/link:mr-3 group-hover/link:w-[3px] group-hover/link:opacity-100 group-focus-visible/link:mr-3 group-focus-visible/link:w-[3px] group-focus-visible/link:opacity-100"
      />
      {index && (
        <span aria-hidden className="mr-3 font-mono text-[0.62rem] tracking-[0.12em] text-haze tabular-nums">
          {index}
        </span>
      )}
      <span>{children}</span>
      {external && (
        <>
          <ArrowUpRight
            aria-hidden
            className="ml-1.5 size-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover/link:translate-x-0 group-hover/link:opacity-100 group-focus-visible/link:translate-x-0 group-focus-visible/link:opacity-100"
            strokeWidth={2.2}
          />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      )}
    </a>
  )
}

/** Arrow for the back-to-top button: gentle idle bob while visible; on hover it launches and a fresh one rises in. */
function BackToTopIcon() {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref)
  return (
    <span ref={ref} aria-hidden className="relative block h-5 w-4 overflow-hidden">
      <motion.span
        className="absolute inset-0"
        animate={inView ? { y: [0, -2, 0] } : { y: 0 }}
        transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
      >
        <ArrowUp className="absolute inset-x-0 top-0.5 size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-[160%]" strokeWidth={2.4} />
        <ArrowUp className="absolute inset-x-0 top-0.5 size-4 translate-y-[160%] transition-transform duration-500 ease-out-expo group-hover:translate-y-0" strokeWidth={2.4} />
      </motion.span>
    </span>
  )
}

function toTop() {
  scrollToTarget(0)
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    /* history unavailable — the scroll still happens */
  }
}

/**
 * Site footer: brand + three link columns, a monumental self-fitting wordmark
 * that fills with the brand gradient as you scroll, and a bottom bar.
 * The logo wrapper carries `data-konami-tap` (hook for the hidden easter egg).
 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative isolate overflow-hidden bg-ink-950">
      <h2 className="sr-only">{site.name} — game studio in Calicut, Kerala, India</h2>

      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50 [mask-image:linear-gradient(to_bottom,transparent_0%,#000_26%,#000_60%,transparent_100%)]" />
        <div className="absolute -top-44 -right-40 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.16)_0%,transparent_65%)]" />
        <div className="absolute -top-32 -left-48 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(10,124,255,0.14)_0%,transparent_65%)]" />
        <div className="absolute bottom-[-26%] left-1/2 h-[64%] w-[130%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(10,124,255,0.2)_0%,rgba(46,230,255,0.05)_40%,transparent_65%)]" />
      </div>

      {/* Slanted top edge: hairline + a cluster of 28° parallelograms */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
        <motion.div
          className="absolute top-0 left-[8%] flex origin-left gap-1.5"
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: EASE_OUT }}
        >
          <span className="block h-[3px] w-20 -skew-x-[28deg] bg-gradient-to-r from-brand to-cyan shadow-[0_0_14px_rgba(46,230,255,0.6)]" />
          <span className="block h-[3px] w-6 -skew-x-[28deg] bg-brand/70" />
          <span className="block h-[3px] w-2.5 -skew-x-[28deg] bg-white/40" />
        </motion.div>
      </div>

      <Container className="pt-16 sm:pt-20 lg:pt-24">
        <motion.div
          className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.75fr)_minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-x-10"
          variants={staggerParent(0.09, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* Brand */}
          <motion.div variants={staggerChild} className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-4">
              <motion.div
                data-konami-tap
                className="relative w-14 shrink-0 cursor-default sm:w-16"
                whileHover={{ rotate: -5, scale: 1.06 }}
                whileTap={{ scale: 0.88, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
              >
                <span aria-hidden className="absolute -inset-5 -z-10 rounded-full bg-[radial-gradient(circle,rgba(46,230,255,0.22)_0%,transparent_68%)]" />
                <LogoMark variant="gradient" title="" />
              </motion.div>
              <Wordmark className="text-[1.05rem] sm:text-[1.2rem]" />
            </div>

            <p className="mt-6 max-w-[36ch] text-[1rem] leading-relaxed text-mist">
              Our own open-world games for Android, iOS and PC, made in Calicut, Kerala.
            </p>

            <a
              href={site.parentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group/parent mt-3 inline-flex min-h-11 max-w-full items-center gap-1.5 font-mono text-[0.7rem] leading-snug tracking-[0.16em] text-haze uppercase transition-colors duration-300 hover:text-snow"
            >
              <span>
                A studio of <span className="text-snow">{site.parentName}</span> — {displayHost(site.parentUrl)}
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-3.5 shrink-0 transition-transform duration-300 group-hover/parent:translate-x-0.5 group-hover/parent:-translate-y-0.5"
                strokeWidth={2.2}
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>

            <div className="mt-4">
              <StudioClock />
            </div>
          </motion.div>

          {/* Explore */}
          <motion.nav variants={staggerChild} aria-label="Explore" className="col-span-1">
            <ColumnTitle index="01">Explore</ColumnTitle>
            <ul className="mt-3">
              {nav.map((item, i) => (
                <li key={item.href}>
                  <FooterLink href={item.href} index={navIndex(i)}>
                    {item.label}
                  </FooterLink>
                </li>
              ))}
              {gameSites.map((item, i) => (
                <li key={item.href}>
                  <FooterLink href={item.href} index={navIndex(nav.length + i)}>
                    {item.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </motion.nav>

          {/* Studio */}
          <motion.nav variants={staggerChild} aria-label="Studio" className="col-span-1">
            <ColumnTitle index="02">Studio</ColumnTitle>
            <ul className="mt-3">
              {studioLinks.map((item) => (
                <li key={item.href}>
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </motion.nav>

          {/* Connect */}
          <motion.div variants={staggerChild} className="col-span-2 md:col-span-1 lg:col-span-1">
            <ColumnTitle index="03">Connect</ColumnTitle>

            {visibleSocials.length > 0 && (
              <ul className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-1 lg:grid-cols-2" aria-label="Social media">
                {visibleSocials.map((s) => {
                  const Icon = socialIcons[s.key]
                  return (
                    <li key={s.key} className="min-w-0">
                      <a
                        href={s.href}
                        {...externalProps(s.href)}
                        {...inertIfPlaceholder(s.href)}
                        className="group/social relative flex min-h-11 items-center gap-2.5 px-3 text-[0.82rem] text-mist transition-colors duration-300 hover:text-snow"
                      >
                        <span
                          aria-hidden
                          className="absolute inset-0 chamfer-sm bg-white/[0.04] transition-colors duration-300 group-hover/social:bg-white/[0.1]"
                        />
                        <Icon className="relative size-[18px] shrink-0 text-snow/75 transition-all duration-300 group-hover/social:-translate-y-0.5 group-hover/social:text-cyan" />
                        <span className="relative truncate">{s.label}</span>
                        {/^https?:\/\//.test(s.href) && <span className="sr-only">(opens in a new tab)</span>}
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}

            <address className="not-italic">
              <a
                href={`mailto:${site.email}`}
                className="group/mail mt-5 inline-flex min-h-11 items-center gap-2.5 font-mono text-[0.82rem] tracking-[0.04em] break-all text-mist transition-colors duration-300 hover:text-snow"
              >
                <Mail aria-hidden className="size-4 shrink-0 text-brand-400 transition-transform duration-300 group-hover/mail:-rotate-6 group-hover/mail:scale-110" strokeWidth={2} />
                {site.email}
              </a>
            </address>
          </motion.div>
        </motion.div>
      </Container>

      <FooterWordmark />

      {/* Bottom bar */}
      <div className="mt-8 border-t border-line pb-safe sm:mt-10">
        <Container className="flex flex-col gap-5 pt-6 pb-2 sm:flex-row sm:items-center sm:justify-between">
          {/* A <div>, not a <p>: the location is an <address> and can't nest inside a paragraph */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.66rem] leading-relaxed tracking-[0.14em] text-haze uppercase">
            <span>
              © {year} {site.name}
            </span>
            <span aria-hidden className="hidden h-3 w-px -skew-x-[28deg] bg-line-strong sm:block" />
            <span>A {site.parentName} company</span>
            <span aria-hidden className="hidden h-3 w-px -skew-x-[28deg] bg-line-strong sm:block" />
            <address className="not-italic">{site.locationFull}</address>
          </div>

          <Button variant="ghost" onClick={toTop} icon={<BackToTopIcon />} className="w-full sm:w-auto">
            Back to top
          </Button>
        </Container>
      </div>
    </footer>
  )
}
