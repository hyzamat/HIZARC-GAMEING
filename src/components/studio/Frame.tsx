import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type FrameProps = {
  children: ReactNode
  /** Chamfer size of the outer edge in px. */
  cut?: number
  /** Classes for the 1px frame itself (its background IS the border colour / gradient). */
  frameClassName?: string
  /** Classes for the inner surface. */
  className?: string
  /** Layer rendered between the frame and the surface — visible through the 1px border (e.g. a cursor spotlight). */
  behind?: ReactNode
  /** Classes for the outermost wrapper (sizing, grid placement). */
  outerClassName?: string
}

/**
 * Chamfered panel with a real 1px border. `clip-path` cuts off box-shadows and borders on the
 * diagonal corners, so the border is a 1px gradient "frame" showing around a slightly smaller
 * chamfered surface — the same trick the game cards use.
 */
export function Frame({ children, cut = 20, frameClassName = 'bg-white/10', className, behind, outerClassName }: FrameProps) {
  return (
    <div className={cn('relative p-px chamfer', frameClassName, outerClassName)} style={{ '--cut': `${cut}px` } as CSSProperties}>
      {behind}
      <div className={cn('relative h-full chamfer', className)} style={{ '--cut': `${cut - 0.5}px` } as CSSProperties}>
        {children}
      </div>
    </div>
  )
}
