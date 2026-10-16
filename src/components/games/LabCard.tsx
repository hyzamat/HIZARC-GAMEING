import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { EASE_OUT } from '@/components/ui/Reveal'
import { upcomingGames } from '@/data/games'
import { cn } from '@/lib/cn'
import { GRID_LAYOUT_SPRING } from './shared'

type LabCardProps = {
  revealed: boolean
  delay: number
  className?: string
}

/** "DEPTH CITY 2, Born to Drive 2 and …" — the titles from the Upcoming section. */
const nextUp = new Intl.ListFormat('en', { type: 'conjunction' }).format(upcomingGames.map((g) => g.title))

/**
 * The last slot of the library: what is in development next, linking to #upcoming.
 * Same footprint and entrance as a game card so the grid / rail always ends cleanly.
 */
export function LabCard({ revealed, delay, className }: LabCardProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 48, scale: 0.96 }}
      animate={revealed ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ default: { duration: 0.85, ease: EASE_OUT, delay }, layout: GRID_LAYOUT_SPRING }}
      className={cn('relative', className)}
    >
      <article className="group relative isolate flex h-full min-h-[21rem] flex-col overflow-hidden p-6 sm:p-7">
        {/* hairline frame + surface */}
        <span aria-hidden className="absolute inset-0 -z-20 bg-white/[0.09] transition-colors duration-500 chamfer group-hover:bg-white/[0.2]">
          <span className="absolute inset-px bg-ink-900 chamfer [--cut:13.5px]" />
        </span>

        {/* ambient texture */}
        <span aria-hidden className="pointer-events-none absolute inset-px -z-10 overflow-hidden chamfer [--cut:13.5px]">
          <span className="absolute inset-0 bg-dots opacity-70 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)] [-webkit-mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" />
          <span className="absolute -top-16 left-1/2 size-64 -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(10,124,255,0.28),transparent)] transition-opacity duration-500 group-hover:opacity-100" />
        </span>

        <p className="flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.22em] text-haze uppercase">
          <span className="size-1.5 animate-pulse-soft rounded-full bg-volt" />
          In the lab
        </p>

        {/* emblem: dashed orbit + plus */}
        <div aria-hidden className="relative mx-auto my-7 grid size-28 place-items-center">
          <span className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-cyan/45" />
          <span className="absolute inset-3.5 rounded-full border border-white/10" />
          <span className="relative block size-11 transition-transform duration-700 ease-out-expo group-hover:rotate-90">
            <span className="absolute top-0 left-1/2 h-full w-[3px] -translate-x-1/2 bg-gradient-to-b from-cyan to-brand" />
            <span className="absolute top-1/2 left-0 h-[3px] w-full -translate-y-1/2 bg-gradient-to-r from-brand to-cyan" />
          </span>
        </div>

        <div className="mt-auto">
          <h3 className="font-display text-[1.3rem] leading-tight font-bold tracking-[-0.01em] text-snow sm:text-[1.4rem]">More worlds coming.</h3>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            {nextUp} {upcomingGames.length === 1 ? 'is' : 'are'} already in development at the studio.
          </p>
          <Button href="#upcoming" variant="ghost" className="mt-5 w-full sm:w-auto">
            See what&apos;s next
          </Button>
        </div>
      </article>
    </motion.li>
  )
}
