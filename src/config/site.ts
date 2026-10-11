/**
 * ============================================================
 *  SITE CONFIG — edit this file to update company info,
 *  contact details, social links and headline numbers.
 * ============================================================
 */

export const site = {
  name: 'Hizarc Games',
  shortName: 'HIZARC',
  url: 'https://hizarc.com',
  parentName: 'HIZARC',
  parentUrl: 'https://dev.hizarc.com',
  tagline: 'We build worlds worth playing.',
  description:
    'Hizarc Games is the game studio of HIZARC. From Calicut, Kerala, India, we craft original games for mobile, PC, web and XR in Unity and Unreal Engine, and co-develop with brands and publishers worldwide.',

  /** Where the contact form + "email us" buttons point. */
  email: 'shainal@hizarc.com',
  location: 'Calicut, Kerala, India',
  locationShort: 'Calicut, India',

  /**
   * Contact form delivery.
   * Set VITE_CONTACT_ENDPOINT in a `.env` file to a form backend that accepts
   * JSON POSTs (e.g. Formspree: https://formspree.io/f/xxxxxx, Web3Forms, Getform, your own API).
   * If it's not set, the form falls back to opening the visitor's email app
   * with a pre-filled message to `email` above.
   */
  contactEndpoint: (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined) ?? '',
} as const

export type NavItem = { label: string; href: `#${string}` }

export const nav: NavItem[] = [
  { label: 'Games', href: '#games' },
  { label: 'Upcoming', href: '#upcoming' },
  { label: 'Arcade', href: '#arcade' },
  { label: 'Studio', href: '#studio' },
  { label: 'Contact', href: '#contact' },
]

export type SocialKey = 'discord' | 'x' | 'youtube' | 'instagram' | 'tiktok' | 'linkedin'

/**
 * Social profiles. Replace '#' with your real profile URLs.
 * Any entry with an empty href ('') is hidden automatically.
 */
export const socials: { key: SocialKey; label: string; href: string }[] = [
  { key: 'discord', label: 'Discord', href: '#' },
  { key: 'x', label: 'X (Twitter)', href: '#' },
  { key: 'youtube', label: 'YouTube', href: '#' },
  { key: 'instagram', label: 'Instagram', href: '#' },
  { key: 'tiktok', label: 'TikTok', href: '#' },
  { key: 'linkedin', label: 'LinkedIn', href: '#' },
]

/**
 * Headline numbers for the stats band.
 * PLACEHOLDER VALUES — replace with your real numbers before launch.
 * `value` is animated (counted up); `prefix` / `suffix` are static.
 */
export const stats: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string; detail: string }[] = [
  { value: 12, suffix: 'M+', label: 'Players reached', detail: 'across every title we have shipped' },
  { value: 140, suffix: '+', label: 'Countries', detail: 'with active daily players' },
  { value: 4.8, decimals: 1, suffix: '★', label: 'Average rating', detail: 'on the App Store & Google Play' },
  { value: 30, suffix: '+', label: 'Projects delivered', detail: 'original IP and partner games' },
]

/** Reasons people reach out — used by the contact form topic chips. */
export const contactTopics = [
  'Partnership',
  'Publishing',
  'Co-development',
  'Press & Media',
  'Careers',
  'Player Support',
] as const

export type ContactTopic = (typeof contactTopics)[number]

/** Engines & platforms we build for (used in hero HUD, ticker and studio sections). */
export const engines = ['Unity', 'Unreal Engine'] as const
export const platformsWeBuildFor = ['iOS', 'Android', 'PC', 'Web / WebGL', 'Console', 'AR / VR'] as const
