/**
 * ============================================================
 *  GAMES DATA
 *  ⚠ PLACEHOLDER CONTENT — replace these with your real titles.
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
export type Category = 'Action' | 'Arcade' | 'Strategy' | 'Casual'

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
  /** e.g. 4.8 */
  rating?: number
  /** e.g. '5M+' */
  players?: string
  features: string[]
  palette: ArtPalette
  motif: ArtMotif
  image?: string
  links: StoreLinks
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
  /** Wishlist / pre-register URL. If omitted, CTA scrolls to the contact form. */
  wishlistUrl?: string
}

export const categories: Category[] = ['Action', 'Arcade', 'Strategy', 'Casual']

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
    slug: 'voltrush',
    title: 'VOLTRUSH',
    tagline: 'Outrun the grid.',
    description:
      'A hyper-fast neon arcade racer built for one-thumb play. Drift through procedurally generated night highways, chain near-misses into overdrive and climb weekly global leagues.',
    genre: 'Arcade Racer',
    category: 'Arcade',
    platforms: ['ios', 'android'],
    engine: 'Unity',
    year: 2025,
    rating: 4.8,
    players: '5M+',
    features: ['60-second neon sprints', 'Ghost-race your friends', 'Weekly global leagues', '120 fps handling model'],
    palette: { from: '#12042e', via: '#6d1bff', to: '#ff2fb1', accent: '#2ee6ff' },
    motif: 'grid',
    links: { appStore: '#', playStore: '#', trailer: '#' },
    featured: true,
    badge: 'Featured',
  },
  {
    slug: 'sandstorm-protocol',
    title: 'Sandstorm Protocol',
    tagline: 'Five operators. One storm. No respawns.',
    description:
      'A tactical squad shooter set in a desert megacity swallowed by a permanent sandstorm. Plan, breach and extract — visibility is a weapon and every round is a story.',
    genre: 'Tactical Shooter',
    category: 'Action',
    platforms: ['pc'],
    engine: 'Unreal Engine',
    year: 2026,
    rating: 4.7,
    players: '800K+',
    features: ['5v5 tactical rounds', 'Dynamic storm visibility', 'Destructible cover', 'Ranked & custom lobbies'],
    palette: { from: '#1a0c03', via: '#a3470e', to: '#ffb347', accent: '#ffe1a6' },
    motif: 'dunes',
    links: { steam: '#', trailer: '#' },
    badge: 'New',
  },
  {
    slug: 'orbitfall',
    title: 'Orbitfall',
    tagline: 'Every run, a new galaxy.',
    description:
      'A gravity-bending space roguelite. Slingshot between planets, build absurd weapon synergies and survive a galaxy that rewrites itself every run.',
    genre: 'Space Roguelite',
    category: 'Action',
    platforms: ['pc', 'web'],
    engine: 'Unity',
    year: 2025,
    rating: 4.6,
    players: '1.2M+',
    features: ['Orbital physics combat', '200+ upgrade synergies', 'Daily seeded runs', 'Plays instantly in the browser'],
    palette: { from: '#050a2e', via: '#3b2bd6', to: '#2ee6ff', accent: '#d7ff3a' },
    motif: 'orbit',
    links: { steam: '#', web: '#', trailer: '#' },
  },
  {
    slug: 'falcon-rise',
    title: 'Falcon Rise',
    tagline: 'Own the skyline.',
    description:
      'Soar a falcon through a futuristic Dubai skyline in this endless flyer. Dive between towers, ride desert thermals at sunset and collect relics hidden above the clouds.',
    genre: 'Endless Flyer',
    category: 'Casual',
    platforms: ['ios', 'android'],
    engine: 'Unity',
    year: 2024,
    rating: 4.9,
    players: '3M+',
    features: ['One-touch flight', 'Day & night cycle', '40+ collectible falcons', 'Offline play'],
    palette: { from: '#06205a', via: '#0a7cff', to: '#ffd36b', accent: '#ffffff' },
    motif: 'skyline',
    links: { appStore: '#', playStore: '#' },
  },
  {
    slug: 'pixel-souq',
    title: 'Pixel Souq',
    tagline: 'Build the busiest market in town.',
    description:
      'A cozy market tycoon. Start with a single spice stall and grow a glowing night bazaar — trade, decorate, hire quirky merchants and welcome visitors from around the world.',
    genre: 'Cozy Tycoon',
    category: 'Casual',
    platforms: ['ios', 'android', 'web'],
    engine: 'Unity',
    year: 2024,
    rating: 4.7,
    players: '2M+',
    features: ['Relaxing idle progression', 'Deep decoration system', 'Seasonal festivals', 'Cross-save across devices'],
    palette: { from: '#04201f', via: '#0fb59a', to: '#ff8a5c', accent: '#fff1c9' },
    motif: 'waves',
    links: { appStore: '#', playStore: '#', web: '#' },
  },
  {
    slug: 'mirage-tactics',
    title: 'Mirage Tactics',
    tagline: 'Outthink. Outmanoeuvre. Outlast.',
    description:
      'Turn-based tactics on shifting hex battlefields where mirages hide real threats. Command a squad of rival heroes and bend illusions to your advantage.',
    genre: 'Turn-based Strategy',
    category: 'Strategy',
    platforms: ['pc', 'ios', 'android'],
    engine: 'Unity',
    year: 2025,
    rating: 4.8,
    players: '650K+',
    features: ['Illusion-based fog of war', '24 unique heroes', 'Async PvP', 'Cross-platform progression'],
    palette: { from: '#03130f', via: '#0d6b5e', to: '#7cffcb', accent: '#d7ff3a' },
    motif: 'hex',
    links: { steam: '#', appStore: '#', playStore: '#' },
  },
]

/* ---------------------------------------------------------------- */
/*  Upcoming games                                                  */
/* ---------------------------------------------------------------- */

export const upcomingGames: UpcomingGame[] = [
  {
    slug: 'kickoff-kings',
    title: 'Kickoff Kings',
    tagline: 'Street football. Stadium hype.',
    description:
      'Fast 3v3 arcade football with outrageous skill moves, rooftop pitches and live tournaments. Built for quick matches and big highlight reels.',
    genre: 'Arcade Sports',
    platforms: ['ios', 'android'],
    engine: 'Unity',
    stage: 'Beta',
    progress: 92,
    releaseDate: '2026-12-18T18:00:00+05:30',
    highlights: ['3v3 real-time matches', 'Trick-shot combo system', 'Live club tournaments'],
    palette: { from: '#03140c', via: '#0b8f3a', to: '#d7ff3a', accent: '#ffffff' },
    motif: 'pitch',
  },
  {
    slug: 'oasis-legends',
    title: 'Oasis Legends',
    tagline: 'A desert of myths awakens.',
    description:
      'An action RPG for mobile set in a mythic desert of hidden oases, ancient guardians and shifting sands. Assemble a party of legends and uncover the secret beneath the dunes.',
    genre: 'Action RPG',
    platforms: ['ios', 'android', 'pc'],
    engine: 'Unity',
    stage: 'Alpha',
    progress: 74,
    releaseDate: '2027-03-18T16:00:00+05:30',
    highlights: ['Real-time party combat', 'Hand-crafted open zones', 'Co-op raids with friends'],
    palette: { from: '#160a2c', via: '#7c5cff', to: '#ff9de2', accent: '#ffe9a8' },
    motif: 'rings',
  },
  {
    slug: 'project-zenith',
    title: 'Project ZENITH',
    tagline: 'Climb the last city on Earth.',
    description:
      'Our most ambitious project yet: a vertical open-world action adventure built in Unreal Engine 5. Scale a kilometre-high arcology, fight its factions and decide who rules the summit.',
    genre: 'Open-world Action',
    platforms: ['pc', 'console'],
    engine: 'Unreal Engine',
    stage: 'Production',
    progress: 46,
    releaseWindow: '2027',
    highlights: ['Seamless vertical open world', 'Parkour-driven traversal', 'Faction-shaped story'],
    palette: { from: '#020617', via: '#1e3a8a', to: '#38bdf8', accent: '#e0f2fe' },
    motif: 'shards',
  },
  {
    slug: 'shadowveil',
    title: 'Shadowveil',
    tagline: 'Fear what you cannot see.',
    description:
      'A VR stealth thriller where light is your only weapon and sound gives you away. Explore a haunted research outpost one heartbeat at a time.',
    genre: 'VR Stealth Thriller',
    platforms: ['xr', 'pc'],
    engine: 'Unreal Engine',
    stage: 'Pre-production',
    progress: 22,
    releaseWindow: '2028',
    highlights: ['Full-body VR stealth', 'Spatial audio hunting AI', 'Hand-tracked interactions'],
    palette: { from: '#05010a', via: '#4c0f5c', to: '#ff3d81', accent: '#ffd1e1' },
    motif: 'veil',
  },
]
