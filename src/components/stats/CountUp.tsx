import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'

type CountUpProps = {
  /** Final value. */
  value: number
  decimals?: number
  /** Start counting (e.g. when the tile scrolls into view). */
  play: boolean
  /** Seconds to wait before counting. */
  delay?: number
  duration?: number
  /** Called once the number has landed. */
  onDone?: () => void
  className?: string
  /** Classes / style for the live digits (e.g. a gradient fill). */
  numberClassName?: string
  numberStyle?: CSSProperties
}

/**
 * Counts from 0 to `value` with a long soft landing. The motion value is rendered
 * straight into the DOM (no React re-renders per frame), formatted with thousands
 * separators / fixed decimals. An invisible copy of the final number reserves the
 * width, so neighbouring elements (the unit suffix) never jitter while counting.
 * Assistive tech reads only the final number. Reduced motion: shown immediately.
 * The two visual copies carry data-nosnippet, so only the sr-only copy can end up in a search snippet.
 */
export function CountUp({ value, decimals = 0, play, delay = 0, duration = 2.4, onDone, className, numberClassName, numberStyle }: CountUpProps) {
  const reduce = useReducedMotion()
  // Reduced motion: start on the final value so there is never a frame showing "0".
  // The build-time prerender (no window) does the same, so the static HTML carries the real number.
  const mv = useMotionValue(reduce || typeof window === 'undefined' ? value : 0)
  const fmt = useMemo(
    () => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [decimals],
  )
  const text = useTransform(mv, (v) => fmt.format(v))
  const finalText = fmt.format(value)

  // Keep the latest callback without restarting the animation.
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  })

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      if (play) doneRef.current?.()
      return
    }
    if (!play) return
    const controls = animate(mv, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => doneRef.current?.(),
    })
    return () => controls.stop()
  }, [play, reduce, value, duration, delay, mv])

  return (
    <span className={cn('relative inline-block tabular-nums', className)}>
      <span aria-hidden data-nosnippet className="invisible">
        {finalText}
      </span>
      <span aria-hidden data-nosnippet className={cn('absolute inset-y-0 left-0 whitespace-nowrap', numberClassName)} style={numberStyle}>
        <motion.span>{text}</motion.span>
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  )
}
