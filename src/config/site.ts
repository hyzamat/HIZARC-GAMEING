/**
 * ============================================================
 *  SITE CONFIG — edit this file to update company info,
 *  contact details, social links and headline numbers.
 * ============================================================
 */

export const site = {
  name: 'HIZARC Games',
  shortName: 'HIZARC',
  url: 'https://hizarc.com',
  parentName: 'HIZARC',
  parentUrl: 'https://dev.hizarc.com',
  tagline: 'We build worlds worth playing.',
  description:
    'HIZARC Games is the game studio of HIZARC in Calicut, Kerala, India. We make our own games: DEPTH CITY, an open-world city building game, and Born to Drive, an open-world driving game, for Android, iOS and PC.',

  /** Where the contact form + "email us" buttons point. */
  email: 'shainal@hizarc.com',
  location: 'Calicut, Kerala, India',
  /** Same place, with the city's official name (the footer address spells out both). */
  locationFull: 'Calicut (Kozhikode), Kerala, India',
  locationShort: 'Calicut, India',

  /**
   * Contact form delivery (only used when `googleForm.action` below is '').
   * Set VITE_CONTACT_ENDPOINT in a `.env` file to a form backend that accepts
   * JSON POSTs (e.g. Formspree: https://formspree.io/f/xxxxxx, Web3Forms, Getform, your own API).
   * If it's not set, the form falls back to opening the visitor's email app
   * with a pre-filled message to `email` above.
   */
  contactEndpoint: (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined) ?? '',

  /**
   * Google Form that receives contact-form messages (they appear in the form's Responses tab,
   * or a linked Google Sheet). Takes priority over `contactEndpoint`; set `action` to '' to turn it off.
   * Entry ids come from the form's public page (view source → `entry.<number>`) and survive renaming
   * the questions. The form must accept responses from anyone (no sign-in required).
   */
  googleForm: {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSdMMi6ZepSKeiaxIA2JG8Wm3vteSkFB4BnZXrZwdIBROMtpGw/formResponse',
    fields: {
      /** Short answer — "Operative Alias" */
      name: 'entry.1192359696',
      /** Short answer — "Comms Link Frequency" */
      email: 'entry.1865750333',
      /** Paragraph — "Encrypted Payload": topic, company and the message itself */
      message: 'entry.1660048100',
      /** Date (no time) — "Authorization Timestamp": the day it was sent, studio time */
      date: 'entry.2075667364',
    },
  },
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
  { key: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/channel/UCKEboiAx3RlNnGgybci8lng' },
  { key: 'instagram', label: 'Instagram', href: '#' },
  { key: 'tiktok', label: 'TikTok', href: '#' },
  { key: 'linkedin', label: 'LinkedIn', href: '#' },
]

/**
 * Headline numbers for the stats band. Only true facts: update them when a game ships
 * (players, countries and ratings can come once there are real numbers to show).
 * `value` is animated (counted up); `prefix` / `suffix` are static.
 */
export const stats: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string; detail: string }[] = [
  { value: 2, label: 'Games coming soon', detail: 'DEPTH CITY and Born to Drive' },
  { value: 3, label: 'Games in development', detail: 'DEPTH CITY 2, Born to Drive 2 and Red Earth Outlaw' },
  { value: 3, label: 'Platforms', detail: 'Android, iOS and PC' },
  { value: 170, suffix: '+', label: 'Buildings in DEPTH CITY', detail: 'in 11 categories, across 125 city levels' },
]

/** Reasons people reach out — used by the contact form topic chips. */
export const contactTopics = ['Business', 'Press & Media', 'Careers', 'Player Support'] as const

export type ContactTopic = (typeof contactTopics)[number]

/** Engines & platforms we build for (used in hero HUD, ticker and studio sections). */
export const engines = ['Unity', 'Unreal Engine'] as const
export const platformsWeBuildFor = ['iOS', 'Android', 'PC', 'Web / WebGL', 'Console', 'AR / VR'] as const
