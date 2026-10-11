import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { STAT_ACCENTS, StatTile } from '@/components/stats/StatTile'
import { AnimatedWords } from '@/components/ui/AnimatedWords'
import { Container } from '@/components/ui/Container'
import { Reveal, staggerParent } from '@/components/ui/Reveal'
import { platformsWeBuildFor, site, stats } from '@/config/site'
import { cn } from '@/lib/cn'
import '@/components/stats/stats.css'

const GRID_MASK =
  '[mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_15%,transparent_72%)] [-webkit-mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_15%,transparent_72%)]'

/** Hairlines between tiles: a cross on phones (2×2), slanted logo-angle dividers on desktop (4 columns). */
const TILE_DIVIDERS = cn(
  'max-lg:border-b max-lg:border-line max-lg:odd:border-r max-lg:[&:nth-last-child(-n+2)]:border-b-0',
  "lg:after:pointer-events-none lg:after:absolute lg:after:top-[14%] lg:after:right-0 lg:after:h-[72%] lg:after:w-px lg:after:-skew-x-[28deg] lg:after:bg-gradient-to-b lg:after:from-transparent lg:after:via-white/25 lg:after:to-transparent lg:after:content-[''] lg:last:after:hidden",
)

/**
 * #stats — "by the numbers" band. A HUD panel of tiles whose numbers count up
 * when the band scrolls into view, over a masked blueprint grid and a slow
 * diagonal light sweep (paused while off-screen).
 */
export function Stats() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  const visible = useInView(sectionRef, { margin: '160px 0px' })
  const entered = useInView(gridRef, { once: true, amount: 0.3 })
  const paused = !visible && '[animation-play-state:paused]'

  return (
    <section id="stats" ref={sectionRef} aria-label={`${site.name} by the numbers`} className="relative border-y border-line py-14 sm:py-20 lg:py-24">
      {/* backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-ink-900/70 via-ink-950 to-ink-900/70">
        <div className={cn('absolute inset-0 bg-grid', GRID_MASK)} />
        <div className="absolute top-1/2 left-1/2 h-[26rem] w-[56rem] max-w-none -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(10,124,255,0.17),transparent)]" />
        <div className="absolute -right-40 -bottom-40 size-[28rem] bg-[radial-gradient(closest-side,rgba(124,92,255,0.12),transparent)]" />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[32%] bg-gradient-to-r from-transparent via-brand/10 to-transparent animate-[stats-sweep_12s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:hidden',
            paused,
          )}
        />
      </div>

      <Container className="relative">
        {/* heading */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Reveal y={12}>
              <p className="mb-4 flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.25em] text-brand-300 uppercase sm:text-xs">
                <span aria-hidden className="size-2 animate-pulse-soft rounded-full bg-volt shadow-[0_0_14px_2px_rgba(215,255,58,0.55)]" />
                [ By the numbers ]
              </p>
            </Reveal>
            <AnimatedWords
              text={'Built to be *played*\nby millions.'}
              className="font-display text-[clamp(1.75rem,6.8vw,3.2rem)] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-snow"
            />
          </div>

          <Reveal delay={0.2} className="hidden lg:block">
            <p className="mb-2 text-right font-mono text-[0.62rem] tracking-[0.25em] text-haze uppercase">Shipping on</p>
            <ul className="flex max-w-md flex-wrap justify-end gap-x-4 gap-y-1 font-mono text-[0.7rem] tracking-[0.18em] text-mist uppercase">
              {platformsWeBuildFor.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* HUD panel */}
        <div className="relative mt-8 bg-white/10 p-px chamfer [--cut:20px] sm:mt-12 sm:[--cut:28px]">
          <div className="relative overflow-hidden bg-ink-900/90 chamfer [--cut:19px] sm:[--cut:27px]">
            {/* scan line */}
            <span aria-hidden className={cn('pointer-events-none absolute inset-0 animate-[stats-scan_9s_linear_infinite] motion-reduce:hidden', paused)}>
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/45 to-transparent" />
            </span>

            <motion.ul
              ref={gridRef}
              variants={staggerParent(0.12, 0.05)}
              initial="hidden"
              animate={entered ? 'show' : 'hidden'}
              className="relative grid grid-cols-2 lg:grid-cols-4"
            >
              {stats.map((s, i) => (
                <StatTile
                  key={s.label}
                  stat={s}
                  index={i}
                  accent={STAT_ACCENTS[i % STAT_ACCENTS.length]}
                  play={entered}
                  className={TILE_DIVIDERS}
                />
              ))}
            </motion.ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
