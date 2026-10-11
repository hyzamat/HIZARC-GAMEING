import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { EASE_OUT, Reveal } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { pillars } from './content'
import { SubHeading } from './SubHeading'

/** "What we stand for": three values with big outlined numerals that fill with brand colour as they reach the middle of the screen. */
export function Pillars({ className }: { className?: string }) {
  return (
    <div className={className}>
      <SubHeading
        label="Our code"
        title={'Three rules.\n*Zero* exceptions.'}
        aside="The principles behind every build, every sprint and every update we ship."
      />
      <ol className="mt-10 grid sm:mt-14 lg:grid-cols-3 lg:gap-10 xl:gap-14">
        {pillars.map((p, i) => (
          <Pillar key={p.n} pillar={p} index={i} />
        ))}
      </ol>
    </div>
  )
}

type PillarData = (typeof pillars)[number]

function Pillar({ pillar, index }: { pillar: PillarData; index: number }) {
  const ref = useRef<HTMLLIElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.45'] })
  const fill = useTransform(scrollYProgress, [0, 1], ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'])
  const numeral = 'font-display text-[clamp(4.75rem,19vw,7.5rem)] leading-[0.85] font-bold tracking-[-0.05em]'

  return (
    <li ref={ref} className={cn('relative py-8 sm:py-10 lg:py-0', index > 0 && 'border-t border-line lg:border-t-0')}>
      {/* numeral row: outline number + a slanted rule that draws itself in */}
      <div className="flex items-end gap-4 sm:gap-6">
        <div className="relative shrink-0" aria-hidden>
          {/* both layers are blocks with identical type metrics, so the gradient fill lands exactly on the outline */}
          <span className={cn(numeral, 'block text-outline select-none')}>{pillar.n}</span>
          <motion.span
            className={cn(numeral, 'text-gradient-ultra absolute inset-0 select-none')}
            style={{ clipPath: reduce ? 'inset(0% 0% 0% 0%)' : fill }}
          >
            {pillar.n}
          </motion.span>
        </div>
        {/* The 28° skew lives on a plain wrapper: framer's inline `transform` (scaleX) would override a skew class on the animated node. */}
        <span aria-hidden className="mb-3 block h-[6px] flex-1 -skew-x-[28deg]">
          <motion.span
            className="block h-full origin-left bg-gradient-to-r from-brand via-cyan/70 to-transparent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.1 + index * 0.08 }}
          />
        </span>
      </div>

      <Reveal delay={0.1} y={18} amount={0.5}>
        <p className="mt-6 font-mono text-[0.66rem] tracking-[0.25em] text-cyan uppercase sm:mt-7">{pillar.kicker}</p>
        <h4 className="mt-2.5 font-display text-[clamp(1.5rem,5.4vw,2rem)] leading-tight font-bold tracking-[-0.02em] text-snow uppercase">{pillar.title}</h4>
        <p className="mt-3.5 max-w-md text-base leading-relaxed text-mist">{pillar.text}</p>
      </Reveal>
    </li>
  )
}
