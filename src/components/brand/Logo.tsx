import { useId } from 'react'
import { motion, type Transition } from 'framer-motion'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'

/**
 * The Hizarc "H" mark, redrawn as vector geometry (traced from the master PNG).
 * viewBox 0 0 793 872. Four pieces:
 *  - left   (navy)  : left stem with the arrow notch
 *  - bar    (blue)  : the slanted crossbar
 *  - joint  (navy)  : small dark block where the bar meets the right stem
 *  - right  (blue)  : right stem
 * Exported so effects (hero parallax, preloader) can animate pieces individually.
 */
export type LogoPiece = { id: 'left' | 'bar' | 'joint' | 'right'; tone: 'dark' | 'blue'; points: string; from: { x: number; y: number } }

export const LOGO_VIEWBOX = '0 0 793 872'
export const LOGO_ASPECT = 793 / 872

export const LOGO_PIECES: LogoPiece[] = [
  { id: 'left', tone: 'dark', points: '0,4 219,138 219,415 134,459 219,507 219,860 0,719', from: { x: -160, y: 90 } },
  { id: 'bar', tone: 'blue', points: '257,237 578,410 578,620 257,444', from: { x: -220, y: -120 } },
  { id: 'joint', tone: 'dark', points: '578,412 685,470 685,805 578,741', from: { x: 120, y: 160 } },
  { id: 'right', tone: 'blue', points: '587,0 793,126 793,872 685,805 685,424 587,372', from: { x: 160, y: -90 } },
]

/** Original brand colours sampled from the logo. */
export const LOGO_COLORS = { dark: '#0a2257', blue: '#0a78ff' } as const

export type LogoVariant = 'color' | 'inverse' | 'gradient' | 'mono'

type LogoMarkProps = {
  /**
   * color    – original navy + blue (for light backgrounds)
   * inverse  – white + blue (default; for the dark site)
   * gradient – white→ice + blue→cyan gradients (hero / showpiece use)
   * mono     – everything currentColor
   */
  variant?: LogoVariant
  /** Play the "pieces assemble" animation on mount. */
  animate?: boolean
  /** Delay (s) before the assemble animation. */
  delay?: number
  className?: string
  /** Accessible label. Pass '' to mark decorative. */
  title?: string
}

export function LogoMark({ variant = 'inverse', animate = false, delay = 0, className, title = site.name }: LogoMarkProps) {
  const uid = useId().replace(/:/g, '')
  const darkFill =
    variant === 'color' ? LOGO_COLORS.dark : variant === 'inverse' ? '#f4f7ff' : variant === 'gradient' ? `url(#hz-d-${uid})` : 'currentColor'
  const blueFill =
    variant === 'color' || variant === 'inverse' ? LOGO_COLORS.blue : variant === 'gradient' ? `url(#hz-b-${uid})` : 'currentColor'

  const decorative = title === ''

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={cn('h-auto w-full overflow-visible', className)}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={`hz-d-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#9cc8ff" />
          </linearGradient>
          <linearGradient id={`hz-b-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a7cff" />
            <stop offset="100%" stopColor="#2ee6ff" />
          </linearGradient>
        </defs>
      )}
      {LOGO_PIECES.map((p, i) => {
        const fill = p.tone === 'dark' ? darkFill : blueFill
        if (!animate) return <polygon key={p.id} points={p.points} fill={fill} />
        const transition: Transition = { delay: delay + i * 0.09, type: 'spring', stiffness: 120, damping: 16, mass: 0.9 }
        return (
          <motion.polygon
            key={p.id}
            points={p.points}
            fill={fill}
            initial={{ opacity: 0, x: p.from.x, y: p.from.y }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ ...transition, opacity: { delay: delay + i * 0.09, duration: 0.35 } }}
          />
        )
      })}
    </svg>
  )
}

/** "HIZARC GAMES" text lockup (CSS-uppercased; the DOM text reads "HIZARC Games"). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display leading-none font-bold tracking-[0.04em] text-snow uppercase', className)}>
      HIZARC<span className="text-brand-400"> Games</span>
    </span>
  )
}

/** Mark + wordmark, for navbar / footer. */
export function Logo({ className, markClassName, wordmarkClassName }: { className?: string; markClassName?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('w-7', markClassName)} title="" />
      <Wordmark className={cn('text-[0.95rem]', wordmarkClassName)} />
    </span>
  )
}
