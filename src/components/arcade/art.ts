import { C, SLANT } from './constants'

/**
 * Procedural, pre-rendered scenery for HIZARC DASH. Everything here is painted ONCE per
 * resize into offscreen canvases; the per-frame renderer only blits them.
 * Layers are drawn in game units (`k` = device pixels per unit).
 */

export type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; wU: number; hU: number }

export function makeLayer(wU: number, hU: number, k: number): Layer | null {
  const canvas = document.createElement('canvas')
  const w = Math.max(1, Math.round(wU * k))
  const h = Math.max(1, Math.round(hU * k))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(k, k)
  // Report the size the bitmap really has, so tiles repeat without hairline seams.
  return { canvas, ctx, wU: w / k, hU: h / k }
}

/** Small deterministic PRNG so the scenery looks identical on every visit and every resize. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ================================================================== */
/*  Glow sprites                                                      */
/* ================================================================== */

/** Soft round glow: `drawImage` of this beats shadowBlur by an order of magnitude. */
export function makeGlow(rgb: readonly [number, number, number], sizeU: number, k: number, core = 0.9): HTMLCanvasElement {
  const layer = makeLayer(sizeU, sizeU, k)
  if (!layer) return document.createElement('canvas')
  const { ctx, canvas } = layer
  const r = sizeU / 2
  const [R, G, B] = rgb
  const grd = ctx.createRadialGradient(r, r, 0, r, r, r)
  grd.addColorStop(0, `rgba(${R},${G},${B},${core})`)
  grd.addColorStop(0.28, `rgba(${R},${G},${B},${core * 0.38})`)
  grd.addColorStop(0.6, `rgba(${R},${G},${B},${core * 0.1})`)
  grd.addColorStop(1, `rgba(${R},${G},${B},0)`)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, sizeU, sizeU)
  return canvas
}

/* ================================================================== */
/*  Sky (static backdrop: gradient, sun, beams, stars)                */
/* ================================================================== */

export type StarField = { x: Float32Array; y: Float32Array; size: Float32Array; phase: Float32Array; count: number }

export type Sky = { canvas: HTMLCanvasElement; stars: StarField }

export function buildSky(cssW: number, cssH: number, dpr: number, k: number, viewW: number, viewH: number, floorU: number): Sky | null {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const g = canvas.getContext('2d')
  if (!g) return null
  g.scale(k, k)
  // The bitmap can be a fraction of a unit larger than viewW × viewH — overpaint.
  const W = viewW + 4
  const H = viewH + 4

  // Night sky → glowing horizon
  const sky = g.createLinearGradient(0, 0, 0, floorU)
  sky.addColorStop(0, '#02040b')
  sky.addColorStop(0.45, '#050a21')
  sky.addColorStop(0.78, '#0a1244')
  sky.addColorStop(1, '#18278a')
  g.fillStyle = sky
  g.fillRect(0, 0, W, floorU + 1)
  g.fillStyle = C.ink950
  g.fillRect(0, floorU, W, H - floorU)

  // Sun / moon disc (synthwave slices), set behind the skyline
  const r = Math.max(46, Math.min(floorU * 0.3, 118))
  const cx = viewW * 0.7
  const cy = floorU * 0.6
  const halo = g.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.6)
  halo.addColorStop(0, 'rgba(124,92,255,0.34)')
  halo.addColorStop(0.5, 'rgba(10,124,255,0.12)')
  halo.addColorStop(1, 'rgba(10,124,255,0)')
  g.fillStyle = halo
  g.fillRect(cx - r * 2.7, cy - r * 2.7, r * 5.4, r * 5.4)

  const disc = makeLayer(r * 2, r * 2, k)
  if (disc) {
    const d = disc.ctx
    const body = d.createLinearGradient(0, 0, 0, r * 2)
    body.addColorStop(0, '#9d86ff')
    body.addColorStop(0.5, '#4f7dff')
    body.addColorStop(1, '#2ee6ff')
    d.fillStyle = body
    d.beginPath()
    d.arc(r, r, r, 0, Math.PI * 2)
    d.fill()
    d.globalCompositeOperation = 'destination-out'
    for (let j = 0; j < 6; j++) {
      const th = 1.2 + j * 1.5
      const y = r * (0.82 + j * 0.2) - th
      d.fillRect(0, y, r * 2, th)
    }
    g.globalAlpha = 0.55
    g.drawImage(disc.canvas, cx - r, cy - r, disc.wU, disc.hU)
    g.globalAlpha = 1
  }

  // Wide horizon bloom
  g.save()
  g.translate(viewW * 0.5, floorU)
  g.scale(1, 0.34)
  const bloom = g.createRadialGradient(0, 0, 0, 0, 0, viewW * 0.85)
  bloom.addColorStop(0, 'rgba(61,155,255,0.55)')
  bloom.addColorStop(0.5, 'rgba(10,124,255,0.18)')
  bloom.addColorStop(1, 'rgba(10,124,255,0)')
  g.fillStyle = bloom
  g.fillRect(-viewW, -viewW, viewW * 2, viewW * 2)
  g.restore()

  // Leaning light beams — the logo's slant, writ large
  g.save()
  g.beginPath()
  g.rect(0, 0, viewW, floorU)
  g.clip()
  const beams: readonly [number, number, string][] = [
    [0.16, 38, '10,124,255'],
    [0.5, 78, '124,92,255'],
    [0.86, 30, '46,230,255'],
  ]
  for (const [fx, bw, rgb] of beams) {
    const bx = viewW * fx
    const lean = floorU * SLANT
    const beam = g.createLinearGradient(0, floorU, 0, 0)
    beam.addColorStop(0, `rgba(${rgb},0.12)`)
    beam.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(bx, floorU)
    g.lineTo(bx + bw, floorU)
    g.lineTo(bx + bw + lean, 0)
    g.lineTo(bx + lean, 0)
    g.closePath()
    g.fill()
  }
  g.restore()

  // Stars (static ones painted here, a handful twinkle per frame)
  const rand = mulberry32(7)
  const total = Math.min(120, Math.round((viewW * floorU) / 2300))
  const twinkle = Math.min(16, Math.round(total * 0.14))
  const stars: StarField = {
    x: new Float32Array(twinkle),
    y: new Float32Array(twinkle),
    size: new Float32Array(twinkle),
    phase: new Float32Array(twinkle),
    count: twinkle,
  }
  for (let i = 0; i < total; i++) {
    const x = rand() * viewW
    const y = rand() * floorU * 0.86
    const size = 0.5 + rand() * 0.9
    if (i < twinkle) {
      stars.x[i] = x
      stars.y[i] = y
      stars.size[i] = size + 0.5
      stars.phase[i] = rand() * Math.PI * 2
      continue
    }
    const tone = rand()
    g.fillStyle = tone < 0.6 ? `rgba(255,255,255,${0.25 + rand() * 0.5})` : tone < 0.85 ? `rgba(160,215,255,${0.3 + rand() * 0.4})` : `rgba(190,170,255,${0.3 + rand() * 0.4})`
    g.fillRect(x, y, size, size)
  }

  return { canvas, stars }
}

/* ================================================================== */
/*  Far layer — Calicut coast skyline silhouette                      */
/* ================================================================== */

export type Tile = { canvas: HTMLCanvasElement; wU: number; hU: number }

type Roof = -1 | 0 | 1
type Plan = { kind: 'tower' | 'cyber' | 'lighthouse' | 'mishkal' | 'palms' | 'uru' | 'pier'; x: number; w: number; h: number; roof: Roof }

const SKYLINE_H = 232

/** Landmark sequence; the numbers are filler towers placed between them. */
const SKYLINE_SEQUENCE: readonly (number | Exclude<Plan['kind'], 'tower'>)[] = [4, 'palms', 2, 'lighthouse', 3, 'mishkal', 'palms', 2, 'uru', 3, 'palms', 2, 'cyber', 3, 'pier', 'palms', 4]

function planSkyline(rand: () => number): { plans: Plan[]; width: number } {
  const plans: Plan[] = []
  let x = 14
  const filler = () => {
    const w = 15 + rand() * 20
    const roofPick = rand()
    const roof: Roof = roofPick < 0.3 ? 0 : roofPick < 0.65 ? 1 : -1
    plans.push({ kind: 'tower', x, w, h: 30 + rand() * 52, roof })
    x += w + rand() * 8 - 2
  }
  for (const step of SKYLINE_SEQUENCE) {
    if (typeof step === 'number') {
      for (let i = 0; i < step; i++) filler()
      continue
    }
    x += 6
    switch (step) {
      case 'lighthouse':
        plans.push({ kind: 'lighthouse', x, w: 18, h: 164, roof: 0 })
        x += 18
        break
      case 'mishkal':
        plans.push({ kind: 'mishkal', x, w: 84, h: 96, roof: 0 })
        x += 84
        break
      case 'palms':
        plans.push({ kind: 'palms', x, w: 36, h: 96, roof: 0 })
        x += 36
        break
      case 'uru':
        plans.push({ kind: 'uru', x, w: 78, h: 48, roof: 0 })
        x += 78
        break
      case 'pier':
        plans.push({ kind: 'pier', x, w: 68, h: 30, roof: 0 })
        x += 68
        break
      case 'cyber':
        plans.push({ kind: 'cyber', x, w: 28, h: 124, roof: 0 })
        x += 28
        break
    }
    x += 6
  }
  return { plans, width: x + 10 }
}

export function buildSkyline(k: number): Tile | null {
  const rand = mulberry32(1337)
  const { plans, width } = planSkyline(rand)
  const layer = makeLayer(width, SKYLINE_H, k)
  if (!layer) return null
  const { ctx: g } = layer
  const H = SKYLINE_H

  // The silhouettes are shorter than the tile, so the gradient spans just the tallest landmark.
  const fill = g.createLinearGradient(0, H - 176, 0, H)
  fill.addColorStop(0, '#0a1238')
  fill.addColorStop(1, '#04071a')
  g.fillStyle = fill

  // `roofAt` (optional) gives the roofline's y at an x, so lit windows never float above a slanted roof.
  const windows = (x: number, w: number, top: number, count: number, roofAt?: (wx: number) => number) => {
    for (let i = 0; i < count; i++) {
      const wx = x + 2 + Math.floor(rand() * Math.max(1, w - 4))
      const sill = (roofAt ? Math.max(top, roofAt(wx), roofAt(wx + 1.1)) : top) + 4
      const wy = sill + rand() * Math.max(1, H - sill - 8)
      g.fillStyle = rand() < 0.5 ? 'rgba(46,230,255,0.55)' : rand() < 0.5 ? 'rgba(125,185,255,0.45)' : 'rgba(255,255,255,0.4)'
      g.fillRect(wx, wy, 1.1, 1.5)
    }
    g.fillStyle = fill
  }

  // Lighthouse lamp position — its beam is painted after every silhouette so no tower hides it.
  let lamp: [number, number] | null = null

  for (const p of plans) {
    g.fillStyle = fill
    switch (p.kind) {
      case 'tower': {
        const top = H - p.h
        g.beginPath()
        g.moveTo(p.x, H)
        if (p.roof === 0) {
          g.lineTo(p.x, top)
          g.lineTo(p.x + p.w, top)
        } else if (p.roof === 1) {
          g.lineTo(p.x, top)
          g.lineTo(p.x + p.w, top + p.w * SLANT)
        } else {
          g.lineTo(p.x, top + p.w * SLANT)
          g.lineTo(p.x + p.w, top)
        }
        g.lineTo(p.x + p.w, H)
        g.closePath()
        g.fill()
        if (rand() < 0.3) {
          // Antenna runs down into the roofline (a slanted roof sits lower at mid-span).
          const ay = top - 12 - rand() * 8
          const seat = top + (p.roof === 0 ? 0 : p.w * SLANT * 0.5) + 2
          g.fillRect(p.x + p.w * 0.5 - 0.5, ay, 1, seat - ay)
        }
        const roofAt = p.roof === 0 ? undefined : p.roof === 1 ? (wx: number) => top + (wx - p.x) * SLANT : (wx: number) => top + (p.x + p.w - wx) * SLANT
        windows(p.x, p.w, top, Math.floor((p.w * p.h) / 190), roofAt)
        break
      }
      case 'lighthouse': {
        // Kozhikode beach light: slender tapering tower, gallery ring, lantern room, cap and finial.
        const cx = p.x + p.w / 2
        const top = H - p.h
        g.beginPath()
        g.moveTo(cx - 7, H)
        g.lineTo(cx - 3.6, top + 17)
        g.lineTo(cx + 3.6, top + 17)
        g.lineTo(cx + 7, H)
        g.closePath()
        g.fill()
        g.fillRect(cx - 9, H - 7, 18, 7)
        g.fillRect(cx - 6.5, top + 14, 13, 3)
        g.fillRect(cx - 5.5, top + 12, 11, 1)
        g.fillRect(cx - 3.2, top + 5, 6.4, 9)
        g.beginPath()
        g.moveTo(cx - 4.8, top + 5)
        g.lineTo(cx, top - 1)
        g.lineTo(cx + 4.8, top + 5)
        g.closePath()
        g.fill()
        g.fillRect(cx - 0.5, top - 7, 1, 7)
        windows(cx - 4, 8, top + 30, 4)
        lamp = [cx, top + 9.5]
        break
      }
      case 'mishkal': {
        // Mishkal Mosque: timber hall under four stacked, deep-eaved tiled roofs — no domes, no minarets.
        const cx = p.x + p.w / 2
        const tiers: readonly [number, number, number][] = [
          [p.w, 15, 14],
          [p.w * 0.62, 13, 10],
          [p.w * 0.39, 11, 9],
          [p.w * 0.25, 10, 7],
        ]
        let y = H
        for (const [span, rise, wall] of tiers) {
          const body = span * 0.78
          const ridge = span * 0.5
          g.fillRect(cx - body / 2, y - wall, body, wall)
          y -= wall
          g.beginPath()
          g.moveTo(cx - span / 2, y + 1)
          g.lineTo(cx - ridge / 2, y - rise)
          g.lineTo(cx + ridge / 2, y - rise)
          g.lineTo(cx + span / 2, y + 1)
          g.closePath()
          g.fill()
          y -= rise
        }
        g.fillRect(cx - 0.5, y - 7, 1, 7)
        windows(cx - p.w * 0.39, p.w * 0.78, H - tiers[0][2], 4)
        break
      }
      case 'palms': {
        // A small grove of coconut palms: thin leaning trunks, each crowned by a fan of drooping fronds.
        const n = 2 + Math.floor(rand() * 3)
        g.strokeStyle = fill
        g.lineCap = 'round'
        for (let i = 0; i < n; i++) {
          const bx = p.x + 6 + ((p.w - 12) * i) / Math.max(1, n - 1) + (rand() - 0.5) * 4
          const th = p.h * (0.55 + rand() * 0.45)
          const lean = (i % 2 === 0 ? -1 : 1) * (4 + rand() * 11)
          const tx = bx + lean
          const ty = H - th
          g.lineWidth = 2.2
          g.beginPath()
          g.moveTo(bx, H)
          g.quadraticCurveTo(bx + lean * 0.1, H - th * 0.55, tx, ty)
          g.stroke()
          g.beginPath()
          g.arc(tx, ty, 2, 0, Math.PI * 2)
          g.fill()
          g.lineWidth = 2
          const fronds = 7
          for (let f = 0; f < fronds; f++) {
            // fx sweeps the crown from far left to far right; the farther out, the more the frond droops.
            const fx = -1 + (2 * f) / (fronds - 1) + (rand() - 0.5) * 0.16
            const len = 12 + rand() * 8
            const out = Math.abs(fx)
            g.beginPath()
            g.moveTo(tx, ty)
            g.quadraticCurveTo(tx + fx * len * 0.55, ty - len * 0.62 * (1 - out * 0.5), tx + fx * len, ty - len * 0.45 * (1 - out) + len * 0.55 * out * out)
            g.stroke()
          }
        }
        g.lineCap = 'butt'
        break
      }
      case 'uru': {
        // Beypore uru: wooden dhow with a tall carved stern, raised prow, two masts and slack sails.
        const x1 = p.x + p.w
        g.fillRect(p.x - 10, H - 3, p.w + 16, 3)
        g.beginPath()
        g.moveTo(p.x + 14, H - 3)
        g.lineTo(x1 - 18, H - 3)
        g.quadraticCurveTo(x1 - 4, H - 4, x1, H - 24)
        g.lineTo(x1 + 1, H - 31)
        g.lineTo(x1 - 17, H - 31)
        g.lineTo(x1 - 17, H - 21)
        g.lineTo(p.x + 6, H - 21)
        g.lineTo(p.x - 6, H - 28)
        g.lineTo(p.x - 1, H - 15)
        g.quadraticCurveTo(p.x + 3, H - 6, p.x + 14, H - 3)
        g.closePath()
        g.fill()
        const m1 = p.x + p.w * 0.36
        const m2 = p.x + p.w * 0.64
        g.fillRect(m1 - 0.6, H - p.h, 1.2, p.h - 20)
        g.fillRect(m2 - 0.6, H - p.h + 8, 1.2, p.h - 28)
        g.globalAlpha = 0.75
        for (const [mx, my, sw] of [
          [m1, H - p.h + 1, -21],
          [m2, H - p.h + 9, 16],
        ] as const) {
          g.beginPath()
          g.moveTo(mx, my)
          g.lineTo(mx + sw, H - 23)
          g.lineTo(mx, H - 23)
          g.closePath()
          g.fill()
        }
        g.globalAlpha = 1
        g.fillStyle = 'rgba(46,230,255,0.85)'
        g.beginPath()
        g.arc(x1 - 8, H - 32, 1.1, 0, Math.PI * 2)
        g.fill()
        break
      }
      case 'pier': {
        // Old Calicut sea-pier: stubby pillars standing in the sea under a deck that has broken mid-span.
        const n = 8
        const gap = p.w / (n - 1)
        const deckY = H - p.h
        g.fillRect(p.x - 5, H - 4, p.w + 10, 4)
        for (let i = 0; i < n; i++) {
          // Standing pillars run up into the deck; the two under the break are stumps.
          const ph = i === 4 || i === 5 ? p.h * (0.3 + rand() * 0.3) : p.h + 1
          g.fillRect(p.x + i * gap - 1.3, H - ph, 2.6, ph)
        }
        g.fillRect(p.x - 2, deckY - 3, gap * 3.7 + 2, 3)
        g.fillRect(p.x + gap * 5.4, deckY - 3, p.w - gap * 5.4 + 2, 3)
        g.fillRect(p.x, deckY + p.h * 0.45, gap * 3, 1)
        g.fillRect(p.x, deckY - 9, 1, 6)
        g.fillStyle = 'rgba(46,230,255,0.8)'
        g.fillRect(p.x - 0.5, deckY - 11, 2, 2)
        break
      }
      case 'cyber': {
        // Modern glass office tower with an angled crown and a beacon mast (Cyberpark / HiLITE era).
        const top = H - p.h
        const mx = p.x + p.w * 0.62
        const dropL = p.w * SLANT * 1.6
        const dropR = p.w * SLANT * 0.5
        g.beginPath()
        g.moveTo(p.x, H)
        g.lineTo(p.x, top + dropL)
        g.lineTo(mx, top)
        g.lineTo(p.x + p.w, top + dropR)
        g.lineTo(p.x + p.w, H)
        g.closePath()
        g.fill()
        g.fillRect(mx - 0.5, top - 13, 1, 14)
        windows(p.x, p.w, top, 26, (wx) => top + (wx < mx ? ((mx - wx) / (mx - p.x)) * dropL : ((wx - mx) / (p.x + p.w - mx)) * dropR))
        g.fillStyle = 'rgba(46,230,255,0.5)'
        g.fillRect(p.x + 2, top + 32, p.w - 4, 1)
        g.fillStyle = 'rgba(46,230,255,0.9)'
        g.beginPath()
        g.arc(mx, top - 13, 1.1, 0, Math.PI * 2)
        g.fill()
        break
      }
    }
  }

  // Lighthouse lamp: a faint beam over the rooftops, a soft glow, and the lit lantern pane.
  if (lamp) {
    const [lx, ly] = lamp
    const beam = g.createLinearGradient(lx, 0, lx + 96, 0)
    beam.addColorStop(0, 'rgba(46,230,255,0.26)')
    beam.addColorStop(1, 'rgba(46,230,255,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(lx, ly - 1)
    g.lineTo(lx + 96, ly - 17)
    g.lineTo(lx + 96, ly + 9)
    g.lineTo(lx, ly + 1)
    g.closePath()
    g.fill()
    const glow = g.createRadialGradient(lx, ly, 0, lx, ly, 13)
    glow.addColorStop(0, 'rgba(46,230,255,0.55)')
    glow.addColorStop(1, 'rgba(46,230,255,0)')
    g.fillStyle = glow
    g.fillRect(lx - 13, ly - 13, 26, 26)
    g.fillStyle = 'rgba(190,250,255,0.95)'
    g.fillRect(lx - 1.6, ly - 2.5, 3.2, 5)
  }

  // Haze: bases melt into the glowing horizon (only tints the silhouettes)
  g.globalCompositeOperation = 'source-atop'
  const haze = g.createLinearGradient(0, H, 0, H * 0.45)
  haze.addColorStop(0, 'rgba(46,70,200,0.5)')
  haze.addColorStop(1, 'rgba(46,70,200,0)')
  g.fillStyle = haze
  g.fillRect(0, 0, width + 4, H)
  g.globalCompositeOperation = 'source-over'

  return { canvas: layer.canvas, wU: layer.wU, hU: layer.hU }
}

/* ================================================================== */
/*  Mid layer — slanted shard towers                                  */
/* ================================================================== */

const SHARDS_H = 176
const SHARDS_W = 760

export function buildShards(k: number): Tile | null {
  const layer = makeLayer(SHARDS_W, SHARDS_H, k)
  if (!layer) return null
  const g = layer.ctx
  const rand = mulberry32(2024)
  const H = SHARDS_H

  const body = g.createLinearGradient(0, 0, 0, H)
  body.addColorStop(0, 'rgba(61,155,255,0.2)')
  body.addColorStop(1, 'rgba(6,32,90,0.6)')

  let x = 18
  while (x < SHARDS_W - 70) {
    const w = 26 + rand() * 30
    const h = 54 + rand() * 98
    const dir = rand() < 0.5 ? 1 : -1
    const drop = w * SLANT
    const tl = dir === 1 ? H - h : H - h + drop
    const tr = dir === 1 ? H - h + drop : H - h

    g.fillStyle = body
    g.beginPath()
    g.moveTo(x, H)
    g.lineTo(x, tl)
    g.lineTo(x + w, tr)
    g.lineTo(x + w, H)
    g.closePath()
    g.fill()

    // Light-catching slanted slice
    g.fillStyle = 'rgba(125,185,255,0.07)'
    g.beginPath()
    g.moveTo(x + w * 0.55, H)
    g.lineTo(x + w * 0.55, tl + (tr - tl) * 0.55 + 6)
    g.lineTo(x + w * 0.8, tl + (tr - tl) * 0.8 + 6)
    g.lineTo(x + w * 0.8, H)
    g.closePath()
    g.fill()

    g.lineWidth = 1.1
    g.strokeStyle = 'rgba(46,230,255,0.42)'
    g.beginPath()
    g.moveTo(x, tl)
    g.lineTo(x + w, tr)
    g.stroke()
    g.strokeStyle = 'rgba(125,185,255,0.22)'
    g.beginPath()
    g.moveTo(x + 0.5, H)
    g.lineTo(x + 0.5, tl)
    g.stroke()

    x += w + 22 + rand() * 46
  }

  return { canvas: layer.canvas, wU: layer.wU, hU: layer.hU }
}

/* ================================================================== */
/*  Screen-edge glow (overdrive)                                      */
/* ================================================================== */

export function buildEdgeGlow(cssW: number, cssH: number, dpr: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cssW * dpr))
  canvas.height = Math.max(1, Math.round(cssH * dpr))
  const g = canvas.getContext('2d')
  if (!g) return null
  g.scale(dpr, dpr)
  const depth = Math.max(36, Math.min(cssW, cssH) * 0.2)
  const edge = (x0: number, y0: number, x1: number, y1: number, rgb: string, rect: [number, number, number, number]) => {
    const grd = g.createLinearGradient(x0, y0, x1, y1)
    grd.addColorStop(0, `rgba(${rgb},0.85)`)
    grd.addColorStop(0.35, `rgba(${rgb},0.26)`)
    grd.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grd
    g.fillRect(...rect)
  }
  edge(0, 0, depth, 0, '46,230,255', [0, 0, depth, cssH])
  edge(cssW, 0, cssW - depth, 0, '46,230,255', [cssW - depth, 0, depth, cssH])
  edge(0, 0, 0, depth, '124,92,255', [0, 0, cssW, depth])
  edge(0, cssH, 0, cssH - depth, '124,92,255', [0, cssH - depth, cssW, depth])
  return canvas
}
