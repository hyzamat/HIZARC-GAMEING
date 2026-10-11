import { LOGO_PIECES } from '@/components/brand/Logo'
import type { CelebrateIntensity } from '@/lib/celebrate'

/**
 * Canvas confetti made of the four Hizarc "H" pieces.
 * Plain 2D canvas, DPR ≤ 2, one rAF loop that only runs while something is
 * on screen; the backing store is released (0×0) as soon as the last piece lands.
 */

type Shape = Path2D

/** [front, back] — the back face is shown while a piece is flipped over. */
const PALETTE: [string, string][] = [
  ['#f4f7ff', '#a9bde6'], // white
  ['#0a7cff', '#0656b5'], // Hizarc blue
  ['#2ee6ff', '#18a4bd'], // cyan
  ['#d7ff3a', '#9ab826'], // volt (rarer)
]
/** Cumulative weights for PALETTE (volt is the rare accent). */
const WEIGHTS = [0.3, 0.64, 0.9, 1]

const GRAVITY = 1350 // px/s²
const MAX_PIECES = 420
const FADE = 0.55 // s

type Piece = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  flip: number
  vflip: number
  wobble: number
  vwobble: number
  wobbleAmp: number
  drag: number
  size: number
  shape: number
  color: number
  life: number
  ttl: number
}

type Ring = {
  x: number
  y: number
  /** Negative = waiting to start. */
  age: number
  ttl: number
  radius: number
  width: number
  color: string
  alpha: number
}

type Flash = { x: number; y: number; age: number; ttl: number; radius: number }

/** Normalise each logo polygon to a unit-sized path centred on its own bounding box. */
function buildShapes(): Shape[] {
  return LOGO_PIECES.map((piece) => {
    const pts = piece.points.split(/\s+/).map((pair) => pair.split(',').map(Number) as [number, number])
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...xs) - minX
    const h = Math.max(...ys) - minY
    const cx = minX + w / 2
    const cy = minY + h / 2
    const k = 1 / Math.max(w, h)
    const path = new Path2D()
    pts.forEach(([x, y], i) => {
      const px = (x - cx) * k
      const py = (y - cy) * k
      if (i === 0) path.moveTo(px, py)
      else path.lineTo(px, py)
    })
    path.closePath()
    return path
  })
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function pickColor() {
  const r = Math.random()
  return WEIGHTS.findIndex((w) => r <= w)
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export type BurstOptions = { x?: number; y?: number; intensity: CelebrateIntensity }

export type ConfettiEngine = {
  burst: (opts: BurstOptions) => void
  destroy: () => void
}

export function createConfetti(canvas: HTMLCanvasElement): ConfettiEngine | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const shapes = buildShapes()

  let pieces: Piece[] = []
  let rings: Ring[] = []
  let flashes: Flash[] = []
  let raf = 0
  let last = 0
  let w = 0
  let h = 0
  let dpr = 1

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth || window.innerWidth
    h = canvas.clientHeight || window.innerHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }

  /** Free the (potentially large) backing store while idle. */
  const release = () => {
    canvas.width = 0
    canvas.height = 0
    window.removeEventListener('resize', resize)
  }

  const step = (dt: number) => {
    // Pieces — compact in place instead of splicing.
    let n = 0
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i]
      const k = Math.exp(-p.drag * dt)
      p.vx *= k
      p.vy = p.vy * k + GRAVITY * dt * k
      p.wobble += p.vwobble * dt
      p.x += (p.vx + Math.sin(p.wobble) * p.wobbleAmp) * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.flip += p.vflip * dt
      p.life += dt
      const gone = p.life >= p.ttl || p.y > h + 60 || p.x < -80 || p.x > w + 80
      if (!gone) pieces[n++] = p
    }
    pieces.length = n

    // Rings / flashes: age + compact in place (no per-frame arrays).
    let r = 0
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i]
      ring.age += dt
      if (ring.age < ring.ttl) rings[r++] = ring
    }
    rings.length = r
    let f = 0
    for (let i = 0; i < flashes.length; i++) {
      const flash = flashes[i]
      flash.age += dt
      if (flash.age < flash.ttl) flashes[f++] = flash
    }
    flashes.length = f
  }

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (flashes.length || rings.length) {
      ctx.globalCompositeOperation = 'lighter'
      for (const f of flashes) {
        const t = f.age / f.ttl
        const r = f.radius * (0.6 + 0.4 * easeOutCubic(t))
        const g = ctx.createRadialGradient(f.x * dpr, f.y * dpr, 0, f.x * dpr, f.y * dpr, r * dpr)
        g.addColorStop(0, `rgba(46, 230, 255, ${0.32 * (1 - t)})`)
        g.addColorStop(0.45, `rgba(10, 124, 255, ${0.16 * (1 - t)})`)
        g.addColorStop(1, 'rgba(10, 124, 255, 0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.fillRect((f.x - r) * dpr, (f.y - r) * dpr, r * 2 * dpr, r * 2 * dpr)
      }
      for (const ring of rings) {
        if (ring.age < 0) continue
        const t = ring.age / ring.ttl
        const radius = ring.radius * easeOutCubic(t)
        ctx.globalAlpha = ring.alpha * (1 - t) * (1 - t)
        ctx.strokeStyle = ring.color
        ctx.lineWidth = Math.max(0.5, ring.width * (1 - t)) * dpr
        ctx.beginPath()
        ctx.arc(ring.x * dpr, ring.y * dpr, radius * dpr, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    for (const p of pieces) {
      const fade = p.ttl - p.life
      ctx.globalAlpha = fade < FADE ? Math.max(0, fade / FADE) : 1
      // Fake 3D tumble: squash the X axis by cos(flip); show the darker back face when negative.
      const tumble = Math.cos(p.flip)
      const kx = p.size * (Math.abs(tumble) < 0.08 ? 0.08 * Math.sign(tumble || 1) : tumble) * dpr
      const ky = p.size * dpr
      const cos = Math.cos(p.rot)
      const sin = Math.sin(p.rot)
      ctx.setTransform(kx * cos, kx * sin, -ky * sin, ky * cos, p.x * dpr, p.y * dpr)
      ctx.fillStyle = PALETTE[p.color][tumble >= 0 ? 0 : 1]
      ctx.fill(shapes[p.shape])
    }
    ctx.globalAlpha = 1
  }

  const frame = (now: number) => {
    // Clamp both ways: the first rAF timestamp can precede the performance.now() taken in start().
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
    last = now
    step(dt)
    draw()
    if (pieces.length === 0 && rings.length === 0 && flashes.length === 0) {
      raf = 0
      release()
      return
    }
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (raf) return
    window.addEventListener('resize', resize)
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const burst = ({ x, y, intensity }: BurstOptions) => {
    // Size the canvas first so w/h are current for spawn maths.
    if (!raf) resize()
    const ox = x ?? w / 2
    const oy = y ?? h / 2
    const big = intensity === 'big'
    const phone = w < 640
    // Scale throw distance with the viewport so phones don't overshoot.
    const reach = Math.min(Math.max(Math.min(w, h) / 900, 0.6), 1.25)
    const count = big ? (phone ? 120 : 160) : phone ? 40 : 50
    const room = Math.max(0, MAX_PIECES - pieces.length)

    for (let i = 0; i < Math.min(count, room); i++) {
      // Big: full 360° blast with an upward bias. Small: an upward fountain.
      const angle = big ? rand(0, Math.PI * 2) : -Math.PI / 2 + rand(-1, 1) * rand(0.35, 1.05)
      const speed = (big ? rand(520, 1650) : rand(380, 1050)) * reach
      const size = rand(8, 28)
      pieces.push({
        x: ox + rand(-8, 8),
        y: oy + rand(-8, 8),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (big ? rand(120, 380) * reach : 0),
        rot: rand(0, Math.PI * 2),
        vr: rand(-7, 7),
        flip: rand(0, Math.PI * 2),
        vflip: rand(4, 11) * (Math.random() < 0.5 ? -1 : 1),
        wobble: rand(0, Math.PI * 2),
        vwobble: rand(3, 7),
        wobbleAmp: rand(18, 60),
        // Smaller pieces catch more air → slower, floatier fall.
        drag: 2.6 + 14 / size,
        size,
        shape: Math.floor(Math.random() * shapes.length),
        color: pickColor(),
        life: 0,
        ttl: big ? rand(2.6, 4) : rand(1.8, 3),
      })
    }

    if (big) {
      const span = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy))
      rings.push(
        { x: ox, y: oy, age: 0, ttl: 0.8, radius: span * 0.95, width: 4, color: '#2ee6ff', alpha: 0.95 },
        { x: ox, y: oy, age: -0.08, ttl: 1, radius: span * 0.7, width: 14, color: '#0a7cff', alpha: 0.4 },
        { x: ox, y: oy, age: -0.16, ttl: 0.9, radius: span * 0.45, width: 2, color: '#d7ff3a', alpha: 0.7 },
      )
      flashes.push({ x: ox, y: oy, age: 0, ttl: 0.45, radius: Math.min(w, h) * 0.45 })
    } else {
      rings.push({ x: ox, y: oy, age: 0, ttl: 0.5, radius: 90 * reach, width: 2.5, color: '#2ee6ff', alpha: 0.8 })
    }

    start()
  }

  const destroy = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    pieces = []
    rings = []
    flashes = []
    release()
  }

  return { burst, destroy }
}
