import { LOGO_PIECES } from '@/components/brand/Logo'
import {
  C,
  FLOOR_DEPTH,
  FONT_DISPLAY,
  FONT_MONO,
  LOGO_H,
  LOGO_W,
  METER_SEGMENTS,
  MIN_VIEW_W,
  OVERDRIVE_TIME,
  PLAYER_H,
  PLAYER_W,
  RESUME_COUNTDOWN,
  SLANT,
  WORLD_H,
  padScore,
} from './constants'
import { TRAIL_LEN, type DashEngine, type Obstacle } from './engine'
import { buildEdgeGlow, buildShards, buildSky, buildSkyline, makeGlow, type Sky, type Tile } from './art'

/**
 * HIZARC DASH renderer. Draws an engine snapshot onto a 2D canvas in "game units":
 * x = world distance minus the camera, y grows downward from the top of the view,
 * the run line sits at `floorU`. Static scenery is blitted from pre-rendered layers,
 * glows are sprites (no shadowBlur) and nothing in the hot path allocates.
 */

/* ------------------------------------------------------------------ */
/*  Fonts                                                             */
/* ------------------------------------------------------------------ */

/** Make sure the display + mono faces are loaded before the first canvas text is painted. */
export async function loadArcadeFonts() {
  try {
    await Promise.all([document.fonts.load('700 20px "Unbounded Variable"'), document.fonts.load('500 12px "JetBrains Mono Variable"')])
    await document.fonts.ready
  } catch {
    /* canvas text falls back to the system stack */
  }
}

/* ------------------------------------------------------------------ */
/*  Logo pieces → Path2D                                              */
/* ------------------------------------------------------------------ */

type LogoShape = { dark: boolean; path: Path2D; cx: number; cy: number }

function buildLogoShapes(): LogoShape[] {
  return LOGO_PIECES.map((piece) => {
    const nums = piece.points.split(/[\s,]+/).map(Number)
    let d = ''
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < nums.length; i += 2) {
      d += `${i === 0 ? 'M' : 'L'}${nums[i]} ${nums[i + 1]}`
      minX = Math.min(minX, nums[i])
      maxX = Math.max(maxX, nums[i])
      minY = Math.min(minY, nums[i + 1])
      maxY = Math.max(maxY, nums[i + 1])
    }
    return { dark: piece.tone === 'dark', path: new Path2D(`${d}Z`), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
  })
}

const LOGO_SCALE = PLAYER_H / LOGO_H
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Fixed per-line values for the speed streaks (golden-ratio hash → even spread, no per-frame trig). */
const STREAKS = 18
const streakY = new Float32Array(STREAKS)
const streakLen = new Float32Array(STREAKS)
const streakSpeed = new Float32Array(STREAKS)
const streakOff = new Float32Array(STREAKS)
for (let i = 0; i < STREAKS; i++) {
  streakY[i] = (i * 0.618034) % 1
  streakLen[i] = 0.35 + ((i * 0.7548776) % 1) * 0.65
  streakSpeed[i] = 1.3 + ((i * 0.5698403) % 1) * 1.7
  streakOff[i] = (i * 0.4301597 + 0.11) % 1
}

const MAX_GAPS = 10
const GLOW_CYAN: readonly [number, number, number] = [46, 230, 255]
const GLOW_VOLT: readonly [number, number, number] = [215, 255, 58]
const GLOW_VIOLET: readonly [number, number, number] = [124, 92, 255]
const GLOW_BRAND: readonly [number, number, number] = [10, 124, 255]

export class DashRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly g: CanvasRenderingContext2D
  private readonly shapes = buildLogoShapes()

  /** CSS size, device-pixel ratio, CSS px per game unit, device px per unit */
  cssW = 0
  cssH = 0
  private dpr = 1
  private s = 1
  private k = 1
  /** View size in units; the run line sits `floorDepth` above the bottom edge. */
  viewW = 0
  private viewH = 0
  private floorU = 0
  private floorDepth = 0

  private builtK = 0
  private sky: Sky | null = null
  private skyline: Tile | null = null
  private shards: Tile | null = null
  private edge: HTMLCanvasElement | null = null
  private glowCyan: HTMLCanvasElement | null = null
  private glowVolt: HTMLCanvasElement | null = null
  private glowViolet: HTMLCanvasElement | null = null
  private glowBrand: HTMLCanvasElement | null = null

  private floorFill: CanvasGradient | null = null
  private pitFill: CanvasGradient | null = null
  private hazeFill: CanvasGradient | null = null
  private shardFill: CanvasGradient | null = null
  private hangFill: CanvasGradient | null = null

  private readonly gapX0 = new Float64Array(MAX_GAPS)
  private readonly gapX1 = new Float64Array(MAX_GAPS)
  private gapN = 0

  /* HUD caches (no per-frame string churn) */
  private scoreN = -1
  private scoreStr = ''
  private bestN = -1
  private bestStr = ''
  private levelN = -1
  private levelStr = ''
  private f = { label: '', score: '', value: '', hint: '', big: '', popup: '', popupBig: '' }

  private constructor(canvas: HTMLCanvasElement, g: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.g = g
  }

  static create(canvas: HTMLCanvasElement) {
    const g = canvas.getContext('2d', { alpha: false })
    if (!g || typeof Path2D === 'undefined') return null
    return new DashRenderer(canvas, g)
  }

  /* ================================================================ */
  /*  Resize                                                          */
  /* ================================================================ */

  /** Fit the canvas to a CSS size. Returns the view width in game units (feed it to `engine.setView`). */
  resize(cssW: number, cssH: number, dpr: number) {
    this.cssW = cssW
    this.cssH = cssH
    this.dpr = dpr
    // The gameplay band is always fully visible; narrow canvases zoom out instead of hiding the track ahead.
    this.s = Math.min(cssH / WORLD_H, cssW / MIN_VIEW_W)
    this.k = dpr * this.s
    this.viewW = cssW / this.s
    this.viewH = cssH / this.s
    const extra = Math.max(0, this.viewH - WORLD_H)
    this.floorDepth = FLOOR_DEPTH + extra * 0.38
    this.floorU = this.viewH - this.floorDepth

    this.canvas.width = Math.max(1, Math.round(cssW * dpr))
    this.canvas.height = Math.max(1, Math.round(cssH * dpr))

    const { g, k, viewH, floorU } = this
    this.sky = buildSky(cssW, cssH, dpr, k, this.viewW, viewH, floorU)
    this.edge = null
    // Tiles + sprites only depend on the unit scale — skip rebuilding them while a window is dragged by a few px.
    if (k !== this.builtK || !this.skyline || !this.shards) {
      this.builtK = k
      this.skyline = buildSkyline(k)
      this.shards = buildShards(k)
      this.glowCyan = makeGlow(GLOW_CYAN, 64, k)
      this.glowVolt = makeGlow(GLOW_VOLT, 48, k)
      this.glowViolet = makeGlow(GLOW_VIOLET, 64, k)
      this.glowBrand = makeGlow(GLOW_BRAND, 64, k)
    }

    const floor = g.createLinearGradient(0, floorU, 0, viewH)
    floor.addColorStop(0, '#101a3e')
    floor.addColorStop(0.35, '#080d22')
    floor.addColorStop(1, '#03050c')
    this.floorFill = floor
    const pit = g.createLinearGradient(0, floorU, 0, viewH)
    pit.addColorStop(0, '#010207')
    pit.addColorStop(0.6, '#04050d')
    pit.addColorStop(1, '#1c1258')
    this.pitFill = pit
    const haze = g.createLinearGradient(0, floorU, 0, floorU - 34)
    haze.addColorStop(0, 'rgba(46,230,255,0.17)')
    haze.addColorStop(1, 'rgba(46,230,255,0)')
    this.hazeFill = haze
    // Shard gradients are in the shard's own space (origin at its base / tip), reused via translate().
    const shard = g.createLinearGradient(0, 0, 0, -175)
    shard.addColorStop(0, '#1b1156')
    shard.addColorStop(0.55, '#5a3fe0')
    shard.addColorStop(1, '#a995ff')
    this.shardFill = shard
    const hang = g.createLinearGradient(0, 0, 0, -280)
    hang.addColorStop(0, '#b5a4ff')
    hang.addColorStop(0.16, '#5a3fe0')
    hang.addColorStop(1, '#140c46')
    this.hangFill = hang

    const small = cssW < 480
    this.f = {
      label: `500 ${small ? 9 : 10}px ${FONT_MONO}`,
      score: `700 ${small ? 20 : 26}px ${FONT_DISPLAY}`,
      value: `700 ${small ? 13 : 15}px ${FONT_DISPLAY}`,
      hint: `500 ${small ? 9.5 : 11}px ${FONT_MONO}`,
      big: `800 ${small ? 56 : 72}px ${FONT_DISPLAY}`,
      popup: `700 11px ${FONT_DISPLAY}`,
      popupBig: `800 15px ${FONT_DISPLAY}`,
    }
    this.bestN = -1
    this.scoreN = -1
    this.levelN = -1
    return this.viewW
  }

  /* ================================================================ */
  /*  Frame                                                           */
  /* ================================================================ */

  draw(e: DashEngine, alpha: number, time: number) {
    const g = this.g
    const sky = this.sky
    if (!sky || !this.skyline || !this.shards || this.cssW === 0) return
    const k = this.k

    const dist = e.prevDist + (e.dist - e.prevDist) * alpha
    const camLeft = dist - e.playerX
    const py = e.prevY + (e.y - e.prevY) * alpha

    let shx = 0
    let shy = 0
    if (e.shake > 0.05) {
      shx = (Math.random() * 2 - 1) * e.shake * k
      shy = (Math.random() * 2 - 1) * e.shake * k * 0.7
    }

    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.setTransform(1, 0, 0, 1, 0, 0)
    if (shx !== 0 || shy !== 0) {
      g.fillStyle = C.ink950
      g.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    g.setTransform(1, 0, 0, 1, shx, shy)
    g.drawImage(sky.canvas, 0, 0)
    g.setTransform(k, 0, 0, k, shx, shy)

    this.twinkle(sky, time)
    this.layer(this.skyline, camLeft, 0.1)
    this.layer(this.shards, camLeft, 0.3)
    this.collectGaps(e, camLeft)
    this.speedLines(e, camLeft)
    this.floor(e, camLeft)

    for (const o of e.obstacles) if (o.active && o.kind !== 'gap') this.shard(o, camLeft)
    this.pickups(e, camLeft, time)

    if (e.alive) {
      this.trail(e, camLeft)
      this.player(e, py, time)
    } else {
      this.debris(e, camLeft)
    }

    this.effects(e, camLeft)
    this.overlayFx(e, time)

    if (e.phase === 'playing' || e.phase === 'dying' || e.phase === 'paused') this.hud(e, time)
  }

  /* ================================================================ */
  /*  Background                                                      */
  /* ================================================================ */

  private twinkle(sky: Sky, time: number) {
    const g = this.g
    const { x, y, size, phase, count } = sky.stars
    g.fillStyle = '#ffffff'
    for (let i = 0; i < count; i++) {
      g.globalAlpha = 0.25 + 0.65 * Math.abs(Math.sin(time * (0.9 + (i % 5) * 0.37) + phase[i]))
      g.fillRect(x[i], y[i], size[i], size[i])
    }
    g.globalAlpha = 1
  }

  /** Tile a pre-rendered layer across the view with parallax. */
  private layer(tile: Tile, camLeft: number, parallax: number) {
    const g = this.g
    const w = tile.wU
    let x = -((camLeft * parallax) % w)
    if (x > 0) x -= w
    const y = this.floorU - tile.hU
    const k = this.k
    for (; x < this.viewW; x += w) g.drawImage(tile.canvas, Math.round(x * k) / k, y, w, tile.hU)
  }

  private speedLines(e: DashEngine, camLeft: number) {
    if (e.phase === 'title' || e.phase === 'over') return
    const boost = e.overdrive > 0
    const a = clamp01((e.level - 1.2) / 0.9) * (boost ? 0.6 : 0.3)
    if (a < 0.02) return
    const g = this.g
    const span = this.viewW + 280
    const top = this.floorU - 14
    g.globalAlpha = a
    g.strokeStyle = boost ? C.cyan : C.brand300
    g.lineWidth = 1
    g.beginPath()
    for (let i = 0; i < STREAKS; i++) {
      const y = streakY[i] * top
      const len = (36 + streakLen[i] * 120) * e.level
      const raw = (streakOff[i] * span - camLeft * streakSpeed[i]) % span
      const x = (raw < 0 ? raw + span : raw) - 140
      g.moveTo(x, y)
      g.lineTo(x + len, y)
    }
    g.stroke()
    g.globalAlpha = 1
  }

  /* ================================================================ */
  /*  Floor, grid, pits                                               */
  /* ================================================================ */

  private collectGaps(e: DashEngine, camLeft: number) {
    this.gapN = 0
    for (const o of e.obstacles) {
      if (!o.active || o.kind !== 'gap') continue
      const x0 = o.x - camLeft
      const x1 = x0 + o.w
      if (x1 < -30 || x0 > this.viewW + 30 || this.gapN >= MAX_GAPS) continue
      // Insertion sort by x (the pool is tiny).
      let i = this.gapN++
      while (i > 0 && this.gapX0[i - 1] > x0) {
        this.gapX0[i] = this.gapX0[i - 1]
        this.gapX1[i] = this.gapX1[i - 1]
        i--
      }
      this.gapX0[i] = x0
      this.gapX1[i] = x1
    }
  }

  private floor(e: DashEngine, camLeft: number) {
    const g = this.g
    const { viewW, viewH, floorU, floorDepth } = this
    if (!this.floorFill || !this.pitFill || !this.hazeFill) return

    // Body + horizon haze
    g.fillStyle = this.floorFill
    g.fillRect(0, floorU, viewW + 2, viewH - floorU + 2)
    g.fillStyle = this.hazeFill
    g.fillRect(0, floorU - 34, viewW + 2, 34)

    // Perspective grid: depth rows + lines fanning from a vanishing point, sweeping as the world scrolls.
    const cx = viewW * 0.5
    const bottomScale = 2.3
    g.lineWidth = 0.8
    g.strokeStyle = 'rgba(61,155,255,0.2)'
    g.beginPath()
    for (let j = 1; j <= 5; j++) {
      const y = floorU + floorDepth * (j / 5) ** 1.7
      g.moveTo(0, y)
      g.lineTo(viewW, y)
    }
    const spacing = 56
    const first = Math.floor((camLeft + cx - cx * 1.2) / spacing)
    const last = Math.ceil((camLeft + cx + cx * 1.2) / spacing)
    for (let i = first; i <= last; i++) {
      const dx = i * spacing - camLeft - cx
      const xt = cx + dx
      const xb = cx + dx * bottomScale
      if ((xt < -4 && xb < -4) || (xt > viewW + 4 && xb > viewW + 4)) continue
      g.moveTo(xt, floorU)
      g.lineTo(xb, floorU + floorDepth)
    }
    g.stroke()

    // Run line: soft bloom + hot core
    g.fillStyle = 'rgba(46,230,255,0.22)'
    g.fillRect(0, floorU - 3, viewW + 2, 6)
    g.fillStyle = '#c8f8ff'
    g.fillRect(0, floorU - 0.9, viewW + 2, 1.8)

    // Pits over the run line. Overdrive bridges every gap (flickering in its last 0.8 s); afterwards the bridge
    // lingers, flickering, only under a runner who is still out over a gap.
    const playing = e.phase === 'playing'
    const boost = playing && e.overdrive > 0
    const flicker = 0.35 + 0.65 * Math.abs(Math.sin(e.clock * 22))
    const bridge = boost ? (e.overdrive < 0.8 ? flicker : 1) : playing && e.bridge ? flicker : 0
    const px = e.playerX
    for (let i = 0; i < this.gapN; i++) {
      const x0 = this.gapX0[i]
      const w = this.gapX1[i] - x0
      g.fillStyle = this.pitFill
      g.fillRect(x0, floorU - 2, w, viewH - floorU + 4)
      // glowing ledge faces
      g.fillStyle = 'rgba(46,230,255,0.75)'
      g.fillRect(x0 - 1.2, floorU - 0.9, 1.4, floorDepth)
      g.fillRect(x0 + w - 0.2, floorU - 0.9, 1.4, floorDepth)
      g.fillStyle = 'rgba(46,230,255,0.12)'
      g.fillRect(x0 + 0.2, floorU, 5, floorDepth)
      g.fillRect(x0 + w - 5.2, floorU, 5, floorDepth)
      if (bridge > 0 && (boost || (x0 - 14 < px && px < x0 + w + 14))) {
        // Overdrive light bridge
        g.globalAlpha = bridge
        g.fillStyle = 'rgba(46,230,255,0.28)'
        g.fillRect(x0, floorU - 4, w, 8)
        g.fillStyle = '#c8f8ff'
        g.fillRect(x0, floorU - 0.9, w, 1.8)
        g.globalAlpha = 1
      }
    }
  }

  /* ================================================================ */
  /*  Obstacles & pickups                                             */
  /* ================================================================ */

  private shard(o: Obstacle, camLeft: number) {
    const g = this.g
    const x = o.x - camLeft
    if (x > this.viewW + 40 || x + o.w < -40) return
    const w = o.w
    const drop = w * SLANT
    g.save()
    if (o.kind === 'hang') {
      // Hangs from the ceiling: the lit tip is the slanted lower edge.
      g.translate(x, this.floorU - o.h)
      g.fillStyle = this.hangFill ?? C.violet
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(w, drop)
      g.lineTo(w, -this.viewH)
      g.lineTo(0, -this.viewH)
      g.closePath()
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.08)'
      g.fillRect(w * 0.55, -this.viewH, w * 0.18, this.viewH + drop * 0.6)
      g.strokeStyle = C.cyan
      g.lineWidth = 1.8
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(w, drop)
      g.stroke()
      if (this.glowViolet) {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.7
        g.drawImage(this.glowViolet, -w * 0.4, drop * 0.5 - w * 0.9, w * 1.8, w * 1.8)
      }
    } else {
      const h = o.h
      g.translate(x, this.floorU)
      if (this.glowViolet) {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.55
        g.drawImage(this.glowViolet, -w * 0.6, -h - w * 0.5, w * 2.2, h + w)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
      g.fillStyle = this.shardFill ?? C.violet
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, -h)
      g.lineTo(w, -(h - drop))
      g.lineTo(w, 0)
      g.closePath()
      g.fill()
      // slanted light slice, echoing the logo
      g.fillStyle = 'rgba(255,255,255,0.12)'
      g.beginPath()
      g.moveTo(w * 0.24, 0)
      g.lineTo(w * 0.24, -(h - w * 0.24 * SLANT) + 7)
      g.lineTo(w * 0.5, -(h - w * 0.5 * SLANT) + 7)
      g.lineTo(w * 0.5, 0)
      g.closePath()
      g.fill()
      g.lineWidth = 1.8
      g.strokeStyle = o.kind === 'wall' ? C.ember : C.cyan
      g.beginPath()
      g.moveTo(0, -h)
      g.lineTo(w, -(h - drop))
      g.stroke()
      g.lineWidth = 1
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.beginPath()
      g.moveTo(0.5, 0)
      g.lineTo(0.5, -h)
      g.stroke()
    }
    g.restore()
  }

  private pickups(e: DashEngine, camLeft: number, time: number) {
    const g = this.g
    const glowVolt = this.glowVolt
    const glowViolet = this.glowViolet
    if (!glowVolt || !glowViolet) return
    const floorU = this.floorU
    for (const p of e.pickups) {
      if (!p.active) continue
      const x = p.x - camLeft
      if (x < -30 || x > this.viewW + 30) continue
      const bob = Math.sin(time * 4.2 + p.phase) * 2.4
      const y = floorU - p.y - bob
      if (p.kind === 'orb') {
        const pulse = 0.8 + 0.2 * Math.sin(time * 6 + p.phase)
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.75 * pulse
        g.drawImage(glowVolt, x - 16, y - 16, 32, 32)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
        g.fillStyle = C.volt
        g.beginPath()
        g.arc(x, y, 5.6, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fbffd6'
        g.beginPath()
        g.arc(x - 1.2, y - 1.4, 2.2, 0, Math.PI * 2)
        g.fill()
      } else {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.9
        g.drawImage(glowViolet, x - 26, y - 26, 52, 52)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
        // slanted crystal + orbiting ring
        g.save()
        g.translate(x, y)
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.moveTo(-6, 9)
        g.lineTo(5, 9)
        g.lineTo(10, -9)
        g.lineTo(-1, -9)
        g.closePath()
        g.fill()
        g.fillStyle = C.cyan
        g.beginPath()
        g.moveTo(-1, -9)
        g.lineTo(10, -9)
        g.lineTo(7.5, -1)
        g.lineTo(-3.5, -1)
        g.closePath()
        g.fill()
        g.rotate(time * 2.4)
        g.strokeStyle = C.violetSoft
        g.lineWidth = 1.4
        g.strokeRect(-12, -12, 24, 24)
        g.restore()
      }
    }
  }

  /* ================================================================ */
  /*  Runner                                                          */
  /* ================================================================ */

  private trail(e: DashEngine, camLeft: number) {
    const n = e.trailCount
    if (n < 2) return
    const g = this.g
    const boost = e.overdrive > 0
    g.globalCompositeOperation = 'lighter'
    g.fillStyle = boost ? C.violet : C.brand
    const baseY = this.floorU - PLAYER_H * 0.5
    for (let i = 0; i < n; i++) {
      const idx = (e.trailHead - n + i + TRAIL_LEN * 2) % TRAIL_LEN
      const t = (i + 1) / n
      const x = e.trailX[idx] - camLeft
      const y = baseY - e.trailY[idx]
      const w = PLAYER_W * 0.85 * t
      const h = PLAYER_H * 0.78 * t
      g.globalAlpha = 0.34 * t * t
      g.beginPath()
      g.moveTo(x - w / 2, y + h / 2)
      g.lineTo(x + w / 2, y + h / 2)
      g.lineTo(x + w / 2 + h * 0.22, y - h / 2)
      g.lineTo(x - w / 2 + h * 0.22, y - h / 2)
      g.closePath()
      g.fill()
    }
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
  }

  private player(e: DashEngine, py: number, time: number) {
    const g = this.g
    const x = e.playerX
    const floorU = this.floorU
    const boost = e.overdrive > 0
    const feet = floorU - py

    // Ghost frames after overdrive: flicker so the player knows they are briefly untouchable.
    const ghost = e.grace > 0 && !boost
    const flicker = ghost ? (Math.sin(time * 50) > 0 ? 0.5 : 1) : 1

    // Floor reflection (only while there is floor underneath)
    let over = false
    for (let i = 0; i < this.gapN; i++) {
      if (x > this.gapX0[i] + 6 && x < this.gapX1[i] - 6) over = true
    }
    if ((!over || boost || e.bridge) && this.glowCyan && py < 150) {
      g.save()
      g.translate(x, floorU)
      g.scale(1, 0.2)
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = 0.45 * (1 - py / 170)
      g.drawImage(this.glowCyan, -26, -26, 52, 52)
      g.restore()
    }

    // Aura
    const aura = boost ? this.glowViolet : this.glowBrand
    if (aura) {
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = (boost ? 0.9 : 0.42) * flicker
      const size = boost ? 76 : 58
      g.drawImage(aura, x - size / 2, feet - PLAYER_H * 0.5 - size / 2, size, size)
      g.globalCompositeOperation = 'source-over'
    }

    g.save()
    g.globalAlpha = flicker
    g.translate(x, feet)
    g.scale(e.sx, e.sy)
    if (e.rot !== 0) {
      g.translate(0, -PLAYER_H / 2)
      g.rotate(e.rot)
      g.translate(0, PLAYER_H / 2)
    }
    g.scale(LOGO_SCALE, LOGO_SCALE)
    g.translate(-LOGO_W / 2, -LOGO_H)
    g.lineJoin = 'round'
    g.lineWidth = 16
    g.strokeStyle = boost ? C.volt : 'rgba(46,230,255,0.85)'
    for (const shape of this.shapes) {
      g.fillStyle = shape.dark ? (boost ? '#ffffff' : C.snow) : boost ? C.cyan : C.brand400
      g.fill(shape.path)
      g.stroke(shape.path)
    }
    g.restore()
    g.globalAlpha = 1
  }

  /** The mark shatters into its four pieces. */
  private debris(e: DashEngine, camLeft: number) {
    if (e.phase === 'title') return
    const g = this.g
    const floorU = this.floorU
    g.lineJoin = 'round'
    for (let i = 0; i < this.shapes.length && i < e.debris.length; i++) {
      const d = e.debris[i]
      const shape = this.shapes[i]
      g.save()
      g.translate(d.x - camLeft, floorU - d.y)
      g.rotate(-d.rot)
      g.scale(LOGO_SCALE, LOGO_SCALE)
      g.translate(-shape.cx, -shape.cy)
      g.fillStyle = shape.dark ? C.snow : C.brand400
      g.strokeStyle = 'rgba(46,230,255,0.85)'
      g.lineWidth = 16
      g.fill(shape.path)
      g.stroke(shape.path)
      g.restore()
    }
  }

  /* ================================================================ */
  /*  Particles, rings, popups                                        */
  /* ================================================================ */

  private effects(e: DashEngine, camLeft: number) {
    const g = this.g
    const floorU = this.floorU

    g.globalCompositeOperation = 'lighter'
    for (const p of e.particles) {
      if (!p.active) continue
      const t = p.life / p.max
      g.globalAlpha = t > 1 ? 1 : t
      g.fillStyle = p.color
      const s = p.size * (0.55 + 0.45 * t)
      g.fillRect(p.x - camLeft - s / 2, floorU - p.y - s / 2, s, s)
    }
    g.lineWidth = 1.8
    for (const r of e.rings) {
      if (!r.active) continue
      const t = 1 - r.life / r.max
      g.globalAlpha = (1 - t) * 0.9
      g.strokeStyle = r.color
      g.beginPath()
      g.arc(r.x - camLeft, floorU - r.y, r.radius * (1 - (1 - t) ** 3), 0, Math.PI * 2)
      g.stroke()
    }
    g.globalCompositeOperation = 'source-over'

    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (const p of e.popups) {
      if (!p.active) continue
      const t = p.life / p.max
      g.globalAlpha = t > 0.6 ? 1 : t / 0.6
      g.font = p.big ? this.f.popupBig : this.f.popup
      g.fillStyle = p.color
      g.fillText(p.text, p.x - camLeft, floorU - p.y)
    }
    g.globalAlpha = 1
  }

  /** Overdrive edge glow + crash/overdrive flash. */
  private overlayFx(e: DashEngine, time: number) {
    const g = this.g
    g.setTransform(1, 0, 0, 1, 0, 0)
    if (e.overdrive > 0 && !e.reduced) {
      if (!this.edge) this.edge = buildEdgeGlow(this.cssW, this.cssH, this.dpr)
      if (this.edge) {
        const fadeIn = clamp01((OVERDRIVE_TIME - e.overdrive) / 0.25)
        const fadeOut = clamp01(e.overdrive / 0.6)
        g.globalAlpha = (0.45 + 0.2 * Math.sin(time * 9)) * fadeIn * fadeOut
        g.drawImage(this.edge, 0, 0)
        g.globalAlpha = 1
      }
    }
    if (e.flash > 0.01) {
      g.globalAlpha = Math.min(0.7, e.flash)
      g.fillStyle = e.alive ? C.cyan : '#ffffff'
      g.fillRect(0, 0, this.canvas.width, this.canvas.height)
      g.globalAlpha = 1
    }
  }

  /* ================================================================ */
  /*  HUD (CSS pixels, drawn with the loaded brand fonts)             */
  /* ================================================================ */

  private hud(e: DashEngine, time: number) {
    const g = this.g
    const dpr = this.dpr
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    g.textBaseline = 'alphabetic'
    const w = this.cssW
    const small = w < 480
    const pad = small ? 18 : 24
    const boost = e.overdrive > 0

    const score = Math.floor(e.score)
    if (score !== this.scoreN) {
      this.scoreN = score
      this.scoreStr = padScore(score)
    }
    const best = Math.max(e.best, score)
    if (best !== this.bestN) {
      this.bestN = best
      this.bestStr = padScore(best)
    }
    const lv = Math.round(e.level * 10)
    if (lv !== this.levelN) {
      this.levelN = lv
      this.levelStr = `x${(lv / 10).toFixed(1)}`
    }

    // Left: score + overdrive meter
    g.textAlign = 'left'
    g.font = this.f.label
    g.fillStyle = C.haze
    g.fillText('SCORE', pad, pad + 8)
    g.font = this.f.score
    g.fillStyle = boost ? C.cyan : C.snow
    const scoreBase = pad + 8 + (small ? 24 : 32)
    g.fillText(this.scoreStr, pad, scoreBase)
    this.meter(e, pad, scoreBase + 11, small, time)

    // Right: best + speed
    g.textAlign = 'right'
    g.font = this.f.label
    g.fillStyle = C.haze
    g.fillText('BEST', w - pad, pad + 8)
    const valueY = pad + 8 + (small ? 18 : 22)
    g.font = this.f.value
    g.fillStyle = e.best > 0 && score > e.best ? C.volt : C.mist
    g.fillText(this.bestStr, w - pad, valueY)
    g.font = this.f.label
    g.fillStyle = C.haze
    g.fillText('SPEED', w - pad, valueY + 17)
    g.font = this.f.value
    g.fillStyle = e.level >= 1.8 ? C.volt : e.level >= 1.4 ? C.cyan : C.snow
    g.fillText(this.levelStr, w - pad, valueY + 17 + (small ? 17 : 20))

    if (e.phase !== 'playing') return

    // First-seconds coaching
    if (e.countdown <= 0 && e.time < 4.4) {
      g.textAlign = 'center'
      g.font = this.f.hint
      g.fillStyle = C.mist
      g.globalAlpha = clamp01((4.4 - e.time) / 1.2) * clamp01(e.time / 0.3 + 0.2)
      const y = this.floorU * this.s * 0.4
      if (small) {
        g.fillText('TAP = JUMP  ·  HOLD = HIGHER', w / 2, y)
        g.fillText('TAP AGAIN IN AIR = DOUBLE JUMP', w / 2, y + 16)
      } else {
        g.fillText('SPACE / TAP = JUMP   ·   HOLD = HIGHER   ·   AGAIN IN AIR = DOUBLE JUMP', w / 2, y)
      }
      g.globalAlpha = 1
    }

    // Resume countdown
    if (e.countdown > 0) {
      const per = RESUME_COUNTDOWN / 3
      const n = Math.max(1, Math.ceil(e.countdown / per))
      const into = 1 - (e.countdown - (n - 1) * per) / per
      const scale = 1.3 - 0.3 * (1 - (1 - into) ** 3)
      g.save()
      g.translate(w / 2, this.cssH * 0.42)
      g.scale(scale, scale)
      g.globalAlpha = 1 - into * 0.55
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = this.f.big
      g.fillStyle = C.snow
      g.fillText(n === 3 ? '3' : n === 2 ? '2' : '1', 0, 0)
      g.restore()
      g.globalAlpha = 1
    }
  }

  private meter(e: DashEngine, x: number, y: number, small: boolean, time: number) {
    const g = this.g
    const seg = small ? 12 : 16
    const h = small ? 6 : 7
    const gap = 3
    const sk = h * SLANT
    const boost = e.overdrive > 0
    const lit = (boost ? e.overdrive / OVERDRIVE_TIME : e.charge) * METER_SEGMENTS
    for (let i = 0; i < METER_SEGMENTS; i++) {
      const x0 = x + i * (seg + gap)
      g.beginPath()
      g.moveTo(x0, y + h)
      g.lineTo(x0 + seg, y + h)
      g.lineTo(x0 + seg + sk, y)
      g.lineTo(x0 + sk, y)
      g.closePath()
      g.fillStyle = 'rgba(255,255,255,0.1)'
      g.fill()
      const on = lit - i
      if (on > 0) {
        g.globalAlpha = on >= 1 ? 1 : 0.35 + on * 0.65
        g.fillStyle = boost ? (Math.sin(time * 16 + i) > 0 ? C.cyan : C.volt) : C.volt
        g.fill()
        g.globalAlpha = 1
      }
    }
    g.textAlign = 'left'
    g.font = this.f.label
    g.fillStyle = boost ? C.cyan : 'rgba(108,120,156,0.8)'
    g.fillText(boost ? 'OVERDRIVE x2' : 'OVERDRIVE', x + METER_SEGMENTS * (seg + gap) + sk + 6, y + h)
  }
}
