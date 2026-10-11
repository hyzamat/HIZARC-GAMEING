import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Chunky arcade keycap, e.g. <Keycap>Space</Keycap>. */
export function Keycap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-b-[3px] border-white/15 border-b-white/30 bg-ink-700 px-1.5 font-mono text-[0.62rem] leading-none font-semibold tracking-[0.08em] text-snow uppercase',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
