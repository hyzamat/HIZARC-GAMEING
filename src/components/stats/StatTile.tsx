import { motion, type Variants } from 'framer-motion'
import { Star } from 'lucide-react'
import { useState, type PointerEvent } from 'react'
import { pad2 } from '@/components/games/shared'
import { EASE_OUT } from '@/components/ui/Reveal'
import type { stats } from '@/config/site'
import { cn } from '@/lib/cn'
import { CountUp } from './CountUp'

export type Stat = (typeof stats)[number]

/** One accent per tile — all from the brand palette. */
export const STAT_ACCENTS = ['#2ee6ff', '#3d9bff', '#d7ff3a', '#7c5cff'] as const

const tile: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.95, ease: EASE_OUT } },
}
const bracket: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: EASE_OUT, delay: 0.15 } },
}
const rule: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 1.1, ease: EASE_OUT, delay: 0.35 } },
}
const caption: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE_OUT, delay: 0.3 } },
}

/** Small unit that sits top-right of the big number (M+, +, ★ …). */
function Affix({ children, accent }: { children: string; accent: string }) {
  if (children === '★') {
    return (
      <>
        <Star aria-hidden className="ml-[0.1em] inline-block size-[0.46em] align-top fill-current" style={{ color: accent }} strokeWidth={1.5} />
        <span className="sr-only"> stars</span>
      </>
    )
  }
  return (
    <span className="ml-[0.08em] inline-block align-top text-[0.46em] leading-[1.2]" style={{ color: accent }}>
      {children}
    </span>
  )
}

type StatTileProps = {
  stat: Stat
  index: number
  accent: string
  /** Numbers start counting. */
  play: boolean
  className?: string
}

/**
 * HUD tile: corner brackets that snap in, a gradient number that counts up and,
 * once it lands, a single light sweep over the digits and a glow bloom.
 * Variants (hidden / show) come from the parent list so the tiles enter staggered.
 */
export function StatTile({ stat, index, accent, play, className }: StatTileProps) {
  const [done, setDone] = useState(false)
  const countDelay = 0.35 + index * 0.14

  // Mouse only: a soft spotlight in the accent colour follows the cursor across the tile (CSS vars, no re-render).
  const onMove = (e: PointerEvent<HTMLLIElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  // 4 corner brackets: [position classes, transform origin]
  const corners = [
    { cls: 'top-2.5 left-2.5 border-t border-l', origin: { originX: 0, originY: 0 } },
    { cls: 'top-2.5 right-2.5 border-t border-r', origin: { originX: 1, originY: 0 } },
    { cls: 'bottom-2.5 left-2.5 border-b border-l', origin: { originX: 0, originY: 1 } },
    { cls: 'right-2.5 bottom-2.5 border-r border-b', origin: { originX: 1, originY: 1 } },
  ]

  return (
    <motion.li
      variants={tile}
      onPointerMove={onMove}
      className={cn('group relative flex flex-col px-4 py-6 sm:px-7 sm:py-10 lg:px-8 lg:py-12', className)}
    >
      {/* cursor spotlight (hover-capable devices only) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(260px circle at var(--mx, 50%) var(--my, 40%), ${accent}1f, transparent 70%)` }}
      />

      {/* glow that blooms when the number lands */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -top-8 -left-8 size-56 sm:size-72"
        style={{ background: `radial-gradient(closest-side, ${accent}33, transparent)` }}
        initial={false}
        animate={{ opacity: done ? 1 : 0.25 }}
        transition={{ duration: 1.4, ease: EASE_OUT }}
      />

      {/* corner brackets */}
      {corners.map((c) => (
        <motion.span
          key={c.cls}
          aria-hidden
          variants={bracket}
          className={cn(
            'pointer-events-none absolute size-3 transition-[width,height] duration-500 ease-out-expo group-hover:size-5 sm:size-3.5',
            c.cls,
          )}
          style={{ borderColor: `${accent}b3`, ...c.origin }}
        />
      ))}

      {/* index + live LED */}
      <div aria-hidden className="relative flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.25em] text-haze uppercase">
        <span className="size-1 rounded-full" style={{ backgroundColor: accent }} />
        {pad2(index + 1)}
      </div>

      {/* the number */}
      <div className="relative mt-4 overflow-hidden py-1 sm:mt-5">
        <p className="font-display text-[clamp(2rem,9.6vw,3.3rem)] leading-none font-black tracking-[-0.04em] whitespace-nowrap sm:text-[clamp(2.8rem,6.2vw,4.3rem)] lg:text-[clamp(3rem,4.6vw,5rem)]">
          {stat.prefix && <Affix accent={accent}>{stat.prefix}</Affix>}
          <CountUp
            value={stat.value}
            decimals={stat.decimals}
            play={play}
            delay={countDelay}
            onDone={() => setDone(true)}
            numberClassName="bg-clip-text text-transparent"
            numberStyle={{ backgroundImage: `linear-gradient(180deg, #ffffff 0%, #d6e9ff 48%, ${accent} 140%)` }}
          />
          {stat.suffix && <Affix accent={accent}>{stat.suffix}</Affix>}
        </p>
        {done && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ skewX: -28 }}
            initial={{ x: '-130%' }}
            animate={{ x: '430%' }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
          />
        )}
      </div>

      {/* accent rule */}
      <motion.span
        aria-hidden
        variants={rule}
        className="relative mt-4 block h-0.5 w-12 sm:mt-5 sm:w-16"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)`, originX: 0 }}
      />

      <motion.div variants={caption} className="relative">
        <h3 className="mt-4 font-display text-[0.7rem] font-bold tracking-[0.1em] text-snow uppercase sm:text-sm">{stat.label}</h3>
        <p className="mt-1.5 text-[0.78rem] leading-snug text-mist sm:text-sm">{stat.detail}</p>
      </motion.div>
    </motion.li>
  )
}
