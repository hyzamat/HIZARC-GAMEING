import { motion } from 'framer-motion'
import { useRef, type MouseEvent } from 'react'
import { cn } from '@/lib/cn'
import { pad2, type GameFilter } from './shared'

type FilterChipsProps = {
  options: { value: GameFilter; count: number }[]
  value: GameFilter
  onChange: (value: GameFilter) => void
  className?: string
}

/**
 * Segmented filter with a sliding chamfered pill (shared layoutId).
 * On phones the row scrolls horizontally inside its own box (edge-faded),
 * so it can never widen the page.
 */
export function FilterChips({ options, value, onChange, className }: FilterChipsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const select = (next: GameFilter, e: MouseEvent<HTMLButtonElement>) => {
    onChange(next)
    // Keep the chosen chip centred in the scroll strip (phones).
    const scroller = scrollerRef.current
    const chip = e.currentTarget
    if (scroller && scroller.scrollWidth > scroller.clientWidth) {
      const s = scroller.getBoundingClientRect()
      const c = chip.getBoundingClientRect()
      scroller.scrollTo({ left: scroller.scrollLeft + (c.left - s.left) - (s.width - c.width) / 2, behavior: 'smooth' })
    }
  }

  return (
    <div className={cn('-mx-5 sm:mx-0', className)}>
      <div ref={scrollerRef} className="no-scrollbar mask-fade-x overflow-x-auto px-5 sm:px-0 sm:[mask-image:none] sm:[-webkit-mask-image:none]">
        <div role="group" aria-label="Filter games by genre" className="relative flex w-max gap-1 bg-white/[0.03] p-1 ring-1 ring-line ring-inset chamfer-sm">
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={(e) => select(opt.value, e)}
                className={cn(
                  'relative inline-flex h-11 items-center gap-2 px-4 font-mono text-[0.7rem] font-medium tracking-[0.18em] whitespace-nowrap uppercase transition-colors duration-300 focus-visible:outline-offset-0',
                  active ? 'text-white' : 'text-mist hover:text-snow',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="games-filter-pill"
                    aria-hidden
                    className="absolute inset-0 bg-brand shadow-[0_8px_30px_-8px_rgba(10,124,255,0.8)] chamfer-sm"
                    transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                  />
                )}
                <span className="relative">{opt.value}</span>
                <span aria-hidden className={cn('relative text-[0.6rem] tabular-nums transition-colors', active ? 'text-white/75' : 'text-haze')}>
                  {pad2(opt.count)}
                </span>
                <span className="sr-only">({opt.count} games)</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
