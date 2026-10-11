import type { MouseEvent } from 'react'
import { socials } from '@/config/site'

/** Social profiles with a real (non-empty) href. Placeholder '#' links still render. */
export const visibleSocials = socials.filter((s) => s.href.trim() !== '')

/** Open absolute http(s) links in a new tab; leave in-page / mailto links alone. */
export function externalProps(href: string) {
  return /^https?:\/\//.test(href) ? ({ target: '_blank', rel: 'noopener noreferrer' } as const) : {}
}

/**
 * Placeholder '#' links are rendered but kept inert — otherwise the global
 * anchor handler would smooth-scroll the page to the top on every tap.
 */
export function inertIfPlaceholder(href: string) {
  return href.trim() === '#' ? { onClick: (e: MouseEvent<HTMLElement>) => e.preventDefault() } : {}
}

/** "https://hizarc.com/" → "hizarc.com" */
export function displayHost(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/** Zero-based list index → HUD number: 0 → "01", 9 → "10". */
export function navIndex(i: number) {
  return String(i + 1).padStart(2, '0')
}
