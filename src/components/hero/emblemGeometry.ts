import { LOGO_PIECES, type LogoPiece } from '@/components/brand/Logo'

/**
 * Pre-computed geometry for the 3D hero emblem.
 *
 * Each flat logo piece is "extruded" along a fixed vector (down-right, as if
 * lit from the top-left): we keep the front face, a back face, and only the
 * side quads that face the extrusion direction, each flat-shaded by its
 * normal. Pure math, computed once at module load — the SVG then paints a
 * solid slab per piece with zero runtime cost.
 */

type Pt = [number, number]
type Rgb = [number, number, number]

export type EmblemSide = { points: string; fill: string }

export type EmblemPiece = LogoPiece & {
  face: string
  back: string
  backFill: string
  sides: EmblemSide[]
  /** Piece centre as % of the logo box — used as its transform-origin. */
  origin: string
  /** Pointer-parallax depth multiplier (bigger = feels closer). */
  depth: number
}

export const LOGO_W = 793
export const LOGO_H = 872

/** Extrusion vector in viewBox units (≈ 2% of the mark's width). */
const EXTRUDE: Pt = [13, 19]

const DEPTH: Record<LogoPiece['id'], number> = { left: 0.6, bar: 1.4, joint: 1, right: 0.8 }

/** Side colours: [shadowed, lit] per tone, plus the back face. */
const SIDE: Record<LogoPiece['tone'], { dark: string; lit: string; back: string }> = {
  dark: { dark: '#22396b', lit: '#8eaee0', back: '#132449' },
  blue: { dark: '#03286b', lit: '#2f8cff', back: '#021b4a' },
}

const parse = (s: string): Pt[] =>
  s
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number) as Pt)

const fmt = (pts: Pt[]) => pts.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' ')

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpHex(a: string, b: string, t: number) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t))
  return `rgb(${c[0]} ${c[1]} ${c[2]})`
}

function extrude(piece: LogoPiece): EmblemPiece {
  const pts = parse(piece.points)
  const [ex, ey] = EXTRUDE
  const elen = Math.hypot(ex, ey)

  // Winding (y-down coords): positive shoelace sum = visually clockwise.
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  }
  const cw = area > 0

  const tone = SIDE[piece.tone]
  const sides: EmblemSide[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = (cw ? dy : -dy) / len
    const ny = (cw ? -dx : dx) / len
    // Only the walls facing the extrusion direction are visible.
    if ((nx * ex + ny * ey) / elen <= 0.02) continue
    // Walls facing right catch the light, walls facing down fall into shadow.
    const light = Math.min(1, Math.max(0, 0.5 + 0.55 * nx - 0.25 * ny))
    sides.push({
      points: fmt([a, b, [b[0] + ex, b[1] + ey], [a[0] + ex, a[1] + ey]]),
      fill: lerpHex(tone.dark, tone.lit, light),
    })
  }

  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2

  return {
    ...piece,
    face: fmt(pts),
    back: fmt(pts.map(([x, y]) => [x + ex, y + ey] as Pt)),
    backFill: tone.back,
    sides,
    origin: `${((cx / LOGO_W) * 100).toFixed(2)}% ${((cy / LOGO_H) * 100).toFixed(2)}%`,
    depth: DEPTH[piece.id],
  }
}

export const EMBLEM_PIECES: EmblemPiece[] = LOGO_PIECES.map(extrude)
