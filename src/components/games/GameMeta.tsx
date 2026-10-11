import { Star, type LucideIcon } from 'lucide-react'
import { platformIcons } from '@/components/ui/icons'
import { platformLabels, type Platform } from '@/data/games'
import { cn } from '@/lib/cn'

/** "iOS, Android, PC" */
export function platformText(platforms: Platform[]) {
  return platforms.map((p) => platformLabels[p]).join(', ')
}

/** Group platforms that share a glyph (iOS + Android → one phone icon labelled "iOS / Android"). */
function groupPlatforms(platforms: Platform[]) {
  const groups = new Map<LucideIcon, string[]>()
  for (const p of platforms) {
    const Icon = platformIcons[p]
    groups.set(Icon, [...(groups.get(Icon) ?? []), platformLabels[p]])
  }
  return [...groups].map(([Icon, labels]) => ({ Icon, label: labels.join(' / ') }))
}

type PlatformIconsProps = {
  platforms: Platform[]
  /** Show the platform names next to the glyphs (default: icons only, names for screen readers). */
  showLabels?: boolean
  className?: string
  iconClassName?: string
}

/** Compact platform glyph row. Names are always available to assistive tech. */
export function PlatformIcons({ platforms, showLabels = false, className, iconClassName }: PlatformIconsProps) {
  const groups = groupPlatforms(platforms)
  return (
    <ul aria-label="Platforms" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5', className)}>
      {groups.map(({ Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <Icon aria-hidden className={cn('size-4 shrink-0', iconClassName)} strokeWidth={1.8} />
          <span className={showLabels ? undefined : 'sr-only'}>{label}</span>
        </li>
      ))}
    </ul>
  )
}

type RatingProps = {
  rating?: number
  players?: string
  className?: string
}

/** ★ 4.8 │ 5M+ players */
export function Rating({ rating, players, className }: RatingProps) {
  if (rating == null && !players) return null
  return (
    <p className={cn('inline-flex items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.08em] whitespace-nowrap text-mist', className)}>
      {rating != null && (
        <span className="inline-flex items-center gap-1 font-semibold text-snow">
          <Star aria-hidden className="size-3.5 fill-volt text-volt" strokeWidth={1.5} />
          <span className="sr-only">Rated </span>
          {rating.toFixed(1)}
          <span className="sr-only"> out of 5</span>
        </span>
      )}
      {rating != null && players && <span aria-hidden className="h-3 w-px bg-line-strong" />}
      {players && (
        <span>
          {players} <span className="text-haze">players</span>
        </span>
      )}
    </p>
  )
}
