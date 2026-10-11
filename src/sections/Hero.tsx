import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import '@/components/hero/hero.css'
import { HeroBackdrop } from '@/components/hero/HeroBackdrop'
import { HeroEmblem } from '@/components/hero/HeroEmblem'
import { HeroHud } from '@/components/hero/HeroHud'
import { HeroSpotlight } from '@/components/hero/HeroSpotlight'
import { NowPlaying } from '@/components/hero/NowPlaying'
import { NowPlayingChip } from '@/components/hero/NowPlayingChip'
import { heroFadeUp, useHeroTiming } from '@/components/hero/timing'
import { AnimatedWords } from '@/components/ui/AnimatedWords'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { EASE_OUT } from '@/components/ui/Reveal'
import { site, stats } from '@/config/site'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { useIntroDone } from '@/lib/intro'

/** `*word*` = brand gradient. Three lines, one <h1>. */
const TITLE = 'We build\nworlds worth\n*playing.*'

/** The three headline numbers shown on wide, tall desktops. */
const PROOF = stats.slice(0, 3).map((s) => ({
  label: s.label,
  value: `${s.prefix ?? ''}${s.value.toFixed(s.decimals ?? 0)}${s.suffix ?? ''}`,
}))

/**
 * Where the "now playing" UI fits:
 *  - the full card on laptops/desktops (and on tall tablets, where it clears the copy),
 *  - otherwise a one-line chip, but only when the screen is tall enough to leave it well clear of the CTAs.
 */
const CARD_QUERY = '(min-width: 1024px), (min-width: 768px) and (min-height: 900px)'
const CHIP_QUERY = '(min-height: 760px)'

/** Sits just above the bottom HUD row (which grows with the home-indicator safe area on notched phones). */
const ABOVE_HUD = 'bottom-[calc(4.75rem_+_max(0px,_env(safe-area-inset-bottom,0px)_-_1rem))]'

type DepthProps = {
  /** Hero scroll progress 0 → 1. */
  progress: MotionValue<number>
  /** Pixels the block drifts up by the time it has faded out. */
  shift: number
  /** Progress window over which the block fades out. */
  fade: [number, number]
  reduce: boolean
  className?: string
  children: ReactNode
}

/**
 * Scroll-linked exit for one block of hero copy. Each block uses a different
 * shift / fade window, so as the hero leaves the copy peels away in layers
 * (nearest layers move most). Skipped entirely for reduced motion.
 */
function Depth({ progress, shift, fade, reduce, className, children }: DepthProps) {
  const y = useTransform(progress, [0, fade[1]], [0, -shift])
  const opacity = useTransform(progress, fade, [1, 0])
  return (
    <motion.div className={className} style={reduce ? undefined : { y, opacity }}>
      {children}
    </motion.div>
  )
}

/**
 * HERO — "Welcome to the arena".
 *
 * Layers, back → front: backdrop (glows, perspective arena floor, motes, vignette)
 * · cursor spotlight (desktop) · the 3D Hizarc emblem · copy · HUD. Everything
 * above the fold waits for the preloader (useIntroDone), then plays one
 * choreography (see hero/timing.ts). Scrolling away zooms the backdrop, bursts
 * the emblem apart and peels the copy off in layers. Loops pause once the hero
 * leaves the screen.
 */
export function Hero() {
  const reduce = useReducedMotion() === true
  const introDone = useIntroDone()
  const t = useHeroTiming()
  const showCard = useMediaQuery(CARD_QUERY)
  const showChip = useMediaQuery(CHIP_QUERY) && !showCard
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.14])
  const hudOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0])
  // Once faded out the HUD must also leave the tab order and stop catching taps.
  const hudVisibility = useTransform(hudOpacity, (v): 'hidden' | 'visible' => (v < 0.02 ? 'hidden' : 'visible'))
  const hudStyle = reduce ? undefined : { opacity: hudOpacity, visibility: hudVisibility }

  return (
    <section ref={ref} id="top" className={cn('relative isolate flex min-h-[100svh] flex-col overflow-hidden', !inView && 'hz-paused')}>
      <HeroBackdrop play={introDone} active={inView} scale={reduce ? undefined : bgScale} />
      <HeroSpotlight active={inView} />

      {/* Emblem: upper-right and ghosted behind the copy on phones, half the stage on desktop */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[6svh] -right-[10vw] z-[1] w-[58vw] opacity-[0.34] sm:top-[8svh] sm:-right-[5vw] sm:w-[46vw] sm:opacity-45 md:right-[3vw] md:w-[40vw] md:opacity-55 lg:top-[44%] lg:right-[5vw] lg:w-[min(36vw,600px,54svh)] lg:-translate-y-1/2 lg:opacity-100 xl:w-[min(40vw,600px,54svh)]"
      >
        <HeroEmblem play={introDone} active={inView} progress={scrollYProgress} />
      </div>

      {/* Copy */}
      <Container
        className={cn(
          'relative z-10 flex flex-1 flex-col justify-center pt-[calc(6rem+env(safe-area-inset-top,0px))] lg:pt-28',
          showCard ? 'pb-28' : showChip ? 'pb-[9.5rem]' : 'pb-24 sm:pb-28',
        )}
      >
        <motion.div initial="hidden" animate={introDone ? 'show' : 'hidden'} className="relative">
          {/* Phones: a soft dark scrim keeps the copy crisp over the ghosted emblem */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -inset-y-14 -z-10 bg-[radial-gradient(ellipse_closest-side_at_50%_46%,rgba(3,5,12,0.86)_0%,rgba(3,5,12,0.72)_52%,transparent_100%)] md:hidden"
          />

          {/* Eyebrow */}
          <Depth progress={scrollYProgress} shift={30} fade={[0, 0.3]} reduce={reduce}>
            <motion.div variants={heroFadeUp(t.eyebrow, 16)} className="mb-5 flex items-center gap-3 sm:mb-6">
              <span aria-hidden className="relative flex size-2 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-volt/70" />
                <span className="relative size-2 rounded-full bg-volt shadow-[0_0_12px_rgba(215,255,58,0.85)]" />
              </span>
              <p className="font-mono text-[0.62rem] tracking-[0.2em] whitespace-nowrap text-mist uppercase max-[340px]:text-[0.56rem] max-[364px]:tracking-[0.1em] sm:text-[0.7rem] sm:tracking-[0.25em]">
                {site.name} <span className="text-brand-400">—</span> Studio <span className="text-white/30">·</span> {site.locationShort}
              </p>
              <motion.span
                aria-hidden
                variants={{
                  hidden: { scaleX: 0 },
                  show: { scaleX: 1, transition: { duration: 1.2, ease: EASE_OUT, delay: t.eyebrow + 0.25 } },
                }}
                className="hidden h-px w-16 origin-left bg-gradient-to-r from-white/35 to-transparent sm:block lg:w-28"
              />
            </motion.div>
          </Depth>

          {/* Headline — the page's only <h1> */}
          <Depth progress={scrollYProgress} shift={70} fade={[0.04, 0.46]} reduce={reduce}>
            <AnimatedWords
              as="h1"
              text={TITLE}
              trigger="manual"
              play={introDone}
              delay={t.title}
              stagger={0.1}
              wordClassName="mr-[0.24em]"
              highlightClassName={cn('hz-hl', !reduce && 'hz-hl-live')}
              className="-mr-[0.6em] font-display leading-[0.95] font-extrabold tracking-[-0.035em] text-snow [word-spacing:-0.25em] text-[length:clamp(1.9rem,calc((100vw_-_2.5rem)_/_8.6),4.5rem)] sm:text-[length:clamp(2.4rem,calc((100vw_-_4rem)_/_8.6),5.75rem)] lg:text-[length:clamp(3.4rem,min(5.8vw,11.5svh),6.75rem)]"
            />
          </Depth>

          {/* Sub-copy */}
          <Depth progress={scrollYProgress} shift={100} fade={[0, 0.4]} reduce={reduce}>
            <motion.p
              variants={heroFadeUp(t.sub)}
              className="mt-5 max-w-[32rem] text-base leading-relaxed text-mist sm:mt-7 sm:text-lg lg:max-w-[28rem] lg:text-xl lg:leading-relaxed xl:max-w-[34rem]"
            >
              Original games for mobile, PC, web and XR — crafted in <span className="font-medium text-snow">Unity &amp; Unreal Engine</span> by a Calicut
              studio that plays to win.
            </motion.p>
          </Depth>

          {/* Calls to action: stacked full-width on phones, inline from sm */}
          <Depth progress={scrollYProgress} shift={130} fade={[0, 0.34]} reduce={reduce}>
            <motion.div variants={heroFadeUp(t.ctas, 22)} className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <Button
                size="lg"
                href="#games"
                className="w-full sm:w-auto"
                icon={<ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" strokeWidth={2.4} />}
              >
                Explore our games
              </Button>
              <Button size="lg" variant="ghost" href="#contact" className="w-full sm:w-auto">
                Reach out
              </Button>
            </motion.div>
          </Depth>

          {/* Social proof — only where there is room for it (wide and tall screens) */}
          <Depth progress={scrollYProgress} shift={150} fade={[0, 0.3]} reduce={reduce}>
            <motion.ul
              variants={heroFadeUp(t.pill, 16)}
              aria-label="Hizarc Games at a glance"
              className="mt-12 hidden items-center [@media(min-width:1024px)_and_(min-height:800px)]:flex"
            >
              {PROOF.map((p, i) => (
                <li
                  key={p.label}
                  className={cn(
                    'relative flex flex-col-reverse gap-1 pr-8 pl-8 first:pl-0',
                    i > 0 && 'before:absolute before:top-0.5 before:bottom-0.5 before:left-0 before:w-px before:-skew-x-[28deg] before:bg-line-strong',
                  )}
                >
                  <span className="font-mono text-[0.62rem] tracking-[0.22em] text-haze uppercase">{p.label}</span>
                  <span className="font-display text-xl leading-none font-semibold tracking-tight text-snow">{p.value}</span>
                </li>
              ))}
            </motion.ul>
          </Depth>
        </motion.div>
      </Container>

      {/* "Now playing" HUD card: tablets & desktops with room for it (never mounted on phones, so it can't crowd the CTAs) */}
      {showCard && (
        <motion.div style={hudStyle} className={cn('pointer-events-none absolute inset-x-0 z-20', ABOVE_HUD)}>
          <Container className="flex justify-end">
            <NowPlaying play={introDone} active={inView} className="pointer-events-auto" />
          </Container>
        </motion.div>
      )}

      {/* Phones & small tablets that are tall enough: the same idea as a single compact line */}
      {showChip && (
        <motion.div style={hudStyle} className={cn('pointer-events-none absolute inset-x-0 z-20', ABOVE_HUD)}>
          <Container>
            <NowPlayingChip play={introDone} active={inView} className="pointer-events-auto" />
          </Container>
        </motion.div>
      )}

      {/* Bottom HUD row */}
      <motion.div style={hudStyle} className="absolute inset-x-0 bottom-0 z-20">
        <HeroHud play={introDone} />
      </motion.div>
    </section>
  )
}
