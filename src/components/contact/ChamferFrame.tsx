import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * clip-path for a 1px chamfered *ring* (outer outline minus inner outline, evenodd).
 * The inner cut shrinks by (2 − √2)·w so the diagonal edges are exactly as thick as the straight ones.
 */
export function chamferRing(cut: number, w = 1) {
  const ci = Math.max(0, cut - (2 - Math.SQRT2) * w)
  const a = w + ci
  const outer = `${cut}px 0, 100% 0, 100% calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, 0 100%, 0 ${cut}px, ${cut}px 0`
  const inner = `${a}px ${w}px, calc(100% - ${w}px) ${w}px, calc(100% - ${w}px) calc(100% - ${a}px), calc(100% - ${a}px) calc(100% - ${w}px), ${w}px calc(100% - ${w}px), ${w}px ${a}px, ${a}px ${w}px`
  return `polygon(evenodd, ${outer}, ${inner})`
}

type ChamferFrameProps = {
  children: ReactNode
  /** Corner cut in px (top-left + bottom-right), echoing the logo's angled cuts. */
  cut?: number
  /** Classes for the surface (background, padding, layout). The surface is clipped. */
  className?: string
  /** Classes for the 1px border ring (a background — colours or gradients). */
  borderClassName?: string
  /** Optional second ring painted over the border, e.g. `opacity-0 group-hover:opacity-100 bg-gradient-to-r …`. */
  accentClassName?: string
  /** Classes for the unclipped outer wrapper (sizing, `group`, grid placement). */
  wrapperClassName?: string
}

/**
 * Chamfered surface with a crisp 1px border that also follows the diagonal cuts.
 * The wrapper is NOT clipped, so glows, toasts and HUD brackets can sit outside it.
 */
export function ChamferFrame({ children, cut = 14, className, borderClassName, accentClassName, wrapperClassName }: ChamferFrameProps) {
  const ring = chamferRing(cut)
  return (
    <div className={cn('relative', wrapperClassName)} style={{ '--cut': `${cut}px` } as CSSProperties}>
      <div className={cn('chamfer relative h-full', className)}>{children}</div>
      <span aria-hidden className={cn('pointer-events-none absolute inset-0 bg-white/[0.12]', borderClassName)} style={{ clipPath: ring }} />
      {accentClassName && <span aria-hidden className={cn('pointer-events-none absolute inset-0', accentClassName)} style={{ clipPath: ring }} />}
    </div>
  )
}
