import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { mix } from '@/components/art/GameArt'
import { EASE_OUT } from '@/components/ui/Reveal'
import type { DevStage } from '@/data/games'
import { cn } from '@/lib/cn'
import { STAGES } from './meta'

/** Number of HUD segments in the bar (each = 5%). */
const SEGMENTS = 20
const PER_SEGMENT = 100 / SEGMENTS
/** Total time for the fill to sweep across the full bar. */
const SWEEP = 1.25
const START_DELAY = 0.2

const clampPct = (n: number) => Math.min(100, Math.max(0, n))

type DevProgressProps = {
  progress: number
  /** Stage accent — the bar shades from Hizarc blue into this colour. */
  accent: string
  className?: string
}

/**
 * Segmented "DEV PROGRESS" bar. When it scrolls into view the slanted segments light up one by
 * one from 0 to `progress`, the leading segment pulses, and the % label counts up in sync.
 */
export function DevProgress({ progress, accent, className }: DevProgressProps) {
  const pct = clampPct(progress)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.8 })
  const reduce = useReducedMotion()

  const count = useMotionValue(reduce ? pct : 0)
  const label = useTransform(count, (v) => Math.round(v))

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      count.set(pct)
      return
    }
    // Same pace as the segment sweep: the label reaches pct as the last lit segment lands.
    const controls = animate(count, pct, { duration: SWEEP * (pct / 100) + 0.35, delay: START_DELAY, ease: [0.3, 0.1, 0.3, 1] })
    return () => controls.stop()
  }, [inView, reduce, pct, count])

  const colors = useMemo(() => Array.from({ length: SEGMENTS }, (_, i) => mix('#0a7cff', accent, i / (SEGMENTS - 1))), [accent])
  const head = Math.max(0, Math.ceil(pct / PER_SEGMENT) - 1)

  return (
    <div ref={ref} className={className}>
      <div className="flex items-center justify-between gap-3 font-mono text-[0.6rem] tracking-[0.2em] uppercase sm:text-[0.64rem]">
        <span className="text-haze">Dev progress</span>
        <span className="font-semibold text-snow tabular-nums">
          <motion.span>{label}</motion.span>%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Development progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% complete`}
        className="mt-2 flex h-2.5 gap-[3px] px-[3px] sm:mt-2.5 sm:h-3"
      >
        {colors.map((c, i) => {
          const fill = Math.min(1, Math.max(0, (pct - i * PER_SEGMENT) / PER_SEGMENT))
          return (
            <span key={i} className="relative flex-1 -skew-x-[28deg] overflow-hidden bg-white/[0.07]">
              {fill > 0 && (
                <motion.span
                  className={cn('absolute inset-0 origin-left', i === head && pct < 100 && 'animate-pulse-soft')}
                  style={{ backgroundColor: c }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: inView ? fill : 0 }}
                  transition={{ duration: 0.3, delay: START_DELAY + (i / SEGMENTS) * SWEEP, ease: EASE_OUT }}
                />
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** Concept → Soft launch pipeline: done stages dimmed, current stage lit. */
export function StagePipeline({ stage, accent, className }: { stage: DevStage; accent: string; className?: string }) {
  const current = STAGES.indexOf(stage)
  return (
    <div className={className}>
      <p className="sr-only">
        Stage {current + 1} of {STAGES.length}: {stage}
      </p>
      <div aria-hidden className="flex gap-1.5 px-[2px]">
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={cn('h-1.5 flex-1 -skew-x-[28deg]', i > current && 'bg-white/[0.08]', i === current && 'animate-pulse-soft')}
            style={i <= current ? { backgroundColor: accent, opacity: i < current ? 0.4 : 1 } : undefined}
          />
        ))}
      </div>
      <div aria-hidden className="mt-2 flex items-center justify-between font-mono text-[0.56rem] tracking-[0.2em] text-haze uppercase">
        <span>Concept</span>
        <span className="text-snow/90">
          Stage {current + 1}/{STAGES.length}
        </span>
        <span>Launch</span>
      </div>
    </div>
  )
}
