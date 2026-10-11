import { MAX_FRAME, MAX_STEPS, STEP } from './constants'
import { DashEngine, type Phase, type RunResult } from './engine'
import { DashRenderer, loadArcadeFonts } from './renderer'

/**
 * HIZARC DASH controller: owns the engine + renderer, the rAF loop (fixed 120 Hz simulation
 * with an accumulator, interpolated rendering), input (pointer + keyboard) and the
 * visibility rules (off-screen / hidden tab → the loop sleeps and a live run auto-pauses).
 * React only talks to it through a handful of methods and callbacks.
 */

export type DashGameOptions = {
  canvas: HTMLCanvasElement
  /** The focusable game area the canvas fills — observed for size and visibility. */
  stage: HTMLElement
  /** Whole cabinet: keyboard focus anywhere inside counts as "the game is focused". */
  scope: HTMLElement
  onPhase: (phase: Phase) => void
  onGameOver: (result: RunResult) => void
  onFps?: (fps: number) => void
}

/** Share of the stage that must be on screen for keys to be captured and a run to continue. */
const IN_VIEW = 0.3
/** After a crash, ignore restart keys/taps for this long so button-mashing does not skip the score. */
const RESTART_LOCKOUT = 450
/** Max pointer travel (px) for a press to still count as a tap on the title screen. */
const TAP_SLOP = 16

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW'])

export class DashGame {
  readonly engine: DashEngine
  private readonly renderer: DashRenderer
  private readonly o: DashGameOptions

  private best = 0
  private running = false
  private raf = 0
  private last = 0
  private acc = 0
  private frames = 0
  private fpsAt = 0
  private visible = false
  private inView = false
  private overAt = 0
  private destroyed = false
  private readonly pointers = new Set<number>()
  private tap: { id: number; x: number; y: number } | null = null
  private readonly ro: ResizeObserver
  private readonly io: IntersectionObserver

  /** Returns null when the browser cannot provide a 2D canvas. */
  static create(o: DashGameOptions) {
    const renderer = DashRenderer.create(o.canvas)
    return renderer ? new DashGame(o, renderer) : null
  }

  private constructor(o: DashGameOptions, renderer: DashRenderer) {
    this.o = o
    this.renderer = renderer
    this.engine = new DashEngine({
      onPhase: (phase) => this.handlePhase(phase),
      onGameOver: (result) => o.onGameOver(result),
    })

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(o.stage)
    // No rootMargin: "in view" must mean what the visitor can really see (a margin would let a run keep
    // going, and keys stay captured, while only a sliver of the stage is on screen).
    this.io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        this.visible = entry.isIntersecting
        this.inView = entry.isIntersecting && entry.intersectionRatio >= IN_VIEW
        // Scrolled away mid-run → pause instead of dying off-screen.
        if (!this.inView && this.engine.phase === 'playing') this.engine.pause()
        this.updateRun()
      },
      { threshold: [0, 0.1, IN_VIEW, 0.6, 1] },
    )
    this.io.observe(o.stage)

    const c = o.canvas
    c.addEventListener('pointerdown', this.onPointerDown)
    c.addEventListener('pointerup', this.onPointerUp)
    c.addEventListener('pointercancel', this.onPointerCancel)
    c.addEventListener('lostpointercapture', this.onPointerCancel)
    c.addEventListener('contextmenu', this.onContextMenu)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('visibilitychange', this.onVisibility)

    this.resize()
    // Pre-roll two seconds of attract mode so the very first frame (or the still frame
    // shown with reduced motion) already has a track with shards and orbs on it.
    for (let i = 0; i < 240; i++) this.engine.step(STEP)
    this.applyTouchAction('title')
    this.renderStill()
    void loadArcadeFonts().then(() => {
      if (!this.destroyed && !this.running) this.renderStill()
    })
  }

  /* ================================================================ */
  /*  Public API                                                      */
  /* ================================================================ */

  setBest(best: number) {
    this.best = best
  }

  setReduced(reduced: boolean) {
    this.engine.reduced = reduced
    this.applyFx()
    this.updateRun()
    if (!this.running) this.renderStill()
  }

  /** Start (or restart) a run. */
  start() {
    const phase = this.engine.phase
    if (phase !== 'title' && phase !== 'over') return
    this.engine.start(this.best)
    this.o.stage.focus({ preventScroll: true })
  }

  pause() {
    this.engine.pause()
  }

  resume() {
    this.engine.resume()
    this.o.stage.focus({ preventScroll: true })
  }

  /** Wake the loop (e.g. after the cabinet queued celebration particles on the game-over screen). */
  kick() {
    this.updateRun()
  }

  destroy() {
    this.destroyed = true
    this.running = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.io.disconnect()
    const c = this.o.canvas
    c.removeEventListener('pointerdown', this.onPointerDown)
    c.removeEventListener('pointerup', this.onPointerUp)
    c.removeEventListener('pointercancel', this.onPointerCancel)
    c.removeEventListener('lostpointercapture', this.onPointerCancel)
    c.removeEventListener('contextmenu', this.onContextMenu)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  /* ================================================================ */
  /*  Sizing                                                          */
  /* ================================================================ */

  private resize() {
    const { stage } = this.o
    const w = stage.clientWidth
    const h = stage.clientHeight
    if (!w || !h) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const viewW = this.renderer.resize(w, h, dpr)
    this.engine.setView(viewW)
    this.applyFx()
    // Resizing clears the bitmap — repaint straight away if the loop is asleep.
    if (!this.running) this.renderStill()
  }

  /** Particle budget: lean on phones, leaner still for reduced motion. */
  private applyFx() {
    this.engine.fx = this.engine.reduced ? 0.3 : this.renderer.cssW < 640 ? 0.55 : 1
  }

  /* ================================================================ */
  /*  Loop                                                            */
  /* ================================================================ */

  private shouldRun() {
    return !this.destroyed && this.visible && !document.hidden && this.engine.needsFrames()
  }

  private updateRun() {
    const want = this.shouldRun()
    if (want && !this.running) {
      this.running = true
      this.last = performance.now()
      this.fpsAt = this.last
      this.frames = 0
      this.acc = 0
      this.raf = requestAnimationFrame(this.frame)
    } else if (!want && this.running) {
      this.running = false
      cancelAnimationFrame(this.raf)
    }
  }

  private renderStill() {
    this.renderer.draw(this.engine, 1, performance.now() / 1000)
  }

  private readonly frame = (now: number) => {
    if (!this.running) return
    // Clamp long gaps (tab switches, GC) so the simulation never leaps.
    const dt = Math.min(MAX_FRAME, Math.max(0, (now - this.last) / 1000))
    this.last = now
    this.acc += dt
    let steps = 0
    while (this.acc >= STEP && steps < MAX_STEPS) {
      this.engine.step(STEP)
      this.acc -= STEP
      steps++
    }
    if (this.acc >= STEP) this.acc = 0 // hit the step cap: drop the backlog
    this.renderer.draw(this.engine, this.acc / STEP, now / 1000)

    this.frames++
    if (now - this.fpsAt >= 500) {
      this.o.onFps?.(Math.round((this.frames * 1000) / (now - this.fpsAt)))
      this.frames = 0
      this.fpsAt = now
    }

    if (this.running && this.engine.needsFrames()) {
      this.raf = requestAnimationFrame(this.frame)
    } else {
      this.running = false
    }
  }

  private handlePhase(phase: Phase) {
    this.applyTouchAction(phase)
    if (phase === 'over') this.overAt = performance.now()
    this.o.onPhase(phase)
    this.updateRun()
  }

  /** While a run is live the canvas owns touches (no scroll / double-tap zoom); otherwise the page may scroll over it. */
  private applyTouchAction(phase: Phase) {
    this.o.canvas.style.touchAction = phase === 'playing' || phase === 'dying' ? 'none' : 'manipulation'
  }

  /* ================================================================ */
  /*  Input                                                           */
  /* ================================================================ */

  private readonly onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    this.o.stage.focus({ preventScroll: true })
    const phase = this.engine.phase
    if (phase === 'playing' || phase === 'dying') {
      e.preventDefault()
      try {
        this.o.canvas.setPointerCapture(e.pointerId)
      } catch {
        /* capture is a nicety, not a requirement */
      }
      this.pointers.add(e.pointerId)
      if (phase === 'playing') this.engine.press()
    } else if (phase === 'title' && !this.engine.reduced) {
      // A tap starts the game; a swipe that began on the canvas is just the page scrolling.
      this.tap = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }
  }

  private readonly onPointerUp = (e: PointerEvent) => {
    this.releasePointer(e.pointerId)
    const tap = this.tap
    if (tap && tap.id === e.pointerId) {
      this.tap = null
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_SLOP && this.engine.phase === 'title') this.start()
    }
  }

  private readonly onPointerCancel = (e: PointerEvent) => {
    this.releasePointer(e.pointerId)
    if (this.tap?.id === e.pointerId) this.tap = null
  }

  private releasePointer(id: number) {
    if (this.pointers.delete(id) && this.pointers.size === 0) this.engine.release()
  }

  private readonly onContextMenu = (e: Event) => {
    const phase = this.engine.phase
    if (phase === 'playing' || phase === 'dying') e.preventDefault()
  }

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return

    // Scrolled mostly out of view: leave every key to the page (Space / arrows must keep scrolling it).
    if (!this.inView) return
    const phase = this.engine.phase
    const active = document.activeElement
    const focused = active !== null && active !== document.body && this.o.scope.contains(active)
    const live = phase === 'playing' || phase === 'dying'
    // Never hijack keys unless the game has focus, or a run is live and on screen.
    if (!focused && !live) return

    if (JUMP_KEYS.has(e.code)) {
      if (phase === 'playing') {
        e.preventDefault()
        if (!e.repeat) this.engine.press()
      } else if (phase === 'dying') {
        e.preventDefault()
      } else if (focused && !e.repeat && (target === this.o.stage || target === document.body)) {
        // Focus is on the game area itself (not a button): Space / Up / W start or resume.
        if (phase === 'title' || (phase === 'over' && performance.now() - this.overAt > RESTART_LOCKOUT)) {
          e.preventDefault()
          this.start()
        } else if (phase === 'paused') {
          e.preventDefault()
          this.resume()
        }
      }
      return
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (phase === 'playing') {
        e.preventDefault()
        this.engine.pause()
      } else if (phase === 'paused') {
        e.preventDefault()
        this.resume()
      }
    }
  }

  private readonly onKeyUp = (e: KeyboardEvent) => {
    if (!JUMP_KEYS.has(e.code)) return
    this.engine.release()
    // Some browsers "click" a focused button on Space keyup even when keydown was handled: not mid-run.
    const phase = this.engine.phase
    if (e.code === 'Space' && (phase === 'playing' || phase === 'dying') && e.target instanceof HTMLButtonElement) e.preventDefault()
  }

  private readonly onBlur = () => {
    if (this.engine.phase === 'playing') this.engine.pause()
  }

  private readonly onVisibility = () => {
    if (document.hidden && this.engine.phase === 'playing') this.engine.pause()
    this.updateRun()
  }
}
