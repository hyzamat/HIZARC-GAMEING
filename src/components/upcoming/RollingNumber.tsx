import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

type RollingNumberProps = {
  value: number
  /** Zero-pad to at least this many digits (default 2). */
  minDigits?: number
  className?: string
  /** Size of each digit slot — fixed width keeps the number from jittering as it changes. */
  slotClassName?: string
}

/**
 * Odometer-style counter: when a digit changes, the old one drops out of its slot and the new
 * one drops in from above (a countdown "rolling back"). Slots are keyed from the right, so the
 * units digit keeps its slot when the number loses a digit (100 → 99).
 * Purely visual — callers provide the accessible text.
 */
export function RollingNumber({ value, minDigits = 2, className, slotClassName = 'h-[1.12em] w-[0.8em]' }: RollingNumberProps) {
  const digits = String(Math.max(0, Math.floor(value))).padStart(minDigits, '0').split('')
  return (
    <span aria-hidden className={cn('inline-flex tabular-nums', className)}>
      {digits.map((d, i) => (
        <span key={digits.length - i} className={cn('relative inline-block overflow-hidden', slotClassName)}>
          <AnimatePresence initial={false}>
            <motion.span
              key={d}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
