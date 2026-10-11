import { useEffect, useId, useRef } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion'
import { LOGO_VIEWBOX } from '@/components/brand/Logo'
import { useFinePointer } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { EMBLEM_PIECES, LOGO_H, LOGO_W, type EmblemPiece } from './emblemGeometry'
import { useHeroTiming } from './timing'

type HeroEmblemProps = {
  /** Start the assembly (pass useIntroDone()). */
  play: boolean
  /** Hero is on screen — pointer tracking and the sheen loop only run while true. */
  active: boolean
  /** Hero scroll progress 0 → 1 (drives the "explode" as the hero leaves). */
  progress: MotionValue<number>
  className?: string
}

const POINTER_SPRING = { stiffness: 60, damping: 17, mass: 0.7 }
/** Max pointer parallax in px at depth 1.0. */
const PARALLAX_X = 30
const PARALLAX_Y = 22
/** How far pieces fly apart (in multiples of their `from` offset) at full scroll. */
const BURST = 2.2

/** Touch devices: each piece bobs on its own rhythm (classes kept literal for Tailwind). */
const FLOAT: Record<EmblemPiece['id'], string> = {
  left: 'animate-[hz-bob_7s_ease-in-out_-1.2s_infinite]',
  bar: 'animate-[hz-bob-alt_6s_ease-in-out_-3s_infinite]',
  joint: 'animate-[hz-bob_5.4s_ease-in-out_-2.1s_infinite]',
  right: 'animate-[hz-bob-alt_7.8s_ease-in-out_-0.4s_infinite]',
}

const layerIn = (delay: number, scale = 0.9): Variants => ({
  hidden: { opacity: 0, scale },
  show: { opacity: 1, scale: 1, transition: { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay } },
})

/**
 * The signature hero centrepiece: the Hizarc "H" rebuilt as four extruded,
 * individually animated slabs.
 *
 * - Assembly: after the intro, each piece springs in from its `from` offset.
 * - Desktop (fine pointer): per-piece depth parallax + a whole-emblem 3D tilt.
 * - Touch: gentle autonomous bob + sway (CSS, compositor-only).
 * - Scroll: pieces burst apart along their `from` vectors, spin and fade.
 *
 * Every piece is its own stacked layer, so all motion is transform/opacity on
 * pre-rasterised layers — the SVG is painted once, the GPU does the rest.
 * Decorative: hidden from assistive tech (the <h1> carries the message).
 */
export function HeroEmblem({ play, active, progress, className }: HeroEmblemProps) {
  const reduce = useReducedMotion() === true
  const t = useHeroTiming()
  const fine = useFinePointer()
  const interactive = fine && !reduce
  const uid = useId().replace(/:/g, '')

  // ---- Pointer → springs (desktop only) --------------------------------
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, POINTER_SPRING)
  const sy = useSpring(py, POINTER_SPRING)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
    if (!active) {
      px.set(0)
      py.set(0)
    }
  }, [active, px, py])

  useEffect(() => {
    if (!interactive) return
    const onMove = (e: PointerEvent) => {
      if (!activeRef.current || e.pointerType === 'touch') return
      px.set((e.clientX / window.innerWidth) * 2 - 1)
      py.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    const onLeave = () => {
      px.set(0)
      py.set(0)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [interactive, px, py])

  const rotateY = useTransform(sx, [-1, 1], [-13, 13])
  const rotateX = useTransform(sy, [-1, 1], [9, -9])
  const echoX = useTransform(sx, (v) => v * PARALLAX_X * 2)
  const echoY = useTransform(sy, (v) => v * PARALLAX_Y * 2)

  // ---- Scroll burst (disabled for reduced motion) ------------------------
  const burst = useTransform(progress, (v) => (reduce ? 0 : Math.max(0, v)))
  const fadeOut = useTransform(burst, [0, 0.55], [1, 0])

  // ---- One shared light sheen sweeping across all pieces -----------------
  const sheen = useMotionValue(-520)
  useEffect(() => {
    if (!play || reduce || !active) return
    const controls = animate(sheen, [-520, 1150], {
      duration: 1.5,
      ease: [0.65, 0, 0.35, 1],
      delay: t.emblem + 1.05,
      repeat: interactive ? Infinity : 0,
      repeatDelay: 6.5,
    })
    return () => controls.stop()
  }, [play, reduce, active, interactive, sheen, t.emblem])

  return (
    <div aria-hidden className={cn('pointer-events-none select-none', className)}>
      <motion.div
        className="relative w-full"
        style={{ aspectRatio: `${LOGO_W} / ${LOGO_H}`, perspective: 1100 }}
        initial="hidden"
        animate={play ? 'show' : 'hidden'}
      >
        {/* Aura: pre-blurred radial glow, breathing */}
        <motion.div variants={layerIn(t.emblem, 0.7)} className="absolute -inset-[38%]">
          <div className="size-full animate-[hz-breathe_7s_ease-in-out_infinite] bg-[radial-gradient(closest-side,rgba(10,124,255,0.42),rgba(124,92,255,0.16)_52%,transparent_74%)]" />
        </motion.div>

        {/* Landing glow on the arena floor */}
        <motion.div
          variants={layerIn(t.emblem + 0.5, 0.6)}
          className="absolute inset-x-[6%] -bottom-[9%] h-[16%] bg-[radial-gradient(closest-side,rgba(46,230,255,0.38),rgba(10,124,255,0.12)_55%,transparent)]"
        />

        {/* Lock-in: one shockwave as the last slab lands (pieces start at t.emblem, 0.11s apart, and settle ≈ 0.9s later) */}
        {!reduce && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.5 }}
            animate={play ? { opacity: [0, 0.85, 0], scale: [0.5, 1.45] } : { opacity: 0, scale: 0.5 }}
            transition={{
              opacity: { duration: 1.15, delay: t.emblem + 1.3, times: [0, 0.18, 1], ease: 'easeOut' },
              scale: { duration: 1.15, delay: t.emblem + 1.3, ease: [0.16, 1, 0.3, 1] },
            }}
            className="absolute top-1/2 left-1/2 aspect-square w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/70 shadow-[0_0_36px_rgba(46,230,255,0.4),inset_0_0_36px_rgba(46,230,255,0.18)]"
          />
        )}

        {/* HUD rings */}
        <motion.div style={{ opacity: fadeOut }} className="absolute inset-0">
          <motion.div variants={layerIn(t.emblem + 0.25, 0.82)} className="absolute top-1/2 left-1/2 aspect-square w-[134%] -translate-x-1/2 -translate-y-1/2">
            <EmblemRings />
          </motion.div>
        </motion.div>

        {/* Tilting stage: whole-emblem 3D tilt (pointer) or sway (touch) */}
        <motion.div
          className={cn('absolute inset-0', !interactive && !reduce && 'animate-[hz-sway_13s_ease-in-out_infinite]')}
          style={interactive ? { rotateX, rotateY } : undefined}
        >
          {/* Holographic echo: outline of the mark, deepest parallax */}
          <motion.div style={{ opacity: fadeOut }} className="absolute inset-0">
            <motion.div variants={layerIn(t.emblem + 1.0, 1.08)} className="absolute inset-0">
              <motion.div className="absolute inset-0" style={interactive ? { x: echoX, y: echoY } : undefined}>
                <EchoOutline uid={uid} />
              </motion.div>
            </motion.div>
          </motion.div>

          {EMBLEM_PIECES.map((piece, i) => (
            <EmblemLayer
              key={piece.id}
              piece={piece}
              index={i}
              uid={uid}
              play={play}
              delay={t.emblem}
              reduce={reduce}
              interactive={interactive}
              burst={burst}
              sx={sx}
              sy={sy}
              sheen={sheen}
            />
          ))}
        </motion.div>

        {/* Corner brackets + label (desktop). Kept tight to the mark so nothing pokes under the navbar or into the card below. */}
        <motion.div variants={layerIn(t.emblem + 1.2, 1.04)} className="absolute -inset-[4%] hidden lg:block">
          <motion.div style={{ opacity: fadeOut }} className="absolute inset-0">
            <Bracket className="top-0 left-0" />
            <Bracket className="top-0 right-0 rotate-90" />
            <Bracket className="right-0 bottom-0 rotate-180" />
            <Bracket className="bottom-0 left-0 -rotate-90" />
            <p className="absolute -bottom-7 left-0 hidden font-mono text-[0.62rem] tracking-[0.3em] whitespace-nowrap text-haze uppercase xl:block">
              <span className="text-cyan">HZ-01</span> <span className="text-white/25">//</span> Core mark
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

type EmblemLayerProps = {
  piece: EmblemPiece
  index: number
  uid: string
  play: boolean
  /** Seconds before the first piece starts flying in. */
  delay: number
  reduce: boolean
  interactive: boolean
  burst: MotionValue<number>
  sx: MotionValue<number>
  sy: MotionValue<number>
  sheen: MotionValue<number>
}

/** One extruded piece on its own layer: assembly + scroll burst → pointer parallax / float → SVG. */
function EmblemLayer({ piece, index, uid, play, delay, reduce, interactive, burst, sx, sy, sheen }: EmblemLayerProps) {
  // 1 = scattered at its `from` offset, 0 = assembled. Springs overshoot slightly below 0 for a "snap".
  const enter = useMotionValue(reduce ? 0 : 1)

  useEffect(() => {
    if (!play) return
    if (reduce) {
      enter.jump(0)
      return
    }
    const controls = animate(enter, 0, {
      type: 'spring',
      stiffness: 92,
      damping: 12.5,
      mass: 1,
      delay: delay + index * 0.11,
    })
    return () => controls.stop()
  }, [play, reduce, delay, index, enter])

  const fx = (piece.from.x / LOGO_W) * 100
  const fy = (piece.from.y / LOGO_H) * 100
  const spin = piece.from.x < 0 ? -1 : 1

  const x = useTransform(() => `${fx * (enter.get() + burst.get() * BURST)}%`)
  const y = useTransform(() => `${fy * (enter.get() + burst.get() * BURST)}%`)
  const rotate = useTransform(() => spin * (-18 * enter.get() + 24 * burst.get()))
  const scale = useTransform(() => 1 + 0.22 * enter.get() + 0.32 * burst.get())
  const opacity = useTransform(() => {
    const inOp = reduce ? (play ? 1 : 0) : 1 - enter.get() * 1.25
    const outOp = 1 - burst.get() * 1.55
    return Math.min(1, Math.max(0, inOp)) * Math.min(1, Math.max(0, outOp))
  })

  const parallaxX = useTransform(sx, (v) => v * piece.depth * PARALLAX_X)
  const parallaxY = useTransform(sy, (v) => v * piece.depth * PARALLAX_Y)

  const id = (name: string) => `hze-${uid}-${piece.id}-${name}`

  return (
    <motion.div
      className={cn('absolute inset-0 will-change-transform', reduce && 'transition-opacity duration-700')}
      style={{ x, y, rotate, scale, opacity, transformOrigin: piece.origin }}
    >
      <motion.div
        className={cn('absolute inset-0', !interactive && !reduce && FLOAT[piece.id])}
        style={interactive ? { x: parallaxX, y: parallaxY } : undefined}
      >
        <svg viewBox={LOGO_VIEWBOX} className="absolute inset-0 size-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {piece.tone === 'dark' ? (
              <linearGradient id={id('face')} x1="0" y1="0" x2="0.45" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#dcebff" />
                <stop offset="100%" stopColor="#8fbfff" />
              </linearGradient>
            ) : (
              <linearGradient id={id('face')} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0a7cff" />
                <stop offset="60%" stopColor="#13a6ff" />
                <stop offset="100%" stopColor="#2ee6ff" />
              </linearGradient>
            )}
            <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity={piece.tone === 'dark' ? 0.9 : 0.6} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={id('clip')}>
              <polygon points={piece.face} />
            </clipPath>
          </defs>

          {/* Extruded slab: back face, lit/shadowed walls, then the front face */}
          <polygon points={piece.back} fill={piece.backFill} />
          {piece.sides.map((s, i) => (
            <polygon key={i} points={s.points} fill={s.fill} />
          ))}
          <polygon points={piece.face} fill={`url(#${id('face')})`} />

          {/* Light sheen, clipped to the face */}
          <g clipPath={`url(#${id('clip')})`}>
            <motion.polygon points="170,-40 330,-40 20,920 -140,920" fill={`url(#${id('sheen')})`} style={{ x: sheen }} />
          </g>

          {/* Rim light along the top-left edges */}
          <polygon points={piece.face} fill="none" stroke={`url(#${id('rim')})`} strokeWidth={3} strokeLinejoin="round" />
        </svg>
      </motion.div>
    </motion.div>
  )
}

/** Cyan outline of the whole mark, offset behind the slabs like a hologram. */
function EchoOutline({ uid }: { uid: string }) {
  const grad = `hze-${uid}-echo`
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className="absolute inset-0 size-full translate-x-[-3.5%] translate-y-[2.5%] scale-[1.05] overflow-visible opacity-70"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2ee6ff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#3d9bff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {EMBLEM_PIECES.map((p) => (
        <polygon key={p.id} points={p.face} fill="none" stroke={`url(#${grad})`} strokeWidth={2.5} strokeDasharray="14 7" strokeLinejoin="round" />
      ))}
    </svg>
  )
}

/** Two counter-rotating HUD rings with ticks and an orbiting parallelogram. */
function EmblemRings() {
  return (
    <>
      <div className="absolute inset-0 animate-spin-slow">
        <svg viewBox="0 0 100 100" className="size-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(46 230 255 / 0.45)" strokeWidth="0.35" strokeDasharray="0.3 1.9" />
          {/* orbiting parallelogram, slanted like the logo's crossbar */}
          <polygon points="48.6,0.2 51.4,1.7 51.4,3.3 48.6,1.8" fill="#2ee6ff" />
          <circle cx="50" cy="99" r="0.55" fill="#7c5cff" />
        </svg>
      </div>
      <div className="absolute inset-[6%] animate-[hz-spin-rev_46s_linear_infinite]">
        <svg viewBox="0 0 100 100" className="size-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="49" fill="none" stroke="rgb(61 155 255 / 0.3)" strokeWidth="0.3" strokeDasharray="26 4 2 4" />
          {[0, 90, 180, 270].map((deg) => (
            <line key={deg} x1="50" y1="-1.5" x2="50" y2="3" stroke="rgb(244 247 255 / 0.4)" strokeWidth="0.35" transform={`rotate(${deg} 50 50)`} />
          ))}
        </svg>
      </div>
    </>
  )
}

/** L-shaped HUD corner bracket (top-left orientation; rotate for the others). */
function Bracket({ className }: { className?: string }) {
  return (
    <span className={cn('absolute size-5', className)}>
      <span className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-white/50 to-transparent" />
      <span className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/50 to-transparent" />
    </span>
  )
}
