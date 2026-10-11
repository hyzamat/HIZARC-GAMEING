import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

type Particle = {
  x: number
  y: number
  /** 0 (far) → 1 (near): drives size, speed and brightness for a cheap depth effect */
  z: number
  r: number
  alpha: number
  /** twinkle speed (rad/s) and phase */
  tw: number
  ph: number
  /** horizontal sway amplitude (px/s) */
  sway: number
  sprite: number
}

/** white · ice · cyan · blue · violet — weighted toward the cool whites */
const PALETTE: [number, number, number][] = [
  [255, 255, 255],
  [191, 224, 255],
  [46, 230, 255],
  [61, 155, 255],
  [124, 92, 255],
]
const WEIGHTS = [0.34, 0.26, 0.18, 0.15, 0.07]

const PHONE_COUNT = 44
const DESKTOP_COUNT = 110

function pickSprite() {
  let r = Math.random()
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i]
    if (r <= 0) return i
  }
  return 0
}

function spawn(w: number, h: number, anywhere: boolean): Particle {
  const z = Math.random() ** 1.8 // most motes are far away, a few are close
  return {
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 12 + Math.random() * 40,
    z,
    r: 0.5 + z * 1.7,
    alpha: 0.25 + z * 0.6,
    tw: 0.6 + Math.random() * 1.8,
    ph: Math.random() * Math.PI * 2,
    sway: 2 + Math.random() * 7,
    sprite: pickSprite(),
  }
}

let spriteCache: HTMLCanvasElement[] | null = null

/** Pre-rendered soft glow dots: drawImage of a sprite is far cheaper than shadowBlur or per-frame gradients. Built once, shared by every mount. */
function getSprites() {
  spriteCache ??= makeSprites()
  return spriteCache
}

function makeSprites() {
  return PALETTE.map(([r, g, b]) => {
    const size = 48
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (ctx) {
      const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      grd.addColorStop(0, `rgba(255,255,255,1)`)
      grd.addColorStop(0.12, `rgba(${r},${g},${b},1)`)
      grd.addColorStop(0.32, `rgba(${r},${g},${b},0.28)`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, size, size)
    }
    return c
  })
}

type ParticleFieldProps = {
  /** Run the animation loop (pass false when the hero is off-screen or not yet revealed). */
  active: boolean
  className?: string
}

/**
 * Lightweight rising "energy motes" on a 2D canvas.
 * ≤ 44 particles on phones / ≤ 110 on desktop, DPR capped at 2, loop paused when
 * inactive or the tab is hidden. Reduced motion → a single static frame.
 */
export function ParticleField({ active, className }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const reduce = useReducedMotion()
  const animate = active && !reduce

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const sprites = getSprites()
    let w = 0
    let h = 0
    let raf = 0
    let last = 0
    let running = false
    let clock = 0

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles.current) {
        const twinkle = 0.55 + 0.45 * Math.sin(clock * p.tw + p.ph)
        const size = p.r * 7
        ctx.globalAlpha = p.alpha * twinkle
        ctx.drawImage(sprites[p.sprite], p.x - size / 2, p.y - size / 2, size, size)
      }
      ctx.globalAlpha = 1
    }

    const step = (dt: number) => {
      clock += dt
      for (const p of particles.current) {
        // rise (near motes rise faster) + a gentle sideways sway and drift
        p.y -= (7 + p.z * 26) * dt
        p.x += (Math.sin(clock * 0.35 + p.ph) * p.sway + 2.5) * dt
        if (p.y < -16) Object.assign(p, spawn(w, h, false))
        if (p.x > w + 16) p.x = -16
      }
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const target = w < 768 ? PHONE_COUNT : DESKTOP_COUNT
      const list = particles.current
      if (list.length > target) list.length = target
      while (list.length < target) list.push(spawn(w, h, true))
      // keep existing motes inside the new bounds
      for (const p of list) {
        if (p.x > w) p.x = Math.random() * w
        if (p.y > h + 60) p.y = Math.random() * h
      }
      draw() // canvas resize clears the bitmap; repaint immediately
    }

    const frame = (t: number) => {
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000))
      last = t
      step(dt)
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || !animate || document.hidden) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [animate])

  return <canvas ref={canvasRef} aria-hidden className={cn('pointer-events-none absolute inset-0 size-full', className)} />
}
