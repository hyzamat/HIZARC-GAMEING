import { playSfx, type SfxName } from '@/lib/sfx'
import {
  AIR_JUMP_V,
  ATTRACT_SPEED,
  BUFFER_TIME,
  C,
  COYOTE_TIME,
  CUT_GRAVITY,
  DYING_TIME,
  FALL_GRAVITY,
  FOOT,
  GRACE_TIME,
  GRAVITY,
  JUMP_V,
  LEDGE_SNAP,
  MAX_FALL,
  ORB_CHARGE,
  ORB_SCORE,
  OVERDRIVE_MULT,
  OVERDRIVE_ORB_SCORE,
  OVERDRIVE_SPEED,
  OVERDRIVE_TIME,
  PIECE_OFFSETS,
  PIT_DEPTH,
  PLAYER_H,
  PLAYER_W,
  RESUME_COUNTDOWN,
  SCORE_PER_UNIT,
  SHATTER_SCORE,
  SLANT,
  SPEED_BASE,
  SPEED_MAX,
  SPEED_TAU,
} from './constants'

/**
 * HIZARC DASH simulation. Pure game state + fixed-step update — no DOM, no drawing.
 * Coordinates: x = world distance (the player's centre is always at x = dist),
 * y = height above the floor line (up is positive).
 * Every entity lives in a pre-allocated pool so the hot loop does not allocate.
 */

export type Phase = 'title' | 'playing' | 'paused' | 'dying' | 'over'
export type ObstacleKind = 'low' | 'tall' | 'wall' | 'hang' | 'gap'

export interface Obstacle {
  active: boolean
  kind: ObstacleKind
  x: number
  w: number
  /** ground shards: height of the top-left corner · hang: height of the bottom-left corner · gap: unused */
  h: number
}

export interface Pickup {
  active: boolean
  kind: 'orb' | 'over'
  x: number
  y: number
  phase: number
}

export interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  gravity: number
  drag: number
}

export interface Popup {
  active: boolean
  x: number
  y: number
  life: number
  max: number
  text: string
  color: string
  big: boolean
}

export interface Ring {
  active: boolean
  x: number
  y: number
  radius: number
  life: number
  max: number
  color: string
}

export interface Debris {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
}

export type RunResult = { score: number; orbs: number; seconds: number; topSpeed: number }

export type EngineEvents = {
  onPhase: (phase: Phase) => void
  onGameOver: (result: RunResult) => void
}

const OBSTACLE_POOL = 24
const PICKUP_POOL = 48
const PARTICLE_POOL = 180
const POPUP_POOL = 10
const RING_POOL = 10
export const TRAIL_LEN = 12

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** "+25"-style labels, created once and reused (no per-pickup string allocation). */
const plusCache = new Map<number, string>()
function plus(n: number) {
  let s = plusCache.get(n)
  if (!s) {
    s = `+${n}`
    plusCache.set(n, s)
  }
  return s
}

export class DashEngine {
  phase: Phase = 'title'
  /** prefers-reduced-motion: no shake / flashes, fewer particles. */
  reduced = false
  /** Particle budget multiplier (1 desktop, lower on phones and for reduced motion). */
  fx = 1

  /* clocks */
  /** Seconds since the run started. */
  time = 0
  /** Global simulation clock (drives bobbing / pulses). */
  clock = 0

  /* world */
  dist = 0
  prevDist = 0
  speed = ATTRACT_SPEED
  baseSpeed = SPEED_BASE
  speedMul = 1
  /** Speed level shown in the HUD (x1.0 → x2.3). */
  level = 1
  /** 0 → 1 as the run speeds up; unlocks harder patterns. */
  difficulty = 0

  /* scoring */
  score = 0
  orbs = 0
  best = 0
  passedBest = false
  topSpeed = 0

  /* overdrive */
  overdrive = 0
  charge = 0
  grace = 0
  /**
   * The light bridge outlives Overdrive until the runner next touches real ground, so the boost can
   * never end with the player hanging over a pit (an unfair death with no way to react).
   */
  bridge = false

  /* feel */
  shake = 0
  flash = 0
  dyingT = 0
  countdown = 0

  /* view (set by the renderer on resize) */
  viewW = 640
  playerX = 128

  /* player */
  y = 0
  prevY = 0
  vy = 0
  grounded = true
  coyote = 0
  buffer = 0
  airJumps = 1
  held = false
  alive = true
  /** squash & stretch (spring back to 1) */
  sx = 1
  sy = 1
  private svx = 0
  private svy = 0
  rot = 0
  private flipT = 1

  /* pools */
  readonly obstacles: Obstacle[] = []
  readonly pickups: Pickup[] = []
  readonly particles: Particle[] = []
  readonly popups: Popup[] = []
  readonly rings: Ring[] = []
  readonly debris: Debris[] = []
  readonly trailX = new Float64Array(TRAIL_LEN)
  readonly trailY = new Float64Array(TRAIL_LEN)
  trailHead = 0
  trailCount = 0
  private trailTick = 0

  /* spawning */
  private nextSpawn = 600
  private lastOverdriveOrb = 0
  private botHold = 0
  private liveFx = 0

  private readonly events: EngineEvents

  constructor(events: EngineEvents) {
    this.events = events
    for (let i = 0; i < OBSTACLE_POOL; i++) this.obstacles.push({ active: false, kind: 'low', x: 0, w: 0, h: 0 })
    for (let i = 0; i < PICKUP_POOL; i++) this.pickups.push({ active: false, kind: 'orb', x: 0, y: 0, phase: 0 })
    for (let i = 0; i < PARTICLE_POOL; i++)
      this.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, color: C.snow, gravity: 0, drag: 0 })
    for (let i = 0; i < POPUP_POOL; i++) this.popups.push({ active: false, x: 0, y: 0, life: 0, max: 1, text: '', color: C.snow, big: false })
    for (let i = 0; i < RING_POOL; i++) this.rings.push({ active: false, x: 0, y: 0, radius: 0, life: 0, max: 1, color: C.cyan })
    for (let i = 0; i < 4; i++) this.debris.push({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0 })
  }

  /* ================================================================ */
  /*  Public API                                                      */
  /* ================================================================ */

  setView(viewW: number) {
    this.viewW = viewW
    this.playerX = Math.min(150, Math.max(72, viewW * 0.18))
  }

  /** Begin a run. The attract-mode world keeps scrolling; hazards ahead dissolve so the run starts clean. */
  start(best: number) {
    const left = this.dist - this.playerX
    const right = left + this.viewW
    for (const o of this.obstacles) {
      if (!o.active) continue
      if (o.x + o.w > left && o.x < right && o.kind !== 'gap') {
        this.emit(o.x + o.w / 2, o.kind === 'hang' ? o.h + 20 : o.h / 2, 10, C.cyan, 60, 220, 0, Math.PI * 2, 0.35, 0.7, 2.4, 0, 2)
      }
      o.active = false
    }
    for (const p of this.pickups) p.active = false

    this.time = 0
    this.score = 0
    this.orbs = 0
    this.best = best
    this.passedBest = false
    this.topSpeed = SPEED_BASE
    this.overdrive = 0
    this.charge = 0
    this.grace = 0
    this.bridge = false
    this.shake = 0
    this.flash = 0
    this.dyingT = 0
    this.countdown = 0
    this.baseSpeed = SPEED_BASE
    this.speedMul = 1
    this.speed = SPEED_BASE
    this.level = 1
    this.difficulty = 0
    this.alive = true
    this.held = false
    this.botHold = 0
    this.buffer = 0
    this.flipT = 1
    this.rot = 0
    this.sx = 1
    this.sy = 1
    // From the title screen keep the attract runner's arc; after a crash, respawn on the floor.
    if (this.phase === 'over' || this.y <= 0) {
      this.y = 0
      this.prevY = 0
      this.vy = 0
      this.grounded = true
      this.airJumps = 1
      this.coyote = 0
      this.trailCount = 0
    }
    this.nextSpawn = this.dist + (this.viewW - this.playerX) + SPEED_BASE * 0.9
    this.lastOverdriveOrb = 0
    this.ring(this.dist, this.y + PLAYER_H / 2, C.cyan, 70, 0.5)
    this.setPhase('playing')
  }

  pause() {
    if (this.phase !== 'playing') return
    this.held = false
    this.countdown = 0
    this.setPhase('paused')
  }

  resume() {
    if (this.phase !== 'paused') return
    this.held = false
    this.countdown = RESUME_COUNTDOWN
    this.setPhase('playing')
  }

  /** Jump button down. */
  press() {
    this.held = true
    if (this.phase !== 'playing' || this.countdown > 0) return
    if (this.grounded || this.coyote > 0) {
      this.jump(false)
    } else if (this.airJumps > 0 && !this.landingSoon()) {
      this.jump(true)
    } else {
      // Jump buffering: remember the press and fire it the moment we land.
      this.buffer = BUFFER_TIME
    }
  }

  /** Jump button up — an early release cuts the jump short. */
  release() {
    this.held = false
  }

  /** Volt burst for a new best, centred in the view (drawn behind the game-over card). */
  celebrate() {
    const cx = this.dist - this.playerX + this.viewW / 2
    const cy = 150
    this.emit(cx, cy, 46, C.volt, 120, 420, 0, Math.PI * 2, 0.6, 1.3, 3, 260, 1.4)
    this.emit(cx, cy, 20, C.cyan, 80, 300, 0, Math.PI * 2, 0.5, 1.1, 2.4, 200, 1.4)
    this.ring(cx, cy, C.volt, 160, 0.8)
    this.ring(cx, cy, C.cyan, 110, 0.6)
  }

  /** Does the loop need to keep animating? (false = one still frame is enough) */
  needsFrames() {
    switch (this.phase) {
      case 'playing':
      case 'dying':
        return true
      case 'title':
        return !this.reduced
      case 'over':
        return this.liveFx > 0 || this.shake > 0.05 || this.flash > 0.01
      default:
        return false
    }
  }

  /* ================================================================ */
  /*  Fixed-step update                                               */
  /* ================================================================ */

  step(dt: number) {
    this.prevDist = this.dist
    this.prevY = this.y
    this.clock += dt
    switch (this.phase) {
      case 'title':
        this.stepRun(dt, true)
        break
      case 'playing':
        if (this.countdown > 0) {
          this.countdown = Math.max(0, this.countdown - dt)
          this.stepFx(dt)
        } else {
          this.stepRun(dt, false)
        }
        break
      case 'dying':
        this.stepDying(dt)
        break
      case 'over':
        this.stepFx(dt)
        break
      case 'paused':
        break
    }
  }

  private stepRun(dt: number, attract: boolean) {
    if (attract) {
      this.speed = ATTRACT_SPEED
      this.difficulty = 0
      this.level = 1
    } else {
      this.time += dt
      this.baseSpeed = SPEED_BASE + (SPEED_MAX - SPEED_BASE) * (1 - Math.exp(-this.time / SPEED_TAU))
      this.difficulty = (this.baseSpeed - SPEED_BASE) / (SPEED_MAX - SPEED_BASE)
      const target = this.overdrive > 0 ? OVERDRIVE_SPEED : 1
      this.speedMul += (target - this.speedMul) * Math.min(1, dt * 3)
      this.speed = this.baseSpeed * this.speedMul
      this.level = this.speed / SPEED_BASE
      if (this.speed > this.topSpeed) this.topSpeed = this.speed
    }
    this.dist += this.speed * dt

    if (this.overdrive > 0) {
      this.overdrive -= dt
      if (this.overdrive <= 0) {
        this.overdrive = 0
        this.grace = GRACE_TIME
      }
    }
    if (this.grace > 0) this.grace = Math.max(0, this.grace - dt)
    if (this.buffer > 0) this.buffer = Math.max(0, this.buffer - dt)

    if (attract) this.bot(dt)
    this.stepPlayer(dt, attract)
    if (!attract && this.phase !== 'playing') return // crashed into a pit / ledge

    this.spawn(attract)
    this.stepPickups(dt, attract)
    if (!attract) {
      this.collide()
      if (this.phase !== 'playing') return
      this.score += this.speed * dt * SCORE_PER_UNIT * (this.overdrive > 0 ? OVERDRIVE_MULT : 1)
      if (!this.passedBest && this.best > 0 && this.score > this.best) {
        this.passedBest = true
        this.popup(this.dist, this.y + PLAYER_H + 34, 'NEW BEST', C.volt, true)
        this.emit(this.dist, this.y + PLAYER_H / 2, 18, C.volt, 80, 260, 0, Math.PI * 2, 0.4, 0.9, 2.6, 200, 1.6)
      }
    }
    this.recycle()
    this.stepFx(dt)
  }

  private stepPlayer(dt: number, attract: boolean) {
    // The bridge only lingers while the runner is still out over a gap.
    if (this.bridge && this.overdrive <= 0 && this.groundAt(this.dist)) this.bridge = false
    const support = this.hasSupport()
    if (this.grounded && !support) {
      // Ran off a ledge: coyote time keeps a ground jump available for a moment.
      this.grounded = false
      this.coyote = COYOTE_TIME
      this.vy = 0
    }

    if (!this.grounded) {
      let g = GRAVITY
      if (this.vy > 0) {
        if (!this.held) g *= CUT_GRAVITY
      } else {
        g *= FALL_GRAVITY
      }
      this.vy = Math.max(-MAX_FALL, this.vy - g * dt)
      this.y += this.vy * dt
      if (this.coyote > 0) this.coyote = Math.max(0, this.coyote - dt)

      if (support && this.y < -LEDGE_SNAP) {
        // Inside the far wall of a gap.
        if (attract || this.overdrive > 0 || this.bridge) this.land()
        else return this.crash()
      } else if (support && this.y <= 0 && this.vy <= 0) {
        this.land()
      } else if (!support && this.y < -PIT_DEPTH) {
        if (attract) {
          this.y = 0
          this.land()
        } else {
          return this.crash()
        }
      }
    }

    // Squash & stretch: a slightly bouncy spring back to 1.
    const k = 520
    const c = 20
    this.svx += ((1 - this.sx) * k - this.svx * c) * dt
    this.svy += ((1 - this.sy) * k - this.svy * c) * dt
    this.sx += this.svx * dt
    this.sy += this.svy * dt

    // Forward flip on the double jump.
    if (this.flipT < 1) {
      this.flipT = Math.min(1, this.flipT + dt / 0.42)
      const e = 1 - (1 - this.flipT) ** 3
      this.rot = e * Math.PI * 2
    } else {
      this.rot = 0
    }

    // Motion trail samples (every other step = 60 samples/s).
    if (++this.trailTick >= 2) {
      this.trailTick = 0
      this.trailX[this.trailHead] = this.dist
      this.trailY[this.trailHead] = this.y
      this.trailHead = (this.trailHead + 1) % TRAIL_LEN
      if (this.trailCount < TRAIL_LEN) this.trailCount++
    }
  }

  private stepDying(dt: number) {
    this.dyingT += dt
    // A short slow-motion beat, then the world coasts to a stop.
    const sdt = this.dyingT < 0.32 ? dt * 0.35 : dt
    this.speed *= Math.exp(-4.5 * sdt)
    this.dist += this.speed * sdt
    for (const d of this.debris) {
      d.vy -= GRAVITY * 0.55 * sdt
      d.x += d.vx * sdt
      d.y += d.vy * sdt
      d.rot += d.vr * sdt
      if (d.y < 0 && d.vy < 0 && this.hasSupportAt(d.x)) {
        d.y = 0
        d.vy *= -0.38
        d.vx *= 0.7
        d.vr *= 0.6
      }
    }
    this.stepFx(sdt)
    if (this.dyingT >= DYING_TIME) {
      this.setPhase('over')
      this.events.onGameOver({
        score: Math.floor(this.score),
        orbs: this.orbs,
        seconds: Math.round(this.time * 10) / 10,
        topSpeed: Math.round((this.topSpeed / SPEED_BASE) * 10) / 10,
      })
    }
  }

  private stepFx(dt: number) {
    let live = 0
    for (const p of this.particles) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      live++
      const damp = 1 - Math.min(1, p.drag * dt)
      p.vx *= damp
      p.vy = p.vy * damp - p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    for (const p of this.popups) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      live++
      p.y += 34 * dt
    }
    for (const r of this.rings) {
      if (!r.active) continue
      r.life -= dt
      if (r.life <= 0) {
        r.active = false
        continue
      }
      live++
    }
    this.liveFx = live
    if (this.shake > 0) this.shake = this.shake < 0.05 ? 0 : this.shake * Math.exp(-dt * 9)
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.6)
  }

  /* ================================================================ */
  /*  Player actions                                                  */
  /* ================================================================ */

  private jump(air: boolean) {
    this.vy = air ? AIR_JUMP_V : JUMP_V
    this.grounded = false
    this.coyote = 0
    this.buffer = 0
    this.sx = 0.72
    this.sy = 1.32
    this.svx = 0
    this.svy = 0
    if (air) {
      this.airJumps = 0
      this.flipT = 0
      this.ring(this.dist, this.y + PLAYER_H * 0.4, C.violet, 34, 0.35)
      this.emit(this.dist, this.y + 4, 10, C.violetSoft, 60, 200, Math.PI * 1.1, Math.PI * 1.9, 0.25, 0.5, 2.2, 300, 3)
    } else {
      this.emit(this.dist - 4, 2, 8, C.cyan, 40, 170, Math.PI * 0.55, Math.PI * 0.95, 0.25, 0.55, 2.2, 500, 3)
    }
    if (this.phase === 'playing') this.sfx('jump')
  }

  private land() {
    const impact = -this.vy
    this.y = 0
    this.vy = 0
    this.grounded = true
    this.airJumps = 1
    this.coyote = 0
    if (impact > 260) {
      this.sx = 1 + Math.min(0.36, impact / 2600)
      this.sy = 1 - Math.min(0.32, impact / 3000)
      this.svx = 0
      this.svy = 0
      const n = impact > 900 ? 10 : 6
      this.emit(this.dist, 1, n, C.brand300, 50, 190, Math.PI * 0.05, Math.PI * 0.4, 0.2, 0.45, 2, 400, 4)
      this.emit(this.dist, 1, n, C.brand300, 50, 190, Math.PI * 0.6, Math.PI * 0.95, 0.2, 0.45, 2, 400, 4)
    }
    if (this.buffer > 0) this.jump(false)
  }

  private crash() {
    if (this.phase !== 'playing') return
    this.alive = false
    this.held = false
    this.dyingT = 0
    this.shake = this.reduced ? 0 : 10
    this.flash = this.reduced ? 0 : 0.55
    const cx = this.dist
    const cy = this.y + PLAYER_H / 2
    const dir = [
      [-260, 420, -9],
      [-60, 560, 7],
      [140, 380, -6],
      [300, 500, 10],
    ]
    for (let i = 0; i < 4; i++) {
      const d = this.debris[i]
      d.x = cx + PIECE_OFFSETS[i].x
      d.y = cy + PIECE_OFFSETS[i].y
      d.vx = dir[i][0] + this.speed * 0.25
      d.vy = dir[i][1]
      d.rot = 0
      d.vr = dir[i][2]
    }
    this.emit(cx, cy, 30, C.cyan, 120, 460, 0, Math.PI * 2, 0.4, 1, 2.6, 420, 1.6)
    this.emit(cx, cy, 16, C.snow, 80, 320, 0, Math.PI * 2, 0.3, 0.8, 2, 300, 1.6)
    this.emit(cx, cy, 10, C.ember, 60, 260, 0, Math.PI * 2, 0.3, 0.7, 2.2, 300, 1.6)
    this.ring(cx, cy, C.cyan, 90, 0.55)
    this.sfx('crash')
    this.setPhase('dying')
  }

  private triggerOverdrive() {
    this.overdrive = OVERDRIVE_TIME
    this.bridge = true
    this.charge = 0
    this.grace = 0
    this.flash = this.reduced ? 0 : 0.3
    this.popup(this.dist + 30, this.y + PLAYER_H + 30, 'OVERDRIVE', C.cyan, true)
    this.ring(this.dist, this.y + PLAYER_H / 2, C.volt, 120, 0.6)
  }

  private collect(p: Pickup, attract: boolean) {
    p.active = false
    const mult = this.overdrive > 0 ? OVERDRIVE_MULT : 1
    if (p.kind === 'orb') {
      this.emit(p.x, p.y, 9, C.volt, 60, 220, 0, Math.PI * 2, 0.25, 0.55, 2, 120, 3)
      this.ring(p.x, p.y, C.volt, 26, 0.3)
      if (attract) return
      this.orbs++
      const pts = ORB_SCORE * mult
      this.score += pts
      this.popup(p.x, p.y + 14, plus(pts), C.volt, false)
      if (this.overdrive <= 0) {
        this.charge += ORB_CHARGE
        if (this.charge >= 1) this.triggerOverdrive()
      }
      this.sfx('pickup')
    } else {
      this.emit(p.x, p.y, 24, C.violetSoft, 90, 340, 0, Math.PI * 2, 0.35, 0.8, 2.6, 160, 2)
      this.emit(p.x, p.y, 14, C.cyan, 90, 300, 0, Math.PI * 2, 0.35, 0.8, 2.2, 160, 2)
      if (attract) return
      const pts = OVERDRIVE_ORB_SCORE * mult
      this.score += pts
      this.popup(p.x, p.y - 22, plus(pts), C.volt, false)
      this.triggerOverdrive()
      this.sfx('pickup')
    }
  }

  private shatter(o: Obstacle) {
    o.active = false
    const top = o.kind === 'hang' ? o.h + 40 : o.h
    const bottom = o.kind === 'hang' ? o.h : 0
    const cx = o.x + o.w / 2
    this.emit(cx, (top + bottom) / 2, 22, o.kind === 'hang' ? C.violetSoft : C.cyan, 140, 420, -Math.PI * 0.45, Math.PI * 0.45, 0.35, 0.8, 3, 600, 1.2)
    this.emit(cx, (top + bottom) / 2, 10, C.volt, 100, 300, -Math.PI * 0.5, Math.PI * 0.5, 0.3, 0.6, 2.2, 500, 1.2)
    const pts = SHATTER_SCORE * OVERDRIVE_MULT
    this.score += pts
    this.popup(cx, top + 18, plus(pts), C.cyan, false)
    if (!this.reduced) this.shake = Math.max(this.shake, 3.5)
    this.sfx('click')
  }

  /* ================================================================ */
  /*  Physics helpers                                                 */
  /* ================================================================ */

  /** Real ground (no light bridge): is there floor under feet centred at x? */
  private groundAt(x: number) {
    const l = x - FOOT
    const r = x + FOOT
    for (const o of this.obstacles) {
      if (o.active && o.kind === 'gap' && l >= o.x && r <= o.x + o.w) return false
    }
    return true
  }

  private hasSupportAt(x: number) {
    if ((this.overdrive > 0 || this.bridge) && this.phase === 'playing') return true // light bridges over every gap
    return this.groundAt(x)
  }

  private hasSupport() {
    return this.hasSupportAt(this.dist)
  }

  /** Falling and about to touch down → buffer a ground jump instead of spending the air jump. */
  private landingSoon() {
    return this.vy < 0 && this.hasSupport() && this.y + this.vy * BUFFER_TIME * 0.75 <= 0
  }

  private collide() {
    if (this.grace > 0 && this.overdrive <= 0) return // post-overdrive ghost frames
    const hw = PLAYER_W * 0.5 - 5
    const px0 = this.dist - hw
    const px1 = this.dist + hw
    const py0 = this.y + 3
    const py1 = this.y + PLAYER_H - 5
    for (const o of this.obstacles) {
      if (!o.active || o.kind === 'gap') continue
      if (px1 <= o.x + 2 || px0 >= o.x + o.w - 2) continue
      let hit: boolean
      if (o.kind === 'hang') {
        // Bottom cut slopes down to the right: the lowest point inside the overlap is at its right end.
        const xr = Math.min(px1, o.x + o.w)
        hit = py1 > o.h - (xr - o.x) * SLANT + 3
      } else {
        // Top cut slopes down to the right: the highest point inside the overlap is at its left end.
        const xl = Math.max(px0, o.x)
        hit = py0 < o.h - (xl - o.x) * SLANT - 3
      }
      if (!hit) continue
      if (this.overdrive > 0) {
        this.shatter(o)
        continue
      }
      this.crash()
      return
    }
  }

  private stepPickups(dt: number, attract: boolean) {
    const cy = this.y + PLAYER_H * 0.5
    const magnet = this.overdrive > 0 && this.phase === 'playing'
    const pull = Math.min(1, dt * 9)
    for (const p of this.pickups) {
      if (!p.active) continue
      let dx = this.dist - p.x
      if (magnet && dx > -170 && dx < 40) {
        p.x += dx * pull
        p.y += (cy - p.y) * pull
        dx = this.dist - p.x
      }
      const dy = cy - p.y
      const r = p.kind === 'over' ? 26 : 22
      if (dx * dx + dy * dy < r * r) this.collect(p, attract)
    }
  }

  private recycle() {
    const left = this.dist - this.playerX - 90
    for (const o of this.obstacles) if (o.active && o.x + o.w < left) o.active = false
    for (const p of this.pickups) if (p.active && p.x < left) p.active = false
  }

  /** Title-screen autopilot: hops over everything so the attract mode looks alive. */
  private bot(dt: number) {
    if (this.botHold > 0) {
      this.botHold -= dt
      if (this.botHold <= 0) this.held = false
    }
    if (!this.grounded) return
    let nearest = Infinity
    for (const o of this.obstacles) {
      if (!o.active) continue
      const ahead = o.x - this.dist
      if (ahead > 0 && ahead < nearest) nearest = ahead
    }
    if (nearest <= 45) {
      this.held = true
      this.botHold = 0.16
      this.jump(false)
    }
  }

  /* ================================================================ */
  /*  Spawning                                                        */
  /* ================================================================ */

  private spawn(attract: boolean) {
    const edge = this.dist + (this.viewW - this.playerX) + 80
    let guard = 0
    while (this.nextSpawn < edge && guard++ < 4) {
      const x = this.nextSpawn
      const len = attract ? this.attractPattern(x) : this.pattern(x)
      const v = this.speed
      const d = this.difficulty
      const spacing = attract ? rand(380, 620) : v * lerp(1.15, 0.74, d) + rand(0, lerp(260, 120, d)) + 60
      // Easy orbs in the breathing room between patterns.
      if (!attract && spacing > v * 1.05 && Math.random() < 0.32) {
        const room = spacing - 200
        if (room > 90) this.orbLine(x + len + 100 + Math.random() * (room - 90), 14, 3)
      }
      this.nextSpawn = x + len + spacing
    }
  }

  private attractPattern(x: number) {
    if (Math.random() < 0.6) {
      const w = rand(22, 30)
      const h = rand(32, 42)
      this.addObstacle('low', x, w, h)
      if (Math.random() < 0.6) this.orbArc(x + w / 2, h + 50, 3)
      return w
    }
    const w = rand(56, 72)
    this.addObstacle('gap', x, w, 0)
    return w
  }

  private pattern(x: number): number {
    const d = this.difficulty
    const wLow = 3
    const wPair = d > 0.05 ? 1.3 : 0
    const wGap = d > 0.03 ? 1.6 : 0.7
    const wTall = d > 0.1 ? 1.4 : 0
    const wHang = d > 0.16 ? 1.2 : 0
    const wStairs = d > 0.22 ? 1 : 0
    const wWall = d > 0.28 ? 1 : 0
    const wLowHang = d > 0.32 ? 1.1 : 0
    const wGapLow = d > 0.45 ? 1 : 0
    let r = Math.random() * (wLow + wPair + wGap + wTall + wHang + wStairs + wWall + wLowHang + wGapLow)
    if ((r -= wLow) < 0) return this.pLow(x)
    if ((r -= wPair) < 0) return this.pPair(x)
    if ((r -= wGap) < 0) return this.pGap(x)
    if ((r -= wTall) < 0) return this.pTall(x)
    if ((r -= wHang) < 0) return this.pHang(x)
    if ((r -= wStairs) < 0) return this.pStairs(x)
    if ((r -= wWall) < 0) return this.pWall(x)
    if ((r -= wLowHang) < 0) return this.pLowHang(x)
    return this.pGapLow(x)
  }

  /** One low shard (a tap clears it), often with an orb arc that rewards a full jump. */
  private pLow(x: number) {
    const w = rand(22, 32)
    const h = rand(34, 44 + this.difficulty * 10)
    this.addObstacle('low', x, w, h)
    if (!this.maybeOverdriveOrb(x + w / 2, 132) && Math.random() < 0.55) this.orbArc(x + w / 2, h + 46, 3)
    return w
  }

  /** Two low shards close together: one full (held) jump clears both. */
  private pPair(x: number) {
    const w1 = rand(20, 28)
    const g = rand(34, 54)
    const w2 = rand(20, 28)
    this.addObstacle('low', x, w1, rand(32, 42))
    this.addObstacle('low', x + w1 + g, w2, rand(32, 42))
    if (Math.random() < 0.5) this.orbArc(x + w1 + g / 2, 96, 3)
    return w1 + g + w2
  }

  private pGap(x: number) {
    const w = rand(64, 84 + this.difficulty * 90)
    this.addObstacle('gap', x, w, 0)
    if (!this.maybeOverdriveOrb(x + w / 2, 124) && Math.random() < 0.6) this.orbArc(x + w / 2, 84, 3)
    return w
  }

  /** Tall shard: needs a full jump (or a double jump). */
  private pTall(x: number) {
    const w = rand(24, 32)
    const h = rand(78, 100)
    this.addObstacle('tall', x, w, h)
    if (!this.maybeOverdriveOrb(x + w / 2, h + 50) && Math.random() < 0.4) this.orbArc(x + w / 2, h + 40, 1)
    return w
  }

  /** Wall: only a double jump gets over it. */
  private pWall(x: number) {
    const w = rand(26, 34)
    const h = rand(148, 166)
    this.addObstacle('wall', x, w, h)
    this.orbArc(x + w / 2, h + 26, 2)
    return w
  }

  /** Hanging blade: stay low (orbs on the floor lure you under it). */
  private pHang(x: number) {
    const w = rand(30, 44)
    this.addObstacle('hang', x, w, rand(70, 82))
    this.orbLine(x + 4, 14, Math.max(2, Math.round(w / 22)))
    return w
  }

  /** Low shard then a blade: a short hop (quick tap) threads it. */
  private pLowHang(x: number) {
    const w1 = rand(22, 28)
    const s = this.speed * 0.36 + 14
    const w2 = rand(34, 44)
    this.addObstacle('low', x, w1, rand(32, 40))
    this.addObstacle('hang', x + w1 + s, w2, rand(74, 82))
    return w1 + s + w2
  }

  /** Low shard, land, then a tall one. */
  private pStairs(x: number) {
    const w1 = rand(22, 28)
    const s = this.speed * 0.85 + 40
    const w2 = rand(24, 30)
    this.addObstacle('low', x, w1, rand(34, 42))
    this.addObstacle('tall', x + w1 + s, w2, rand(80, 96))
    return w1 + s + w2
  }

  private pGapLow(x: number) {
    const gw = rand(70, 110)
    const s = this.speed * 0.85 + 40
    const w = rand(22, 30)
    this.addObstacle('gap', x, gw, 0)
    this.addObstacle('low', x + gw + s, w, rand(34, 44))
    return gw + s + w
  }

  /** Rare overdrive orb, at most once every ~20s. Returns true when placed. */
  private maybeOverdriveOrb(x: number, y: number) {
    if (this.time - this.lastOverdriveOrb < 20 || Math.random() > 0.22) return false
    this.lastOverdriveOrb = this.time
    this.addPickup('over', x, y)
    return true
  }

  private orbArc(cx: number, peak: number, n: number) {
    const mid = (n - 1) / 2
    for (let i = 0; i < n; i++) {
      const o = i - mid
      this.addPickup('orb', cx + o * 30, peak - Math.abs(o) * 16)
    }
  }

  private orbLine(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.addPickup('orb', x + i * 26, y)
  }

  private addObstacle(kind: ObstacleKind, x: number, w: number, h: number) {
    for (const o of this.obstacles) {
      if (o.active) continue
      o.active = true
      o.kind = kind
      o.x = x
      o.w = w
      o.h = h
      return
    }
  }

  private addPickup(kind: Pickup['kind'], x: number, y: number) {
    for (const p of this.pickups) {
      if (p.active) continue
      p.active = true
      p.kind = kind
      p.x = x
      p.y = y
      p.phase = Math.random() * Math.PI * 2
      return
    }
  }

  /* ================================================================ */
  /*  Effects                                                         */
  /* ================================================================ */

  /** Emit up to `count` pooled particles (scaled by the fx budget). Angles are radians, 0 = right, π/2 = up. */
  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    spMin: number,
    spMax: number,
    aMin: number,
    aMax: number,
    lifeMin: number,
    lifeMax: number,
    size: number,
    gravity: number,
    drag: number,
  ) {
    let n = Math.max(1, Math.round(count * this.fx))
    for (const p of this.particles) {
      if (n <= 0) break
      if (p.active) continue
      n--
      const a = rand(aMin, aMax)
      const sp = rand(spMin, spMax)
      p.active = true
      p.x = x
      p.y = y
      p.vx = Math.cos(a) * sp
      p.vy = Math.sin(a) * sp
      p.life = p.max = rand(lifeMin, lifeMax)
      p.size = size * rand(0.6, 1.25)
      p.color = color
      p.gravity = gravity
      p.drag = drag
    }
    this.liveFx++
  }

  private popup(x: number, y: number, text: string, color: string, big: boolean) {
    for (const p of this.popups) {
      if (p.active) continue
      p.active = true
      p.x = x
      p.y = y
      p.text = text
      p.color = color
      p.big = big
      p.life = p.max = big ? 1.1 : 0.75
      this.liveFx++
      return
    }
  }

  private ring(x: number, y: number, color: string, radius: number, life: number) {
    for (const r of this.rings) {
      if (r.active) continue
      r.active = true
      r.x = x
      r.y = y
      r.color = color
      r.radius = radius
      r.life = r.max = life
      this.liveFx++
      return
    }
  }

  private sfx(name: SfxName) {
    playSfx(name)
  }

  private setPhase(phase: Phase) {
    if (this.phase === phase) return
    this.phase = phase
    this.events.onPhase(phase)
  }
}
