import { useInView } from 'framer-motion'
import { Rocket } from 'lucide-react'
import { Fragment, useRef } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { AnimatedWords } from '@/components/ui/AnimatedWords'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { contactHref } from '@/lib/contact'
import { disciplines } from './content'
import './studio.css'

/**
 * Careers band: brand-gradient chamfered panel, slanted stripes drifting at the logo's 28° cut,
 * a floating logo watermark and a slow marquee of disciplines. Both loops pause off-screen.
 */
export function CareersBand({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '120px 0px' })

  return (
    <Reveal y={44} amount={0.15} className={className}>
      <div
        ref={ref}
        className="relative isolate overflow-hidden bg-[linear-gradient(115deg,#06205a_0%,#0a4cb8_42%,#0a68e0_72%,#5b46e8_120%)] chamfer-lg"
      >
        {/* light pools */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_92%_0%,rgb(46_230_255/0.32),transparent_70%),radial-gradient(50%_60%_at_0%_100%,rgb(3_5_12/0.55),transparent_70%)]" />
        {/* drifting slanted stripes (mask lives on the static wrapper — masks move with their element) */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(100deg,transparent_8%,#000_68%)]">
          <div data-paused={!inView} className="studio-stripes absolute inset-y-0 -inset-x-80" />
        </div>
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-white/50 via-white/20 to-transparent" />

        {/* logo watermark */}
        <div
          aria-hidden
          data-paused={!inView}
          className="pointer-events-none absolute -right-10 -bottom-20 -z-10 w-[17rem] animate-float text-white/[0.1] data-[paused=true]:[animation-play-state:paused] sm:-right-8 sm:w-[24rem] lg:right-8 lg:-bottom-28 lg:w-[33rem]"
        >
          <LogoMark variant="mono" title="" />
        </div>

        <div className="px-6 pt-9 pb-10 sm:px-10 sm:pt-12 sm:pb-14 lg:px-16 lg:pt-16 lg:pb-[4.5rem]">
          <p className="inline-flex items-center gap-2.5 bg-ink-950/40 px-3.5 py-2 font-mono text-[0.66rem] tracking-[0.25em] text-white uppercase ring-1 ring-white/20 ring-inset chamfer-sm">
            <span aria-hidden className="size-1.5 animate-pulse-soft rounded-full bg-volt shadow-[0_0_12px_rgba(215,255,58,0.9)]" />
            Careers
          </p>

          <AnimatedWords
            as="h3"
            text={"We're hiring —\njoin the *squad.*"}
            highlightClassName="text-volt"
            className="mt-6 font-display text-[clamp(2.1rem,9vw,5rem)] leading-[1.02] font-bold tracking-[-0.025em] text-balance text-white sm:mt-7"
          />

          <Reveal delay={0.12} y={18} amount={0.4}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:mt-6 sm:text-lg">
              Engineers, artists, designers and producers building the next wave of games from Calicut, Kerala. Small squads, big ambition — and no ego when it comes to making the game feel right.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button href={contactHref('Careers')} variant="light" size="lg" icon={<Rocket aria-hidden className="size-4" strokeWidth={2.2} />} className="w-full sm:w-auto">
                See open roles
              </Button>
              <Button
                href="#games"
                variant="ghost"
                size="lg"
                className="w-full bg-ink-950/30 ring-white/35 hover:bg-ink-950/50 hover:ring-white/60 sm:w-auto"
              >
                See what we're making
              </Button>
            </div>
          </Reveal>
        </div>

        {/* disciplines marquee */}
        <div aria-hidden className="mask-fade-x border-t border-white/15 bg-ink-950/25 py-3.5">
          <div
            data-paused={!inView}
            className="flex w-max animate-marquee font-mono text-[0.68rem] tracking-[0.25em] whitespace-nowrap text-white/75 uppercase [--marquee-duration:46s] data-[paused=true]:[animation-play-state:paused]"
          >
            {[0, 1].map((group) => (
              <div key={group} className="flex shrink-0 items-center">
                {disciplines.map((d) => (
                  <Fragment key={d}>
                    <span className="px-5">{d}</span>
                    <span className="h-3 w-1.5 -skew-x-[28deg] bg-volt/80" />
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  )
}
