import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion'
import { Check, LoaderCircle, RotateCcw, Send } from 'lucide-react'
import { useEffect, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/cn'

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

type SubmitButtonProps = {
  status: SubmitStatus
  /** Increment to play the "nope" shake (validation failure or send error). */
  shakeKey: number
  /** Every required field is valid — the idle button breathes a little brighter. */
  ready?: boolean
  /** Label for the success state (default "Sent") — e.g. "Opening mail" when the email app takes over. */
  successLabel?: string
  className?: string
  ref?: Ref<HTMLButtonElement>
}

const content: Record<SubmitStatus, { label: string; icon: ReactNode }> = {
  idle: { label: 'Send message', icon: <Send className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} /> },
  loading: { label: 'Sending…', icon: <LoaderCircle className="size-4 animate-spin" strokeWidth={2.6} /> },
  success: { label: 'Sent', icon: <Check className="size-4" strokeWidth={3} /> },
  error: { label: 'Retry', icon: <RotateCcw className="size-4" strokeWidth={2.6} /> },
}

// Label contrast: white on brand-600 is 5.6:1 (plain brand blue is only 3.9:1); dark ink on cyan / ember is 9+ / 6.6:1.
const surface: Record<SubmitStatus, string> = {
  idle: 'bg-brand-600',
  loading: 'bg-[#0750b0]',
  success: 'bg-cyan',
  error: 'bg-ember',
}

const ink: Record<SubmitStatus, string> = {
  idle: 'text-white',
  loading: 'text-white cursor-wait',
  success: 'text-ink-950',
  error: 'text-ink-950',
}

/* Glow lives outside the clip-path (chamfered elements clip their own box-shadow). */
const glow: Record<SubmitStatus, string> = {
  idle: 'bg-[radial-gradient(closest-side,rgba(10,124,255,0.55),transparent)]',
  loading: 'bg-[radial-gradient(closest-side,rgba(10,124,255,0.4),transparent)]',
  success: 'bg-[radial-gradient(closest-side,rgba(46,230,255,0.6),transparent)]',
  error: 'bg-[radial-gradient(closest-side,rgba(255,92,57,0.55),transparent)]',
}

/**
 * Form submit with idle → loading → success / error states, a crossfading label and an error shake.
 * The button itself is an unclipped shell; the chamfered, overflow-hidden surface is an inner layer,
 * so the global cyan focus ring is never cut off by the clip-path.
 */
export function SubmitButton({ status, shakeKey, ready = false, successLabel, className, ref }: SubmitButtonProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduce = useReducedMotion()
  const busy = status === 'loading' || status === 'success'

  useEffect(() => {
    if (!shakeKey || reduce || !scope.current) return
    animate(scope.current, { x: [0, -11, 10, -7, 5, -2, 0] }, { duration: 0.5, ease: 'easeOut' })
  }, [shakeKey, reduce, animate, scope])

  const { icon } = content[status]
  const label = status === 'success' && successLabel ? successLabel : content[status].label
  const breathing = ready && status === 'idle'

  return (
    <div ref={scope} className={cn('group relative w-full sm:w-auto', className)}>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-x-4 -inset-y-5 transition-opacity duration-500',
          glow[status],
          breathing ? 'animate-pulse-soft opacity-100' : status === 'idle' ? 'opacity-50 group-hover:opacity-100' : 'opacity-90',
        )}
      />
      <motion.button
        ref={ref}
        type="submit"
        aria-disabled={busy || undefined}
        aria-busy={status === 'loading' || undefined}
        whileTap={busy ? undefined : { scale: 0.97 }}
        className={cn(
          'relative inline-flex h-14 w-full items-center justify-center font-display text-[0.78rem] font-semibold tracking-[0.1em] uppercase transition-colors duration-500 select-none sm:min-w-[15.5rem]',
          ink[status],
        )}
      >
        <span aria-hidden className={cn('chamfer-sm absolute inset-0 overflow-hidden transition-colors duration-500', surface[status])}>
          {status === 'idle' && (
            <>
              {/* brighter blue wash, kept dark enough under the label for AA contrast */}
              <span
                className={cn(
                  'absolute inset-0 bg-gradient-to-r from-brand-600 via-[#0a6ee6] to-brand transition-opacity duration-500 group-hover:opacity-100',
                  breathing ? 'opacity-70' : 'opacity-0',
                )}
              />
              {/* the cyan kiss lives on the bottom edge instead of behind the text */}
              <span
                className={cn(
                  'absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-brand-400 to-cyan transition-opacity duration-500 group-hover:opacity-100',
                  breathing ? 'opacity-80' : 'opacity-0',
                )}
              />
              <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[28deg] bg-white/20 opacity-0 blur-[2px] transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100" />
            </>
          )}
          {status === 'loading' && (
            // indeterminate scan line while the request is in flight
            <span className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
              <motion.span
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-cyan to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
              />
            </span>
          )}
        </span>
        {/* Clips the label's slide-in/out to the button's box. */}
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-6">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status}
              className="relative inline-flex items-center gap-2.5 whitespace-nowrap"
              initial={{ y: 22, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -22, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {label}
              <span aria-hidden className="inline-flex">
                {icon}
              </span>
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  )
}
