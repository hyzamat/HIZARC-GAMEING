import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, X } from 'lucide-react'
import { EASE_OUT } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'
import { useCopyToClipboard } from './useCopyToClipboard'

type CopyButtonProps = {
  /** Text placed on the clipboard. */
  text: string
  /** Accessible name, e.g. "Copy email address". */
  label: string
  /** Where the "Copied!" toast pops out (default: to the left, so it never escapes clipped cards). */
  toastSide?: 'left' | 'top'
  className?: string
}

const toastPos = {
  left: 'top-1/2 right-full mr-2.5 -translate-y-1/2',
  top: 'bottom-full left-1/2 mb-2.5 -translate-x-1/2',
} as const

/** 44px icon button that copies `text`, swaps to a check and pops an animated "Copied!" toast. */
export function CopyButton({ text, label, toastSide = 'left', className }: CopyButtonProps) {
  const { state, copy } = useCopyToClipboard()
  const copied = state === 'copied'
  const failed = state === 'failed'

  return (
    <div className={cn('relative shrink-0', className)}>
      <motion.button
        type="button"
        onClick={() => void copy(text)}
        aria-label={label}
        whileTap={{ scale: 0.88 }}
        className={cn(
          'group/copy relative grid size-11 place-items-center text-mist transition-colors duration-300 hover:text-snow',
          copied && 'text-cyan hover:text-cyan',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'chamfer-sm absolute inset-0 bg-white/[0.05] ring-1 ring-white/10 ring-inset transition-colors duration-300 group-hover/copy:bg-white/[0.1]',
            copied && 'bg-cyan/15 group-hover/copy:bg-cyan/15',
          )}
        />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? 'done' : failed ? 'fail' : 'copy'}
            aria-hidden
            className="relative"
            initial={{ opacity: 0, scale: 0.4, rotate: -40 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, rotate: 40 }}
            transition={{ type: 'spring', stiffness: 520, damping: 26 }}
          >
            {copied ? <Check className="size-[18px]" strokeWidth={2.6} /> : failed ? <X className="size-[18px] text-ember" strokeWidth={2.4} /> : <Copy className="size-[18px]" strokeWidth={2} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {state !== 'idle' && (
          <motion.div
            key="toast"
            aria-hidden
            className={cn('pointer-events-none absolute z-10', toastPos[toastSide])}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <motion.span
              className={cn(
                'chamfer-sm block px-3 py-1.5 font-mono text-[0.66rem] font-semibold tracking-[0.18em] whitespace-nowrap uppercase shadow-lg',
                failed ? 'bg-ember text-ink-950' : 'bg-cyan text-ink-950',
              )}
              initial={toastSide === 'left' ? { x: 10, scale: 0.85 } : { y: 8, scale: 0.85 }}
              animate={{ x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              {failed ? 'Copy failed' : 'Copied!'}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied to clipboard.' : failed ? 'Could not copy — please select the text and copy it manually.' : ''}
      </span>
    </div>
  )
}
