import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'

type SignalMeterProps = {
  /** How many checkpoints are complete. */
  level: number
  total: number
  className?: string
}

/**
 * Phone-style "signal" bars that light up as the brief becomes sendable
 * (topic → name → valid email → message). Purely decorative feedback — the
 * real validation lives on the fields — so it is hidden from assistive tech.
 */
export function SignalMeter({ level, total, className }: SignalMeterProps) {
  const full = level >= total
  const pct = Math.round((Math.min(level, total) / total) * 100)

  return (
    <div aria-hidden className={cn('flex items-center gap-2.5', className)}>
      <span className="relative h-4 overflow-hidden font-mono text-[0.62rem] leading-4 tracking-[0.22em] uppercase">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={full ? 'ready' : 'signal'}
            className={cn('block', full ? 'text-cyan' : 'text-haze')}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            {full ? 'Ready' : 'Signal'}
          </motion.span>
        </AnimatePresence>
      </span>

      <span className="flex items-end gap-[3px]">
        {Array.from({ length: total }, (_, i) => {
          const lit = i < level
          return (
            <span key={i} className="relative w-[5px] overflow-hidden bg-white/[0.09]" style={{ height: 6 + i * 3 }}>
              <motion.span
                className={cn('absolute inset-0 origin-bottom transition-colors duration-500', full ? 'bg-cyan' : 'bg-brand-400')}
                initial={false}
                animate={{ scaleY: lit ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 520, damping: 30, delay: lit ? 0.04 * i : 0 }}
              />
            </span>
          )
        })}
      </span>

      <span className={cn('w-[4ch] text-right font-mono text-[0.66rem] tabular-nums transition-colors duration-500', full ? 'text-cyan' : 'text-mist')}>
        {pct}%
      </span>
    </div>
  )
}
