import { Globe, Play } from 'lucide-react'
import type { ComponentType, MouseEvent } from 'react'
import { AppleGlyph, PlayGlyph, SteamGlyph } from '@/components/ui/icons'
import type { StoreLinks } from '@/data/games'
import { cn } from '@/lib/cn'
import { isExternalHref, isPlaceholderHref } from './shared'

type StoreDef = {
  key: keyof StoreLinks
  kicker: string
  label: string
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

/** Display order of the store buttons. */
const STORES: StoreDef[] = [
  { key: 'site', kicker: 'Visit the', label: 'Official site', Icon: Globe },
  { key: 'appStore', kicker: 'Download on the', label: 'App Store', Icon: AppleGlyph },
  { key: 'playStore', kicker: 'Get it on', label: 'Google Play', Icon: PlayGlyph },
  { key: 'steam', kicker: 'Get it on', label: 'Steam', Icon: SteamGlyph },
  { key: 'web', kicker: 'Instant, no install', label: 'Play on web', Icon: Globe },
  { key: 'trailer', kicker: 'See it in motion', label: 'Watch trailer', Icon: Play },
]

/** Store entries that actually have a link (empty / missing links are hidden). */
export function storeEntries(links: StoreLinks) {
  return STORES.flatMap((s) => {
    const href = links[s.key]?.trim()
    return href ? [{ ...s, href }] : []
  })
}

type StoreButtonsProps = {
  links: StoreLinks
  /** Game title — appended for screen readers so every link is unambiguous. */
  title: string
  /** Class for each button (e.g. `w-full` inside a grid). */
  itemClassName?: string
}

/**
 * Store badges rendered as a fragment so the parent controls the layout
 * (grid on phones, wrapping row on larger screens).
 */
export function StoreButtons({ links, title, itemClassName }: StoreButtonsProps) {
  return (
    <>
      {storeEntries(links).map(({ key, kicker, label, Icon, href }) => {
        const external = isExternalHref(href)
        // Placeholder '#' links must not jump the page to the top.
        const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
          if (isPlaceholderHref(href)) e.preventDefault()
        }
        return (
          <a
            key={key}
            href={href}
            onClick={onClick}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={cn(
              'group/store relative inline-flex h-12 min-w-0 items-center gap-3 overflow-hidden bg-white/[0.05] px-4 text-left text-snow ring-1 ring-white/12 transition-[background-color,box-shadow] duration-300 ring-inset chamfer-sm hover:bg-white/[0.1] hover:ring-white/30',
              itemClassName,
            )}
          >
            {/* sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[28deg] bg-white/15 opacity-0 transition-all duration-700 ease-out group-hover/store:left-[120%] group-hover/store:opacity-100"
            />
            <Icon aria-hidden className="relative size-5 shrink-0" />
            <span className="relative flex min-w-0 flex-col leading-none">
              <span className="truncate font-mono text-[0.55rem] tracking-[0.16em] text-haze uppercase">{kicker}</span>{' '}
              <span className="mt-1 truncate font-display text-[0.74rem] font-semibold tracking-[0.02em]">
                {label}
                <span className="sr-only"> — {title}</span>
              </span>
            </span>
          </a>
        )
      })}
    </>
  )
}
