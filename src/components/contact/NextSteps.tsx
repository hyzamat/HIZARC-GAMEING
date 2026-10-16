import { motion, type Variants } from 'framer-motion'
import { EASE_OUT, staggerParent } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

const STEPS = [
  {
    title: 'Write to us',
    body: 'A few lines is plenty. Links to screenshots, an article or a portfolio help us answer faster.',
  },
  {
    title: 'We read it',
    body: 'Your message goes straight to the person who handles business, press, careers or player support.',
  },
  {
    title: 'A human replies',
    body: 'Someone from the studio gets back to you personally, with next steps or the answer you need.',
  },
] as const

const hud = 'font-mono text-[0.66rem] tracking-[0.24em] uppercase'

const listVariants = staggerParent(0.14, 0.05)

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
}

/* Connectors "charge" towards the next step as each one lands. */
const vLineVariants: Variants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.9, delay: 0.25, ease: EASE_OUT } },
}
const hLineVariants: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.9, delay: 0.25, ease: EASE_OUT } },
}

const tileVariants: Variants = {
  hidden: { scale: 0.6, rotate: -12, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 360, damping: 20 } },
}

/**
 * "What happens next" — a three-beat HUD timeline that sets expectations.
 * Vertical on phones and in the lg left column; a horizontal 3-up between sm and lg.
 */
export function NextSteps({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <p className={cn(hud, 'mb-6 flex items-center gap-3 text-brand-300')}>
        <span className="text-cyan">//</span> What happens next
      </p>

      <motion.ol
        variants={listVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        aria-label="What happens after you send your message"
        className="relative sm:grid sm:grid-cols-3 sm:gap-6 lg:block"
      >
        {STEPS.map((step, i) => {
          const last = i === STEPS.length - 1
          return (
            <motion.li
              key={step.title}
              variants={stepVariants}
              className={cn('relative flex gap-4 sm:flex-col sm:gap-4 lg:flex-row lg:gap-5', !last && 'pb-7 sm:pb-0 lg:pb-7')}
            >
              {!last && (
                <>
                  {/* vertical connector (phones, lg column) */}
                  <motion.span
                    aria-hidden
                    variants={vLineVariants}
                    className="absolute top-12 bottom-1 left-[1.375rem] w-px origin-top bg-gradient-to-b from-brand/70 via-brand/25 to-transparent sm:hidden lg:block"
                  />
                  {/* horizontal connector (sm–lg 3-up) */}
                  <motion.span
                    aria-hidden
                    variants={hLineVariants}
                    className="absolute top-[1.375rem] right-1 left-14 hidden h-px origin-left bg-gradient-to-r from-brand/70 via-brand/25 to-transparent sm:block lg:hidden"
                  />
                </>
              )}
              <motion.span
                aria-hidden
                variants={tileVariants}
                className="chamfer-sm relative grid size-11 shrink-0 place-items-center overflow-hidden bg-ink-700 font-mono text-[0.72rem] font-semibold text-snow ring-1 ring-white/10 ring-inset"
              >
                {/* slanted slash echoing the logo cut */}
                <span className="absolute -inset-y-2 left-1/2 w-px rotate-[28deg] bg-gradient-to-b from-transparent via-cyan/40 to-transparent" />
                <span className="relative tabular-nums">0{i + 1}</span>
              </motion.span>
              <div className="min-w-0 pt-1 sm:pt-0 lg:pt-1">
                <h3 className="font-display text-[0.98rem] leading-snug font-semibold tracking-[-0.01em] text-snow">{step.title}</h3>
                <p className="mt-1.5 max-w-sm text-[0.9rem] leading-relaxed text-mist">{step.body}</p>
              </div>
            </motion.li>
          )
        })}
      </motion.ol>
    </div>
  )
}
