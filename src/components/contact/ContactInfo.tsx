import { motion, type Variants } from 'framer-motion'
import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { EASE_OUT, staggerParent } from '@/components/ui/Reveal'
import { socialIcons } from '@/components/ui/icons'
import { site, socials } from '@/config/site'
import { cn } from '@/lib/cn'
import { ChamferFrame } from './ChamferFrame'
import { CopyButton } from './CopyButton'
import { useLocalTime } from './useLocalTime'

const STUDIO_TIME_ZONE = 'Asia/Kolkata'
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.location)}`
const parentHost = site.parentUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

// Hoisted so the once-a-minute clock re-render never hands framer fresh variant objects.
const cardListVariants = staggerParent(0.1, 0.05)
const socialListVariants = staggerParent(0.06, 0.15)

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_OUT } },
}

/** One-shot light sweep that crosses each card as it lands (inherits hidden/show from the card). */
const sweepVariants: Variants = {
  hidden: { x: '-120%' },
  show: { x: '520%', transition: { duration: 1.25, delay: 0.25, ease: EASE_OUT } },
}

const socialVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.85 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 22 } },
}

/** '#' placeholders must not trigger the global "scroll to top" anchor behaviour. */
const swallowPlaceholder = (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.currentTarget.getAttribute('href') === '#') e.preventDefault()
}

const hud = 'font-mono text-[0.66rem] tracking-[0.24em] uppercase'

type InfoCardProps = {
  icon: ReactNode
  label: string
  /** The main line — usually a stretched link so the whole card is tappable. */
  value: ReactNode
  meta?: ReactNode
  /** Interactive element on the right (sits above the stretched link). */
  action?: ReactNode
  className?: string
}

function InfoCard({ icon, label, value, meta, action, className }: InfoCardProps) {
  return (
    <motion.li variants={cardVariants} className={cn('group relative', className)}>
      {/* soft outer glow (outside the clip) */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-3 bg-[radial-gradient(60%_70%_at_30%_50%,rgba(10,124,255,0.22),transparent_70%)] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <ChamferFrame
        cut={16}
        wrapperClassName="h-full transition-transform duration-500 ease-out-expo group-hover:-translate-y-1"
        className="flex h-full items-center gap-4 overflow-hidden bg-[linear-gradient(135deg,rgba(28,39,71,0.72),rgba(7,11,23,0.78))] p-4 pr-3 sm:p-5 sm:pr-4"
        borderClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.1))]"
        accentClassName="bg-[linear-gradient(120deg,var(--color-brand),var(--color-cyan))] opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {/* entrance sweep */}
        <motion.span
          aria-hidden
          variants={sweepVariants}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/[0.09] to-transparent"
          style={{ skewX: -28 }}
        />
        <span
          aria-hidden
          className="chamfer-sm relative grid size-11 shrink-0 place-items-center bg-brand/15 text-brand-300 ring-1 ring-brand/30 ring-inset transition-colors duration-500 group-hover:bg-brand group-hover:text-white"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(hud, 'text-mist/70')}>{label}</p>
          {/* Unbounded is wide: step the size down on 360px phones so the email address never gets clipped. */}
          <div className="mt-1 font-display text-[0.8rem] leading-snug font-semibold tracking-[-0.01em] text-snow min-[380px]:text-[0.92rem] sm:text-[0.98rem]">{value}</div>
          {meta && <div className="mt-1 text-[0.8rem] leading-snug text-mist">{meta}</div>}
        </div>
        {action && <div className="relative z-10">{action}</div>}
      </ChamferFrame>
    </motion.li>
  )
}

/** Stretched link: the ::after covers the whole card so it's one big touch target. */
const stretched = 'outline-none after:absolute after:inset-0 focus-visible:underline focus-visible:decoration-cyan focus-visible:underline-offset-4'

/** Left column: direct lines (email / studio / parent company) + social row. */
export function ContactInfo({ className }: { className?: string }) {
  const time = useLocalTime(STUDIO_TIME_ZONE)
  const links = socials.filter((s) => s.href.trim() !== '')
  const [hh, mm] = time.split(':')

  return (
    <div className={cn('relative', className)}>
      <p className={cn(hud, 'mb-4 flex items-center gap-3 text-brand-300')}>
        <span className="text-cyan">//</span> Direct lines
      </p>

      <motion.ul
        variants={cardListVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        aria-label="Direct lines to the studio"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
      >
        <InfoCard
          className="sm:col-span-2 lg:col-span-1"
          icon={<Mail className="size-[18px]" strokeWidth={2} />}
          label="Email the studio"
          value={
            <a href={`mailto:${site.email}`} className={cn(stretched, 'block [overflow-wrap:anywhere]')}>
              {site.email}
            </a>
          }
          meta="Partnerships, press & support — one inbox."
          action={<CopyButton text={site.email} label={`Copy email address ${site.email}`} />}
        />
        <InfoCard
          icon={<MapPin className="size-[18px]" strokeWidth={2} />}
          label="Studio"
          value={
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={stretched} aria-label={`${site.location} — open in Google Maps`}>
              {site.location}
            </a>
          }
          meta={
            time ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse-soft rounded-full bg-volt" aria-hidden />
                <span>
                  Local time{' '}
                  <time dateTime={time} className="font-mono text-snow tabular-nums">
                    <span aria-hidden>
                      {hh}
                      <span className="animate-pulse-soft">:</span>
                      {mm}
                    </span>
                    <span className="sr-only">{time}</span>
                  </time>{' '}
                  IST
                </span>
              </span>
            ) : (
              'India Standard Time (UTC+5:30)'
            )
          }
        />
        <InfoCard
          icon={<LogoMark variant="inverse" title="" className="w-[17px]" />}
          label="Parent company"
          value={
            <a href={site.parentUrl} target="_blank" rel="noopener noreferrer" className={cn(stretched, 'inline-flex items-center gap-1.5')}>
              {site.parentName}
              <ArrowUpRight className="size-4 text-cyan transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          }
          meta={parentHost}
        />
      </motion.ul>

      {links.length > 0 && (
        <div className="mt-8 sm:mt-10">
          <p className={cn(hud, 'flex items-center gap-3 text-mist/70')}>
            <span className="h-px w-6 bg-gradient-to-r from-cyan to-transparent" aria-hidden />
            Follow the studio
          </p>
          <motion.ul
            variants={socialListVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="mt-4 flex flex-wrap gap-2.5"
            aria-label={`${site.name} on social media`}
          >
            {links.map((s) => {
              const Icon = socialIcons[s.key]
              const external = /^https?:\/\//.test(s.href)
              return (
                <motion.li key={s.key} variants={socialVariants} className="group relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-2 bg-[radial-gradient(closest-side,rgba(46,230,255,0.35),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  {/* The anchor stays unclipped so its focus ring shows; the chamfered face is an inner layer. */}
                  <a
                    href={s.href}
                    aria-label={s.label}
                    onClick={swallowPlaceholder}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="relative grid size-11 place-items-center text-mist transition-[translate,scale,color] duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:text-white active:scale-95"
                  >
                    <span
                      aria-hidden
                      className="chamfer-sm absolute inset-0 bg-white/[0.05] ring-1 ring-white/10 transition-colors duration-300 ring-inset group-hover:bg-brand"
                    />
                    <Icon className="relative size-[18px]" />
                  </a>
                </motion.li>
              )
            })}
          </motion.ul>
        </div>
      )}
    </div>
  )
}
