import { memo, useEffect, useId, useMemo, useRef, type ReactNode } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import type { ArtMotif, ArtPalette } from '@/data/games'
import { cn } from '@/lib/cn'

/**
 * Procedural, lightly animated key art for games that don't have artwork yet.
 * Pure SVG (no filters) so it stays cheap on phones; SMIL animations pause
 * automatically while off-screen and are disabled for reduced motion.
 *
 * The SVG uses a 1600×1000 canvas with `slice` scaling, so it fills ANY box —
 * the parent decides the size/aspect ratio (e.g. `aspect-[16/10]` or `h-full`).
 * Pass `image` to show real artwork instead.
 */

const W = 1600
const H = 1000

type GameArtProps = {
  palette: ArtPalette
  motif: ArtMotif
  /** Stable seed (use the game slug) so the art never changes between renders. */
  seed?: string
  /** Real artwork URL. When set, it is shown instead of the generated art. */
  image?: string
  alt?: string
  /** Subtle looping motion (default true). Auto-disabled for reduced motion. */
  animated?: boolean
  className?: string
  children?: ReactNode
}

export const GameArt = memo(function GameArt({ palette, motif, seed = motif, image, alt = '', animated = true, className, children }: GameArtProps) {
  const reduce = useReducedMotion()
  const live = animated && !reduce
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const inView = useInView(svgRef, { margin: '200px 0px' })

  const content = useMemo(() => {
    const rand = mulberry32(hashString(`${seed}:${motif}`))
    const id = (name: string) => `ga-${uid}-${name}`
    const props: MotifProps = { p: palette, id, url: (name) => `url(#${id(name)})`, rand, live }
    return MOTIFS[motif](props)
  }, [palette, motif, seed, uid, live])

  // Pause SMIL animations when off-screen (saves battery on long pages).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    try {
      if (live && inView) svg.unpauseAnimations()
      else svg.pauseAnimations()
    } catch {
      /* older engines */
    }
  }, [inView, live])

  return (
    <div className={cn('relative isolate overflow-hidden', className)} style={{ backgroundColor: palette.from }}>
      {image ? (
        <img src={image} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        >
          {content}
          {/* shared vignette */}
          <defs>
            <radialGradient id={`ga-${uid}-vig`} cx="50%" cy="45%" r="75%">
              <stop offset="55%" stopColor={palette.from} stopOpacity="0" />
              <stop offset="100%" stopColor={palette.from} stopOpacity="0.85" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#ga-${uid}-vig)`} />
        </svg>
      )}
      {children}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/*  helpers                                                           */
/* ------------------------------------------------------------------ */

type MotifProps = {
  p: ArtPalette
  id: (name: string) => string
  url: (name: string) => string
  rand: () => number
  live: boolean
}

function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Mix two hex colours: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const r1 = (n: number) => Math.round(n * 10) / 10

function Stars({ rand, count, maxY, color, live, twinkle = 0.15 }: { rand: () => number; count: number; maxY: number; color: string; live: boolean; twinkle?: number }) {
  const stars = []
  for (let i = 0; i < count; i++) {
    const x = r1(rand() * W)
    const y = r1(rand() * maxY)
    const r = r1(0.8 + rand() * 2.2)
    const o = r1(0.25 + rand() * 0.75)
    const tw = live && rand() < twinkle
    const dur = `${(2 + rand() * 4).toFixed(1)}s`
    stars.push(
      <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o}>
        {tw && <animate attributeName="opacity" values={`${o};0.1;${o}`} dur={dur} repeatCount="indefinite" />}
      </circle>,
    )
  }
  return <g>{stars}</g>
}

function Glow({ id, cx, cy, r, color, opacity = 0.6 }: { id: string; cx: number; cy: number; r: number; color: string; opacity?: number }) {
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  motifs                                                            */
/* ------------------------------------------------------------------ */

const MOTIFS: Record<ArtMotif, (m: MotifProps) => ReactNode> = {
  /* Synthwave sun + perspective grid that rushes toward you */
  grid({ p, id, url, rand, live }) {
    const horizon = 610
    const vx = 800
    const N = 12
    const ys = Array.from({ length: N + 1 }, (_, k) => horizon + (H - horizon) * Math.pow(k / N, 2.1))
    const mountains: string[] = [`0,${horizon}`]
    for (let x = 0; x <= W; x += 80) mountains.push(`${x},${r1(horizon - 20 - rand() * (Math.abs(x - vx) > 320 ? 150 : 40))}`)
    mountains.push(`${W},${horizon}`)
    const stripes = [0, 1, 2, 3, 4, 5].map((i) => ({ y: 480 + i * 34 + i * i * 2, h: 4 + i * 3 }))
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="70%" stopColor={mix(p.from, p.via, 0.55)} />
            <stop offset="100%" stopColor={mix(p.via, p.to, 0.35)} />
          </linearGradient>
          <linearGradient id={id('sun')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mix(p.to, '#fff4a8', 0.55)} />
            <stop offset="100%" stopColor={p.to} />
          </linearGradient>
          <mask id={id('sunmask')}>
            <rect width={W} height={H} fill="#fff" />
            {stripes.map((s, i) => (
              <rect key={i} x="0" y={s.y} width={W} height={s.h} fill="#000" />
            ))}
          </mask>
          <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mix(p.from, p.via, 0.3)} />
            <stop offset="100%" stopColor={p.from} />
          </linearGradient>
          <linearGradient id={id('gl')} gradientUnits="userSpaceOnUse" x1="0" y1={horizon} x2="0" y2={H}>
            <stop offset="0%" stopColor={p.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={p.accent} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <Stars rand={rand} count={70} maxY={420} color="#ffffff" live={live} />
        <Glow id={id('sunglow')} cx={vx} cy={470} r={520} color={p.to} opacity={0.55} />
        <circle cx={vx} cy={470} r={250} fill={url('sun')} mask={url('sunmask')} />
        <polygon points={mountains.join(' ')} fill={mix(p.from, p.via, 0.25)} stroke={p.to} strokeOpacity="0.6" strokeWidth="2" />
        <rect y={horizon} width={W} height={H - horizon} fill={url('ground')} />
        <g stroke={url('gl')} strokeWidth="2.5">
          {Array.from({ length: 29 }, (_, k) => k - 14).map((i) => (
            <line key={i} x1={vx + i * 16} y1={horizon} x2={vx + i * 240} y2={H} />
          ))}
          {ys.slice(0, N).map((y, k) => (
            <line key={k} x1="0" x2={W} y1={r1(y)} y2={r1(y)}>
              {live && <animate attributeName="y1" values={`${r1(y)};${r1(ys[k + 1])}`} dur="1.4s" repeatCount="indefinite" />}
              {live && <animate attributeName="y2" values={`${r1(y)};${r1(ys[k + 1])}`} dur="1.4s" repeatCount="indefinite" />}
            </line>
          ))}
        </g>
        <rect y={horizon - 2} width={W} height="4" fill={p.accent} opacity="0.9" />
        <Glow id={id('hz')} cx={vx} cy={horizon} r={700} color={p.accent} opacity={0.18} />
      </g>
    )
  },

  /* Layered desert dunes under a low sun, with wind-blown sand */
  dunes({ p, id, url, rand, live }) {
    const dune = (base: number, amp: number) => {
      let d = `M0 ${base}`
      let x = 0
      let y = base
      while (x < W) {
        const nx = Math.min(W, x + 260 + rand() * 260)
        const ny = base + (rand() - 0.5) * amp
        d += ` C${r1(x + (nx - x) * 0.45)} ${r1(y - amp * 0.6)} ${r1(x + (nx - x) * 0.55)} ${r1(ny - amp * 0.6)} ${r1(nx)} ${r1(ny)}`
        x = nx
        y = ny
      }
      return d
    }
    const layers = [
      { base: 560, amp: 120, t: 0.15 },
      { base: 650, amp: 140, t: 0.45 },
      { base: 760, amp: 150, t: 0.7 },
      { base: 880, amp: 120, t: 0.9 },
    ].map((l) => ({ ...l, d: dune(l.base, l.amp) }))
    const streaks = Array.from({ length: 22 }, () => ({
      x: rand() * W,
      y: 250 + rand() * 650,
      w: 80 + rand() * 260,
      o: 0.08 + rand() * 0.22,
      dur: 2.5 + rand() * 3,
    }))
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="55%" stopColor={mix(p.from, p.via, 0.7)} />
            <stop offset="100%" stopColor={p.to} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <Glow id={id('sunglow')} cx={1120} cy={520} r={560} color={p.to} opacity={0.7} />
        <circle cx={1120} cy={520} r={140} fill={p.accent} opacity="0.95" />
        {layers.map((l, i) => (
          <g key={i}>
            <path d={`${l.d} L${W} ${H} L0 ${H} Z`} fill={mix(p.via, p.from, l.t)} />
            <path d={l.d} fill="none" stroke={p.to} strokeOpacity={0.45 - i * 0.08} strokeWidth="3" />
          </g>
        ))}
        <g stroke={p.accent} strokeLinecap="round" strokeWidth="2">
          {streaks.map((s, i) => (
            <line key={i} x1={r1(s.x)} y1={r1(s.y)} x2={r1(s.x + s.w)} y2={r1(s.y - s.w * 0.08)} opacity={r1(s.o * 10) / 10}>
              {live && <animateTransform attributeName="transform" type="translate" values={`-300 0;${W} 0`} dur={`${s.dur.toFixed(1)}s`} repeatCount="indefinite" />}
            </line>
          ))}
        </g>
      </g>
    )
  },

  /* Ringed planet, orbit paths and travelling moons */
  orbit({ p, id, url, rand, live }) {
    const cx = 800
    const cy = 520
    const orbits = [430, 580, 740]
    const ell = (rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`
    return (
      <g>
        <defs>
          <radialGradient id={id('bg')} cx="50%" cy="52%" r="70%">
            <stop offset="0%" stopColor={mix(p.via, p.from, 0.35)} />
            <stop offset="100%" stopColor={p.from} />
          </radialGradient>
          <radialGradient id={id('planet')} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor={p.to} />
            <stop offset="45%" stopColor={p.via} />
            <stop offset="100%" stopColor={p.from} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={url('bg')} />
        <Glow id={id('neb1')} cx={360} cy={260} r={420} color={p.to} opacity={0.22} />
        <Glow id={id('neb2')} cx={1300} cy={800} r={480} color={p.via} opacity={0.4} />
        <Stars rand={rand} count={150} maxY={H} color="#ffffff" live={live} twinkle={0.2} />
        <g transform={`rotate(-14 ${cx} ${cy})`}>
          {orbits.map((rx, i) => (
            <path key={rx} d={ell(rx, rx * 0.28)} fill="none" stroke="#ffffff" strokeOpacity={0.14} strokeWidth="2" strokeDasharray={i === 1 ? '6 10' : undefined} />
          ))}
          {/* ring — back half */}
          <path d={`M${cx - 300} ${cy} a300 64 0 0 1 600 0`} fill="none" stroke={p.accent} strokeOpacity="0.55" strokeWidth="10" />
        </g>
        <Glow id={id('pglow')} cx={cx} cy={cy} r={340} color={p.to} opacity={0.45} />
        <circle cx={cx} cy={cy} r={170} fill={url('planet')} />
        <g transform={`rotate(-14 ${cx} ${cy})`}>
          {/* ring — front half */}
          <path d={`M${cx - 300} ${cy} a300 64 0 0 0 600 0`} fill="none" stroke={p.accent} strokeOpacity="0.9" strokeWidth="10" />
          <path d={`M${cx - 340} ${cy} a340 76 0 0 0 680 0`} fill="none" stroke={p.accent} strokeOpacity="0.35" strokeWidth="3" />
          {orbits.map((rx, i) => {
            const path = ell(rx, rx * 0.28)
            const begin = `${(-rand() * 10).toFixed(1)}s`
            return (
              <g key={rx}>
                <circle r={i === 2 ? 14 : 9} fill={i === 0 ? p.accent : '#ffffff'} cx={live ? 0 : cx + rx} cy={live ? 0 : cy}>
                  {live && <animateMotion dur={`${10 + i * 6}s`} begin={begin} repeatCount="indefinite" path={path} />}
                </circle>
              </g>
            )
          })}
        </g>
      </g>
    )
  },

  /* Futuristic neon skyline at sunset */
  skyline({ p, id, url, rand, live }) {
    const base = 860
    const far: { x: number; w: number; h: number }[] = []
    for (let x = -20; x < W; ) {
      const w = 50 + rand() * 90
      far.push({ x, w, h: 160 + rand() * 300 })
      x += w + 6 + rand() * 20
    }
    const near: { x: number; w: number; h: number }[] = []
    for (let x = -30; x < W; ) {
      const w = 70 + rand() * 120
      near.push({ x, w, h: 90 + rand() * 230 })
      x += w + 4 + rand() * 30
    }
    const windows: { x: number; y: number }[] = []
    near.forEach((b) => {
      for (let wy = base - b.h + 18; wy < base - 10; wy += 22)
        for (let wx = b.x + 10; wx < b.x + b.w - 12; wx += 18) if (rand() < 0.22) windows.push({ x: wx, y: wy })
    })
    const spireX = 560
    const spire = [
      `${spireX - 70},${base}`,
      `${spireX - 70},${base - 260}`,
      `${spireX - 46},${base - 260}`,
      `${spireX - 46},${base - 440}`,
      `${spireX - 26},${base - 440}`,
      `${spireX - 26},${base - 580}`,
      `${spireX - 10},${base - 580}`,
      `${spireX - 3},${base - 790}`,
      `${spireX + 3},${base - 790}`,
      `${spireX + 10},${base - 580}`,
      `${spireX + 26},${base - 580}`,
      `${spireX + 26},${base - 400}`,
      `${spireX + 50},${base - 400}`,
      `${spireX + 50},${base - 220}`,
      `${spireX + 74},${base - 220}`,
      `${spireX + 74},${base}`,
    ].join(' ')
    const clouds = Array.from({ length: 6 }, () => ({ x: rand() * W, y: 120 + rand() * 360, w: 240 + rand() * 380, d: 40 + rand() * 50 }))
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="55%" stopColor={p.via} />
            <stop offset="100%" stopColor={p.to} />
          </linearGradient>
          <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mix(p.via, p.from, 0.35)} />
            <stop offset="100%" stopColor={mix(p.via, p.from, 0.6)} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <Glow id={id('sunglow')} cx={1150} cy={760} r={520} color={p.to} opacity={0.8} />
        <circle cx={1150} cy={760} r={170} fill={mix(p.to, '#ffffff', 0.5)} />
        <g fill="#ffffff">
          {clouds.map((c, i) => (
            <rect key={i} x={r1(c.x)} y={r1(c.y)} width={r1(c.w)} height="14" rx="7" opacity="0.14">
              {live && <animateTransform attributeName="transform" type="translate" values={`0 0;${r1(c.d)} 0;0 0`} dur={`${12 + i * 3}s`} repeatCount="indefinite" />}
            </rect>
          ))}
        </g>
        <g fill={url('far')} opacity="0.85">
          {far.map((b, i) => (
            <rect key={i} x={r1(b.x)} y={r1(base - b.h)} width={r1(b.w)} height={r1(b.h)} />
          ))}
        </g>
        <polygon points={spire} fill={mix(p.from, p.via, 0.25)} />
        <circle cx={spireX} cy={base - 790} r="5" fill={p.accent}>
          {live && <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite" />}
        </circle>
        <g fill={p.from}>
          {near.map((b, i) => (
            <rect key={i} x={r1(b.x)} y={r1(base - b.h)} width={r1(b.w)} height={r1(b.h + H - base)} />
          ))}
        </g>
        <g fill={p.to}>
          {windows.map((w, i) => (
            <rect key={i} x={r1(w.x)} y={r1(w.y)} width="8" height="11" opacity={i % 3 === 0 ? 0.9 : 0.5} />
          ))}
        </g>
        <g fill="none" stroke={p.from} strokeWidth="5" strokeLinecap="round">
          <path d="M300 300 q18 -14 36 0 q18 -14 36 0" />
          <path d="M380 250 q12 -10 24 0 q12 -10 24 0" />
          <path d="M1010 340 q14 -11 28 0 q14 -11 28 0" />
        </g>
      </g>
    )
  },

  /* Flowing layered waves with floating lanterns */
  waves({ p, id, url, rand, live }) {
    const layers = [0, 1, 2, 3, 4].map((i) => {
      const wl = 520 - i * 50
      const amp = 34 + i * 10
      const base = 520 + i * 95
      let d = `M${-wl} ${base}`
      for (let x = -wl; x <= W + wl; x += wl / 2) d += ` q${wl / 4} ${i % 2 ? amp : -amp} ${wl / 2} 0`
      return { d: `${d} L${W + wl} ${H} L${-wl} ${H} Z`, wl, fill: mix(p.via, p.from, 0.25 + i * 0.17), dur: 9 + i * 2, dir: i % 2 ? 1 : -1 }
    })
    const lanterns = Array.from({ length: 12 }, () => ({ x: 80 + rand() * (W - 160), y: 120 + rand() * 420, r: 6 + rand() * 9, dur: 6 + rand() * 6 }))
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="100%" stopColor={mix(p.from, p.via, 0.55)} />
          </linearGradient>
          <radialGradient id={id('lan')}>
            <stop offset="0%" stopColor={p.accent} stopOpacity="1" />
            <stop offset="35%" stopColor={p.to} stopOpacity="0.7" />
            <stop offset="100%" stopColor={p.to} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <Glow id={id('moonglow')} cx={1180} cy={260} r={420} color={p.to} opacity={0.5} />
        <circle cx={1180} cy={260} r={110} fill={p.accent} opacity="0.95" />
        {lanterns.map((l, i) => (
          <g key={i}>
            <circle cx={r1(l.x)} cy={r1(l.y)} r={r1(l.r * 4)} fill={url('lan')}>
              {live && <animate attributeName="cy" values={`${r1(l.y)};${r1(l.y - 40)};${r1(l.y)}`} dur={`${l.dur.toFixed(1)}s`} repeatCount="indefinite" />}
            </circle>
          </g>
        ))}
        {layers.map((l, i) => (
          <path key={i} d={l.d} fill={l.fill} stroke={p.to} strokeOpacity={0.35 - i * 0.05} strokeWidth="2">
            {live && <animateTransform attributeName="transform" type="translate" values={`0 0;${l.dir * l.wl} 0`} dur={`${l.dur}s`} repeatCount="indefinite" />}
          </path>
        ))}
      </g>
    )
  },

  /* Isometric hex battlefield with a highlighted path */
  hex({ p, id, url, rand, live }) {
    const R = 64
    const hw = Math.sqrt(3) * R
    const hexPts = (cx: number, cy: number) =>
      Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + Math.PI / 6
        return `${r1(cx + R * 0.94 * Math.cos(a))},${r1(cy + R * 0.94 * Math.sin(a))}`
      }).join(' ')
    const cells: { x: number; y: number; kind: number; pulse: boolean }[] = []
    for (let row = -6; row <= 6; row++)
      for (let col = -8; col <= 8; col++) {
        const x = col * hw + (row % 2 ? hw / 2 : 0)
        const y = row * R * 1.5
        if (Math.hypot(x, y * 1.2) > 900) continue
        const r = rand()
        cells.push({ x, y, kind: r < 0.08 ? 2 : r < 0.3 ? 1 : 0, pulse: r < 0.05 })
      }
    const pathCells = [
      [-3, 1],
      [-2, 1],
      [-1, 0],
      [0, 0],
      [1, -1],
      [2, -1],
    ].map(([c, r]) => ({ x: c * hw + (r % 2 ? hw / 2 : 0), y: r * R * 1.5 }))
    return (
      <g>
        <defs>
          <radialGradient id={id('bg')} cx="50%" cy="55%" r="65%">
            <stop offset="0%" stopColor={mix(p.via, p.from, 0.3)} />
            <stop offset="100%" stopColor={p.from} />
          </radialGradient>
          <linearGradient id={id('fog')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} stopOpacity="1" />
            <stop offset="40%" stopColor={p.from} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('bg')} />
        <g transform="translate(800 600) scale(1 0.58) rotate(12)">
          {cells.map((c, i) => (
            <polygon
              key={i}
              points={hexPts(c.x, c.y)}
              fill={c.kind === 2 ? p.to : c.kind === 1 ? p.via : 'transparent'}
              fillOpacity={c.kind === 2 ? 0.35 : c.kind === 1 ? 0.28 : 0}
              stroke={p.to}
              strokeOpacity="0.3"
              strokeWidth="2.5"
            >
              {live && c.pulse && <animate attributeName="fill-opacity" values="0.1;0.6;0.1" dur="3s" repeatCount="indefinite" />}
            </polygon>
          ))}
          {pathCells.map((c, i) => (
            <polygon key={`p${i}`} points={hexPts(c.x, c.y)} fill={p.accent} fillOpacity={0.15 + i * 0.1} stroke={p.accent} strokeWidth="4">
              {live && <animate attributeName="fill-opacity" values={`0.1;0.75;0.1`} dur="2.4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />}
            </polygon>
          ))}
        </g>
        <Glow id={id('unit')} cx={800} cy={600} r={260} color={p.to} opacity={0.35} />
        <polygon points="800,470 836,600 800,640 764,600" fill={p.accent} opacity="0.95" />
        <polygon points="800,470 836,600 800,640" fill="#ffffff" opacity="0.25" />
        <rect width={W} height={H} fill={url('fog')} />
      </g>
    )
  },

  /* Monolith towers with the Hizarc slant (≈28°) and light beams */
  shards({ p, id, url, rand, live }) {
    const slope = 0.54 // matches the logo's diagonal cuts
    const towers: { x: number; w: number; top: number }[] = []
    for (let x = -40; x < W; ) {
      const w = 60 + rand() * 120
      const dist = Math.abs(x + w / 2 - 800) / 800
      towers.push({ x, w, top: 140 + dist * 380 + rand() * 220 })
      x += w + 10 + rand() * 40
    }
    const tallest = towers.reduce((a, b) => (b.top < a.top ? b : a))
    const parts = Array.from({ length: 28 }, () => ({ x: rand() * W, y: 300 + rand() * 700, r: 1.5 + rand() * 2.5, dur: 6 + rand() * 8 }))
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="100%" stopColor={mix(p.via, p.from, 0.5)} />
          </linearGradient>
          <linearGradient id={id('tower')} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2={H}>
            <stop offset="0%" stopColor={p.via} />
            <stop offset="100%" stopColor={p.from} />
          </linearGradient>
          <linearGradient id={id('beam')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.to} stopOpacity="0.35" />
            <stop offset="100%" stopColor={p.to} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <Glow id={id('core')} cx={800} cy={180} r={620} color={p.to} opacity={0.4} />
        <g fill={url('beam')}>
          <polygon points="760,0 840,0 1200,1000 400,1000" opacity="0.5" />
          <polygon points="790,0 810,0 980,1000 620,1000" opacity="0.7" />
        </g>
        {towers.map((t, i) => (
          <g key={i}>
            <polygon points={`${r1(t.x)},${r1(t.top)} ${r1(t.x + t.w)},${r1(t.top + t.w * slope)} ${r1(t.x + t.w)},${H} ${r1(t.x)},${H}`} fill={url('tower')} />
            <line x1={r1(t.x)} y1={r1(t.top)} x2={r1(t.x)} y2={H} stroke={p.to} strokeOpacity="0.45" strokeWidth="2" />
            <line x1={r1(t.x)} y1={r1(t.top)} x2={r1(t.x + t.w)} y2={r1(t.top + t.w * slope)} stroke={p.accent} strokeOpacity="0.7" strokeWidth="2" />
          </g>
        ))}
        <Glow id={id('beacon')} cx={tallest.x} cy={tallest.top} r={90} color={p.accent} opacity={0.9} />
        <circle cx={tallest.x} cy={tallest.top} r="6" fill="#ffffff">
          {live && <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />}
        </circle>
        <g fill={p.accent}>
          {parts.map((q, i) => (
            <circle key={i} cx={r1(q.x)} cy={r1(q.y)} r={r1(q.r)} opacity="0.6">
              {live && <animateTransform attributeName="transform" type="translate" values="0 0;0 -260" dur={`${q.dur.toFixed(1)}s`} repeatCount="indefinite" />}
              {live && <animate attributeName="opacity" values="0;0.8;0" dur={`${q.dur.toFixed(1)}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
      </g>
    )
  },

  /* Rotating arcane portal rings */
  rings({ p, id, url, rand, live }) {
    const cx = 800
    const cy = 500
    const rings = [
      { r: 120, dash: '4 14', w: 6, o: 0.9, dur: 14, dir: 1 },
      { r: 190, dash: '60 20 8 20', w: 4, o: 0.6, dur: 26, dir: -1 },
      { r: 270, dash: '2 10', w: 10, o: 0.45, dur: 40, dir: 1 },
      { r: 350, dash: '140 40', w: 3, o: 0.5, dur: 34, dir: -1 },
      { r: 450, dash: '1 18', w: 14, o: 0.25, dur: 60, dir: 1 },
      { r: 560, dash: '300 60 20 60', w: 2, o: 0.3, dur: 80, dir: -1 },
    ]
    const motes = Array.from({ length: 40 }, () => {
      const a = rand() * Math.PI * 2
      const d = 140 + rand() * 520
      return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.9, r: 1.5 + rand() * 3 }
    })
    return (
      <g>
        <defs>
          <radialGradient id={id('bg')} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor={mix(p.via, p.from, 0.2)} />
            <stop offset="100%" stopColor={p.from} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={url('bg')} />
        <Glow id={id('core')} cx={cx} cy={cy} r={420} color={p.to} opacity={0.55} />
        <g fill="none" strokeLinecap="round">
          {rings.map((g, i) => (
            <circle key={i} cx={cx} cy={cy} r={g.r} stroke={i % 2 ? p.to : p.accent} strokeOpacity={g.o} strokeWidth={g.w} strokeDasharray={g.dash}>
              {live && (
                <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} ${cy};${g.dir * 360} ${cx} ${cy}`} dur={`${g.dur}s`} repeatCount="indefinite" />
              )}
            </circle>
          ))}
        </g>
        <Glow id={id('eye')} cx={cx} cy={cy} r={150} color={p.accent} opacity={0.95} />
        <circle cx={cx} cy={cy} r="54" fill="#ffffff" opacity="0.9">
          {live && <animate attributeName="r" values="48;60;48" dur="3s" repeatCount="indefinite" />}
        </circle>
        <g fill={p.accent}>
          {motes.map((m, i) => (
            <circle key={i} cx={r1(m.x)} cy={r1(m.y)} r={r1(m.r)} opacity="0.7" />
          ))}
        </g>
      </g>
    )
  },

  /* Floodlit stadium pitch in perspective */
  pitch({ p, id, url, rand, live }) {
    const top = 440
    const fx = (y: number, side: -1 | 1) => {
      const t = (y - top) / (H - top)
      const half = 380 + t * (1100 - 380)
      return r1(800 + side * half)
    }
    const bands = 9
    const bandYs = Array.from({ length: bands + 1 }, (_, k) => top + (H - top) * Math.pow(k / bands, 1.5))
    const crowd = Array.from({ length: 260 }, () => ({ x: rand() * W, y: 300 + rand() * 120, c: rand() }))
    const midY = 650
    return (
      <g>
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.from} />
            <stop offset="100%" stopColor={mix(p.from, p.via, 0.35)} />
          </linearGradient>
          <linearGradient id={id('field')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mix(p.via, p.from, 0.35)} />
            <stop offset="100%" stopColor={p.via} />
          </linearGradient>
          <linearGradient id={id('cone')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={url('sky')} />
        <g>
          {crowd.map((c, i) => (
            <circle key={i} cx={r1(c.x)} cy={r1(c.y)} r="3.5" fill={c.c < 0.1 ? p.to : c.c < 0.2 ? p.accent : mix(p.from, '#ffffff', 0.15)} opacity="0.8">
              {live && c.c < 0.04 && <animate attributeName="opacity" values="0.8;0;0.8" dur="0.6s" begin={`${(i % 7) * 0.4}s`} repeatCount="indefinite" />}
            </circle>
          ))}
        </g>
        <polygon points={`${fx(top, -1)},${top} ${fx(top, 1)},${top} ${fx(H, 1)},${H} ${fx(H, -1)},${H}`} fill={url('field')} />
        {bandYs.slice(0, bands).map((y, k) =>
          k % 2 ? null : (
            <polygon
              key={k}
              points={`${fx(y, -1)},${r1(y)} ${fx(y, 1)},${r1(y)} ${fx(bandYs[k + 1], 1)},${r1(bandYs[k + 1])} ${fx(bandYs[k + 1], -1)},${r1(bandYs[k + 1])}`}
              fill="#000000"
              opacity="0.14"
            />
          ),
        )}
        <g fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="4">
          <polygon points={`${fx(top + 8, -1) + 20},${top + 8} ${fx(top + 8, 1) - 20},${top + 8} ${fx(H, 1) - 60},${H + 4} ${fx(H, -1) + 60},${H + 4}`} />
          <line x1={fx(midY, -1) + 26} y1={midY} x2={fx(midY, 1) - 26} y2={midY} />
          <ellipse cx="800" cy={midY} rx="190" ry="58" />
          <polygon points={`640,${top + 8} 960,${top + 8} 990,${top + 60} 610,${top + 60}`} />
        </g>
        {[220, 1380].map((x, i) => (
          <g key={x}>
            <polygon points={`${x - 30},120 ${x + 30},120 ${i ? x - 700 : x + 700},${H} ${i ? x - 1200 : x + 1200},${H}`} fill={url('cone')} opacity="0.55" />
            <Glow id={id(`fl${i}`)} cx={x} cy={120} r={180} color={p.accent} opacity={0.85} />
            <rect x={x - 46} y="102" width="92" height="36" rx="4" fill="#ffffff" />
          </g>
        ))}
        <Glow id={id('ball')} cx={800} cy={820} r={90} color={p.to} opacity={0.7} />
        <circle cx="800" cy="820" r="20" fill="#ffffff">
          {live && <animate attributeName="cy" values="820;780;820" dur="1.2s" repeatCount="indefinite" />}
        </circle>
      </g>
    )
  },

  /* God rays through fog and something watching from the dark */
  veil({ p, id, url, rand, live }) {
    const rays = Array.from({ length: 16 }, () => ({ x: rand() * W, w: 6 + rand() * 70, o: 0.2 + rand() * 0.5, dur: 3 + rand() * 5, flick: rand() < 0.35 }))
    const dust = Array.from({ length: 40 }, () => ({ x: rand() * W, y: rand() * H, r: 1 + rand() * 2 }))
    return (
      <g>
        <defs>
          <linearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mix(p.from, p.via, 0.25)} />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <linearGradient id={id('ray')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.to} stopOpacity="0" />
            <stop offset="35%" stopColor={p.to} stopOpacity="0.55" />
            <stop offset="100%" stopColor={p.to} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id('fog')}>
            <stop offset="0%" stopColor={p.via} stopOpacity="0.6" />
            <stop offset="100%" stopColor={p.via} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={url('bg')} />
        <g fill={url('ray')}>
          {rays.map((r, i) => (
            <rect key={i} x={r1(r.x)} y="0" width={r1(r.w)} height={H} opacity={r1(r.o * 10) / 10} transform={`skewX(-8)`}>
              {live && r.flick && <animate attributeName="opacity" values={`${r1(r.o * 10) / 10};0.05;${r1(r.o * 10) / 10}`} dur={`${r.dur.toFixed(1)}s`} repeatCount="indefinite" />}
            </rect>
          ))}
        </g>
        {[
          { cx: 400, cy: 760, rx: 700, ry: 220, d: 120 },
          { cx: 1200, cy: 860, rx: 760, ry: 240, d: -140 },
          { cx: 800, cy: 640, rx: 600, ry: 160, d: 80 },
        ].map((f, i) => (
          <ellipse key={i} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill={url('fog')}>
            {live && <animateTransform attributeName="transform" type="translate" values={`0 0;${f.d} 0;0 0`} dur={`${16 + i * 5}s`} repeatCount="indefinite" />}
          </ellipse>
        ))}
        <Glow id={id('eyes')} cx={800} cy={520} r={160} color={p.to} opacity={0.6} />
        <g fill={p.accent}>
          {[756, 844].map((x) => (
            <ellipse key={x} cx={x} cy="520" rx="24" ry="8">
              {live && <animate attributeName="ry" values="8;8;0.6;8;8" keyTimes="0;0.86;0.9;0.94;1" dur="5s" repeatCount="indefinite" />}
            </ellipse>
          ))}
        </g>
        <g fill="#ffffff">
          {dust.map((d, i) => (
            <circle key={i} cx={r1(d.x)} cy={r1(d.y)} r={r1(d.r)} opacity="0.35" />
          ))}
        </g>
      </g>
    )
  },
}
