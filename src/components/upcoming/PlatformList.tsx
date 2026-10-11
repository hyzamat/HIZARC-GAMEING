import type { LucideIcon } from 'lucide-react'
import { platformIcons } from '@/components/ui/icons'
import { platformLabels, type Platform } from '@/data/games'
import { cn } from '@/lib/cn'

/** Platforms that share a glyph collapse into one entry: iOS + Android → "iOS / Android". */
function groupPlatforms(platforms: Platform[]) {
  const groups = new Map<LucideIcon, string[]>()
  for (const p of platforms) {
    const Icon = platformIcons[p]
    groups.set(Icon, [...(groups.get(Icon) ?? []), platformLabels[p]])
  }
  return [...groups].map(([Icon, labels]) => ({ Icon, label: labels.join(' / ') }))
}

type PlatformListProps = {
  platforms: Platform[]
  /** Show names next to the glyphs from this breakpoint up (names are always available to screen readers). */
  labels?: 'never' | 'lg' | 'always'
  className?: string
}

/** Compact platform glyph row for HUD panels. */
export function PlatformList({ platforms, labels = 'never', className }: PlatformListProps) {
  return (
    <ul aria-label="Platforms" className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-1.5', className)}>
      {groupPlatforms(platforms).map(({ Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5" title={label}>
          <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
          <span
            className={cn(
              'font-mono text-[0.64rem] tracking-[0.16em] whitespace-nowrap uppercase',
              labels === 'never' && 'sr-only',
              labels === 'lg' && 'max-lg:sr-only',
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}
