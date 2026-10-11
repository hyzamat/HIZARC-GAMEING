import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type TagTone = 'default' | 'brand' | 'cyan' | 'volt' | 'violet'

const tones: Record<TagTone, string> = {
  default: 'bg-white/[0.06] text-mist ring-white/10',
  brand: 'bg-brand/15 text-brand-300 ring-brand/30',
  cyan: 'bg-cyan/10 text-cyan ring-cyan/30',
  volt: 'bg-volt/12 text-volt ring-volt/35',
  violet: 'bg-violet/15 text-[#b8a8ff] ring-violet/35',
}

/** Small HUD-style mono label, e.g. genre, platform, stage. */
export function Tag({ children, tone = 'default', className, dot = false }: { children: ReactNode; tone?: TagTone; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-mono text-[0.66rem] font-medium tracking-[0.12em] whitespace-nowrap uppercase ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 animate-pulse-soft rounded-full bg-current" />}
      {children}
    </span>
  )
}
