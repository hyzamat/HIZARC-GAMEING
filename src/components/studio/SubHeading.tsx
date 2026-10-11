import type { ReactNode } from 'react'
import { AnimatedWords } from '@/components/ui/AnimatedWords'
import { Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

type SubHeadingProps = {
  /** Mono label with a slanted marker, e.g. "Capabilities". */
  label: string
  /** h3 text. `\n` = line break, `*word*` = gradient. */
  title: string
  /** Short supporting copy, right-aligned on larger screens. */
  aside?: ReactNode
  className?: string
}

/** Second-level heading used inside the Studio section (SectionHeading owns the h2). */
export function SubHeading({ label, title, aside, className }: SubHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10', className)}>
      <div>
        <Reveal y={10} className="mb-3.5 flex items-center gap-3 font-mono text-[0.68rem] tracking-[0.25em] text-haze uppercase">
          <span aria-hidden className="h-[3px] w-6 -skew-x-[28deg] bg-cyan" />
          {label}
        </Reveal>
        <AnimatedWords
          as="h3"
          text={title}
          className="font-display text-[clamp(1.65rem,6.2vw,2.9rem)] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-snow"
        />
      </div>
      {aside && (
        <Reveal delay={0.15} className="max-w-sm text-[0.95rem] leading-relaxed text-mist sm:text-right">
          {aside}
        </Reveal>
      )}
    </div>
  )
}
