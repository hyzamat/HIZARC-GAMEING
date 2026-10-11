import { LOGO_ASPECT, LOGO_PIECES } from '@/components/brand/Logo'

/**
 * HIZARC DASH — tuning constants.
 * All world values are in "game units". The gameplay band (WORLD_H) is always fully
 * visible; wider/taller canvases simply reveal more track ahead or more sky above.
 */

/* ---------------------------------------------------------------- */
/*  Timing                                                          */
/* ---------------------------------------------------------------- */

/** Fixed simulation step (120 Hz) — plays identically on 60 / 90 / 120 / 144 Hz screens. */
export const STEP = 1 / 120
/** Longest frame we will ever simulate (tab switches, GC pauses). */
export const MAX_FRAME = 0.1
/** Safety cap on simulation steps per rendered frame. */
export const MAX_STEPS = 14

/* ---------------------------------------------------------------- */
/*  World                                                           */
/* ---------------------------------------------------------------- */

/** Height of the gameplay band (sky above the floor line + the visible floor). */
export const WORLD_H = 360
/** Minimum floor depth below the run line (perspective grid lives here). */
export const FLOOR_DEPTH = 64
/**
 * Narrowest view in units — phones zoom out instead of hiding the track ahead.
 * 440 keeps ~0.5 s of warning even at top speed on a 360px-wide screen (380 gave a thumb ~0.4 s).
 */
export const MIN_VIEW_W = 440
/** The Hizarc slant: diagonal cuts rise 0.54 per 1 (≈28°). */
export const SLANT = 0.54

/* ---------------------------------------------------------------- */
/*  Player                                                          */
/* ---------------------------------------------------------------- */

export const PLAYER_H = 30
export const PLAYER_W = PLAYER_H * LOGO_ASPECT

/** Logo viewBox size — the runner is the Hizarc mark scaled to PLAYER_H. */
export const LOGO_W = 793
export const LOGO_H = 872

/**
 * Where each logo piece sits relative to the mark's centre, in game units (y up).
 * When the runner crashes the four pieces fly apart from exactly these spots.
 */
export const PIECE_OFFSETS: readonly { x: number; y: number }[] = LOGO_PIECES.map((p) => {
  const nums = p.points.split(/[\s,]+/).map(Number)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < nums.length; i += 2) {
    minX = Math.min(minX, nums[i])
    maxX = Math.max(maxX, nums[i])
    minY = Math.min(minY, nums[i + 1])
    maxY = Math.max(maxY, nums[i + 1])
  }
  const k = PLAYER_H / LOGO_H
  return { x: ((minX + maxX) / 2 - LOGO_W / 2) * k, y: (LOGO_H / 2 - (minY + maxY) / 2) * k }
})
/** Half-width of the "feet" used for floor support (forgiving gap edges). */
export const FOOT = 7
export const GRAVITY = 2600
export const JUMP_V = 820
export const AIR_JUMP_V = 720
/** Extra gravity while rising with the button released → variable jump height. */
export const CUT_GRAVITY = 2.6
/** Slightly heavier fall for a snappy arc. */
export const FALL_GRAVITY = 1.2
export const MAX_FALL = 1500
export const COYOTE_TIME = 0.1
export const BUFFER_TIME = 0.11
/** How far below the floor line we still snap up onto a ledge. */
export const LEDGE_SNAP = 8
/** Falling this deep into a gap ends the run. */
export const PIT_DEPTH = 46

/* ---------------------------------------------------------------- */
/*  Pace & scoring                                                  */
/* ---------------------------------------------------------------- */

export const SPEED_BASE = 300
export const SPEED_MAX = 690
/** Time constant of the speed curve (s): ~x1.6 at 30s, ~x1.9 at 60s, ~x2.1 at 90s. */
export const SPEED_TAU = 48
/** Title-screen "attract mode" pace. */
export const ATTRACT_SPEED = 250
export const SCORE_PER_UNIT = 0.1
export const ORB_SCORE = 25
export const OVERDRIVE_ORB_SCORE = 100
export const SHATTER_SCORE = 50
/** Overdrive charge per volt orb (~14 orbs fill the meter). */
export const ORB_CHARGE = 0.072
export const OVERDRIVE_TIME = 4.5
export const OVERDRIVE_SPEED = 1.35
export const OVERDRIVE_MULT = 2
/** Ghost frames after overdrive ends, so it never ends in an unfair crash. */
export const GRACE_TIME = 0.9
/** Slow-mo crash beat before the game-over screen. */
export const DYING_TIME = 1.05
export const RESUME_COUNTDOWN = 1.5
export const METER_SEGMENTS = 8

/* ---------------------------------------------------------------- */
/*  Look                                                            */
/* ---------------------------------------------------------------- */

/** Brand palette (mirrors the tokens in src/index.css). */
export const C = {
  ink950: '#03050c',
  ink900: '#070b17',
  ink800: '#0c1326',
  ink700: '#131c36',
  ink600: '#1c2747',
  brand: '#0a7cff',
  brand300: '#7db9ff',
  brand400: '#3d9bff',
  cyan: '#2ee6ff',
  violet: '#7c5cff',
  violetSoft: '#b8a8ff',
  volt: '#d7ff3a',
  ember: '#ff5c39',
  snow: '#f4f7ff',
  mist: '#aab5d3',
  haze: '#6c789c',
} as const

export const FONT_DISPLAY = '"Unbounded Variable", "Unbounded", ui-sans-serif, system-ui, sans-serif'
export const FONT_MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'

/** Zero-padded arcade score, e.g. 4210 → "004210". */
export function padScore(n: number, digits = 6) {
  return Math.max(0, Math.floor(n)).toString().padStart(digits, '0')
}
