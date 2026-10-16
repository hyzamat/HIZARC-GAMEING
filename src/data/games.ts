/**
 * ============================================================
 *  GAMES DATA — HIZARC Games' own titles (updated 2026-10-17).
 *
 *  Key art: every game gets procedural, animated key art generated
 *  from `palette` + `motif`. When you have real art, drop it in
 *  /public/games/ and set `image: '/games/your-file.webp'`
 *  (16:10 or 16:9, ~1600px wide works best).
 *
 *  Store links: leave a link out (or '') to hide that button.
 * ============================================================
 */

export type Platform = 'ios' | 'android' | 'pc' | 'web' | 'console' | 'xr'
export type Engine = 'Unity' | 'Unreal Engine'
export type Category = 'Action' | 'Arcade' | 'Strategy' | 'Simulation' | 'Casual'

/** Procedural key-art patterns (see components/art/GameArt.tsx). */
export type ArtMotif = 'grid' | 'dunes' | 'orbit' | 'skyline' | 'waves' | 'hex' | 'shards' | 'rings' | 'pitch' | 'veil'

export interface ArtPalette {
  /** darkest background colour */
  from: string
  /** mid tone */
  via: string
  /** brightest / glow colour */
  to: string
  /** small highlight colour for details */
  accent: string
}

export interface StoreLinks {
  /** The game's own website (a normal, crawlable link). */
  site?: string
  appStore?: string
  playStore?: string
  steam?: string
  web?: string
  trailer?: string
}

export interface Game {
  slug: string
  title: string
  tagline: string
  description: string
  genre: string
  category: Category
  platforms: Platform[]
  engine: Engine
  year: number
  /** Not out yet: shown instead of the release year, e.g. 'Coming soon'. */
  releaseStatus?: string
  /** e.g. 4.8 */
  rating?: number
  /** e.g. '5M+' */
  players?: string
  features: string[]
  palette: ArtPalette
  motif: ArtMotif
  image?: string
  /** Describes `image` for screen readers and image search. */
  imageAlt?: string
  links: StoreLinks
  /** The game's own social profiles (e.g. its Instagram); they become the VideoGame's sameAs. */
  profiles?: string[]
  /** Shown big in the spotlight slot. Exactly one game should be featured. */
  featured?: boolean
  /** Small badge, e.g. 'New', 'Update', 'Award winner' */
  badge?: string
}

export type DevStage = 'Concept' | 'Pre-production' | 'Production' | 'Alpha' | 'Beta' | 'Soft launch'

export interface UpcomingGame {
  slug: string
  title: string
  tagline: string
  description: string
  genre: string
  platforms: Platform[]
  engine: Engine
  stage: DevStage
  /** Development progress 0–100 (drives the progress bar). */
  progress: number
  /**
   * Exact launch moment (ISO 8601 with timezone) → shows a live countdown.
   * Omit it and set `releaseWindow` instead for vague dates.
   */
  releaseDate?: string
  /** e.g. 'Q3 2027' or '2028' — shown when there is no exact date. */
  releaseWindow?: string
  highlights: string[]
  palette: ArtPalette
  motif: ArtMotif
  image?: string
  /** Describes `image` for screen readers and image search. */
  imageAlt?: string
  /** Wishlist / pre-register URL. If omitted, CTA scrolls to the contact form. */
  wishlistUrl?: string
}

export const categories: Category[] = ['Action', 'Arcade', 'Strategy', 'Simulation', 'Casual']

export const platformLabels: Record<Platform, string> = {
  ios: 'iOS',
  android: 'Android',
  pc: 'PC',
  web: 'Web',
  console: 'Console',
  xr: 'AR / VR',
}

/* ---------------------------------------------------------------- */
/*  Released games                                                  */
/* ---------------------------------------------------------------- */

export const games: Game[] = [
  {
    slug: 'depth-city',
    title: 'DEPTH CITY',
    tagline: 'Open-world city building game with an avatar Mayor mode and war — Android, iOS & PC. Coming soon.',
    description:
      'DEPTH CITY is an open-world city building game with a real economy, a living world and a war to win. Build your island city, step into it as the Mayor and walk, drive and fly through the streets you built, and defend it when rival nations come from the sea.',
    genre: 'Open-world City Builder',
    category: 'Strategy',
    platforms: ['android', 'ios', 'pc'],
    engine: 'Unity',
    year: 2026,
    releaseStatus: 'Coming soon',
    features: ['Build from above, then walk your streets', 'Live in your city as the Mayor', 'War against nine rival nations', '170+ buildings, 125 city levels'],
    palette: { from: '#04101f', via: '#0e5aa8', to: '#f2b544', accent: '#9be7ff' },
    motif: 'skyline',
    image: '/games/depth-city.webp',
    imageAlt: 'DEPTH CITY key art: an island city of glass skyscrapers, homes and a Mega Mall beside the sea',
    links: { site: 'https://depthcity.hizarc.com/' },
    profiles: ['https://www.instagram.com/depthcitygame/'],
    featured: true,
    badge: 'Coming soon',
  },
  {
    slug: 'born-to-drive',
    title: 'Born to Drive',
    tagline: 'Explore. Drive. Discover.',
    description:
      "A realistic open-world driving game set on the hill roads of Kerala's Western Ghats. Drive cars, buses, trucks and off-roaders with real physics and damage, through tropical valleys and hairpin ghat roads, from the cockpit or the chase cam.",
    genre: 'Open-world Driving',
    category: 'Simulation',
    platforms: ['android', 'ios', 'pc'],
    engine: 'Unity',
    year: 2026,
    releaseStatus: 'Coming soon',
    features: ['Cars, buses, trucks and off-roaders', 'Realistic driving physics and damage', 'Real Kerala ghat roads, built from real terrain', 'Cockpit, chase, hood and cinematic cameras'],
    palette: { from: '#0b1a10', via: '#1f7a4a', to: '#ffb347', accent: '#ffe9b0' },
    motif: 'dunes',
    image: '/games/born-to-drive.webp',
    imageAlt: 'Born to Drive key art: a white 4x4 on a wet hill road above a tropical valley at sunrise',
    links: {},
    badge: 'Coming soon',
  },
]

/* ---------------------------------------------------------------- */
/*  Upcoming games                                                  */
/* ---------------------------------------------------------------- */

export const upcomingGames: UpcomingGame[] = [
  {
    slug: 'depth-city-2',
    title: 'DEPTH CITY 2',
    tagline: 'The next city is bigger.',
    description: 'The sequel to DEPTH CITY: build a city, live in it as the Mayor and defend it, in a bigger open world.',
    genre: 'Open-world City Builder',
    platforms: ['android', 'ios', 'pc'],
    engine: 'Unity',
    stage: 'Concept',
    progress: 8,
    releaseWindow: 'TBA',
    highlights: ['Sequel to DEPTH CITY', 'Build, live as the Mayor, defend', 'Android, iOS & PC'],
    palette: { from: '#04101f', via: '#0e5aa8', to: '#f2b544', accent: '#9be7ff' },
    motif: 'skyline',
  },
  {
    slug: 'born-to-drive-2',
    title: 'Born to Drive 2',
    tagline: 'More roads. More machines.',
    description: 'The next Born to Drive: more vehicles, more real roads and a bigger open world to drive.',
    genre: 'Open-world Driving',
    platforms: ['android', 'ios', 'pc'],
    engine: 'Unity',
    stage: 'Concept',
    progress: 5,
    releaseWindow: 'TBA',
    highlights: ['Sequel to Born to Drive', 'More vehicles and routes', 'Realistic driving physics'],
    palette: { from: '#0b1a10', via: '#1f7a4a', to: '#ffb347', accent: '#ffe9b0' },
    motif: 'waves',
  },
  {
    slug: 'red-earth-outlaw',
    title: 'Red Earth Outlaw: Western Ghats',
    tagline: 'REO: Western Ghats',
    description: "An open-world outlaw adventure set in the red-earth hills, forests and ghat roads of India's Western Ghats.",
    genre: 'Open-world Action',
    platforms: ['android', 'ios', 'pc'],
    engine: 'Unity',
    stage: 'Concept',
    progress: 5,
    releaseWindow: 'TBA',
    highlights: ['Open world set in the Western Ghats', 'Red-earth hills, forests and ghat roads', 'Android, iOS & PC'],
    palette: { from: '#1a0703', via: '#9a2f12', to: '#ff7a3d', accent: '#ffd7a8' },
    motif: 'shards',
    image: '/games/red-earth-outlaw.webp',
    imageAlt: 'Red Earth Outlaw: Western Ghats key art: an outlaw with a rifle looks over misty Western Ghats valleys at sunrise beside a painted logging truck',
  },
]
