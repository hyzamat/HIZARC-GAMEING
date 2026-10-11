import { cn } from '@/lib/cn'
import { AnimatedWords } from './AnimatedWords'
import { Reveal } from './Reveal'

type SectionHeadingProps = {
  /** Two-digit index shown in the HUD label, e.g. "01". */
  index: string
  /** Small label above the title, e.g. "Our Games". */
  eyebrow: string
  /** Big title. Use \n for line breaks and *word* for gradient highlight. */
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
  /** Optional element rendered on the right (desktop) / below (mobile), e.g. filter chips or a CTA. */
  aside?: React.ReactNode
}

/**
 * Consistent section header:
 *   [01] ── OUR GAMES
 *   Worlds we've
 *   already shipped.
 */
export function SectionHeading({ index, eyebrow, title, description, align = 'left', className, aside }: SectionHeadingProps) {
  const center = align === 'center'
  return (
    <div className={cn('flex flex-col gap-6 md:flex-row md:items-end md:justify-between', center && 'items-center text-center md:flex-col md:items-center', className)}>
      <div className={cn('max-w-3xl', center && 'mx-auto')}>
        <Reveal y={12} className={cn('mb-5 flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.25em] text-brand-300 uppercase sm:text-xs', center && 'justify-center')}>
          <span className="text-cyan">[{index}]</span>
          <span className="h-px w-8 bg-gradient-to-r from-cyan to-transparent sm:w-12" />
          <span>{eyebrow}</span>
        </Reveal>
        <AnimatedWords
          text={title}
          className="font-display text-[clamp(2rem,8.4vw,4.75rem)] leading-[1.02] font-bold tracking-[-0.02em] text-balance text-snow"
        />
        {description && (
          <Reveal delay={0.15} className={cn('mt-5 max-w-xl text-base leading-relaxed text-mist sm:text-lg', center && 'mx-auto')}>
            <p>{description}</p>
          </Reveal>
        )}
      </div>
      {aside && <Reveal delay={0.2} className="shrink-0">{aside}</Reveal>}
    </div>
  )
}
