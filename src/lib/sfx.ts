import { useSyncExternalStore } from 'react'

/**
 * Tiny synthesized UI sound engine — Web Audio only, no audio files.
 *
 * - Off by default; the choice is persisted to localStorage ('hz-sfx').
 * - Silent until the visitor has interacted with the page (autoplay policy),
 *   and a no-op wherever AudioContext is missing.
 * - ONE AudioContext, created lazily on the first enable / play after a gesture.
 *   It is suspended again when sound is turned off, the tab is hidden, or after
 *   a few idle seconds, so the audio device is not kept awake for nothing.
 * - Every voice is a short, designed blip whose nodes stop + disconnect when done.
 */

export type SfxName = 'hover' | 'click' | 'jump' | 'pickup' | 'crash' | 'success' | 'whoosh' | 'unlock'

const STORAGE_KEY = 'hz-sfx'
const MASTER_GAIN = 0.08
/** Minimum gap between hover ticks (ms). */
const HOVER_GAP = 60
/** Suspend the context after this long without sounds (ms). */
const IDLE_SUSPEND = 15000

const SFX_NAMES: readonly SfxName[] = ['hover', 'click', 'jump', 'pickup', 'crash', 'success', 'whoosh', 'unlock']

export function isSfxName(value: unknown): value is SfxName {
  return typeof value === 'string' && (SFX_NAMES as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------ */
/*  Enabled state (external store)                                     */
/* ------------------------------------------------------------------ */

function readStored(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function writeStored(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* private mode / blocked storage — the in-memory value still works */
  }
}

let enabled = readStored()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function isSfxEnabled() {
  return enabled
}

export function setSfxEnabled(on: boolean) {
  if (on === enabled) return
  enabled = on
  writeStored(on)
  if (on) {
    // Usually called from a click handler, i.e. inside a user gesture: unlock now.
    if (hasGesture()) wake()
  } else {
    sleep()
  }
  emit()
}

export function toggleSfx() {
  setSfxEnabled(!enabled)
  return enabled
}

// Keep tabs in sync when the setting changes in another tab.
function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return
  const next = e.newValue === 'on'
  if (next === enabled) return
  enabled = next
  if (!next) sleep()
  emit()
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

/** `[enabled, setEnabled]` — every toggle across the app stays in sync. */
export function useSfxEnabled(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isSfxEnabled, () => false)
  return [on, setSfxEnabled]
}

/* ------------------------------------------------------------------ */
/*  User-gesture tracking                                              */
/* ------------------------------------------------------------------ */

let gestured = false

type NavigatorWithActivation = Navigator & { userActivation?: { hasBeenActive: boolean } }

function hasGesture() {
  if (gestured) return true
  if (typeof navigator === 'undefined') return false
  return (navigator as NavigatorWithActivation).userActivation?.hasBeenActive === true
}

if (typeof window !== 'undefined') {
  // Persistent (4 tiny passive listeners). Besides recording "the visitor has interacted",
  // they (re)unlock audio while sound is on: iOS Safari only honours resume() inside
  // touchend / click / keydown, so a persisted "on" state must be woken by a real gesture,
  // not by the first game-canvas pointerdown or a timer.
  const GESTURES = ['pointerdown', 'touchend', 'click', 'keydown'] as const
  const onGesture = () => {
    gestured = true
    if (enabled && (!ctx || ctx.state !== 'running' || suspendedByUs)) wake()
  }
  GESTURES.forEach((type) => window.addEventListener(type, onGesture, { capture: true, passive: true }))
}

/* ------------------------------------------------------------------ */
/*  Audio context                                                      */
/* ------------------------------------------------------------------ */

type AudioContextCtor = typeof AudioContext
type WindowWithWebkitAudio = Window & { webkitAudioContext?: AudioContextCtor }

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let idleTimer: ReturnType<typeof setTimeout> | undefined
let lastHover = 0
/** True from sleep() until the next wake(): suspend() resolves async, so ctx.state alone can lie. */
let suspendedByUs = false

function getCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext ?? null
}

/** Create (once) and resume the context. Returns null when audio is unavailable. */
function wake(): AudioContext | null {
  if (!ctx) {
    const Ctor = getCtor()
    if (!Ctor) return null
    try {
      ctx = new Ctor({ latencyHint: 'interactive' })
    } catch {
      // Older WebKit rejects the options bag.
      try {
        ctx = new Ctor()
      } catch {
        return null
      }
    }
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
    document.addEventListener('visibilitychange', onVisibility)
  }
  // 'suspended' — or iOS's non-standard 'interrupted' after a call / app switch.
  if (ctx.state !== 'running' || suspendedByUs) {
    suspendedByUs = false
    void ctx.resume().catch(() => undefined)
  }
  scheduleIdle()
  return ctx
}

function sleep() {
  clearTimeout(idleTimer)
  if (ctx && ctx.state === 'running') {
    suspendedByUs = true
    void ctx.suspend().catch(() => undefined)
  }
}

function scheduleIdle() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(sleep, IDLE_SUSPEND)
}

function onVisibility() {
  if (document.visibilityState === 'hidden') sleep()
}

function getNoise(c: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer
  const length = Math.floor(c.sampleRate * 1)
  const buffer = c.createBuffer(1, length, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

/* ------------------------------------------------------------------ */
/*  Voices                                                             */
/* ------------------------------------------------------------------ */

type ToneOpts = {
  type: OscillatorType
  freq: number
  /** Exponential glide target over the note's duration. */
  to?: number
  start: number
  dur: number
  gain: number
  attack?: number
  /** Optional low-pass to tame bright waveforms. */
  lowpass?: number
}

const SILENT = 0.0001

function tone(c: AudioContext, out: AudioNode, o: ToneOpts) {
  const osc = c.createOscillator()
  const amp = c.createGain()
  const attack = o.attack ?? 0.004
  const end = o.start + o.dur

  osc.type = o.type
  osc.frequency.setValueAtTime(o.freq, o.start)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, end)

  amp.gain.setValueAtTime(SILENT, o.start)
  amp.gain.exponentialRampToValueAtTime(o.gain, o.start + attack)
  amp.gain.exponentialRampToValueAtTime(SILENT, end)

  let filter: BiquadFilterNode | null = null
  if (o.lowpass) {
    filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = o.lowpass
    osc.connect(filter).connect(amp)
  } else {
    osc.connect(amp)
  }
  amp.connect(out)

  osc.onended = () => {
    osc.disconnect()
    filter?.disconnect()
    amp.disconnect()
  }
  osc.start(o.start)
  osc.stop(end + 0.02)
}

type NoiseOpts = {
  start: number
  dur: number
  gain: number
  filter: BiquadFilterType
  freq: number
  to?: number
  q?: number
  /** Seconds to reach peak gain (default 5ms). */
  attack?: number
}

function noise(c: AudioContext, out: AudioNode, o: NoiseOpts) {
  const src = c.createBufferSource()
  const filter = c.createBiquadFilter()
  const amp = c.createGain()
  const end = o.start + o.dur
  const attack = o.attack ?? 0.005

  src.buffer = getNoise(c)
  filter.type = o.filter
  filter.Q.value = o.q ?? 0.8
  filter.frequency.setValueAtTime(o.freq, o.start)
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, end)

  amp.gain.setValueAtTime(SILENT, o.start)
  amp.gain.exponentialRampToValueAtTime(o.gain, o.start + attack)
  amp.gain.exponentialRampToValueAtTime(SILENT, end)

  src.connect(filter).connect(amp).connect(out)
  src.onended = () => {
    src.disconnect()
    filter.disconnect()
    amp.disconnect()
  }
  // Random offset so repeated bursts never sound identical.
  src.start(o.start, Math.random() * 0.4)
  src.stop(end + 0.02)
}

type Voice = (c: AudioContext, out: AudioNode, t: number) => void

const voices: Record<SfxName, Voice> = {
  // 15ms soft, very quiet high tick.
  hover: (c, out, t) => {
    tone(c, out, { type: 'sine', freq: 2600, to: 2100, start: t, dur: 0.015, gain: 0.14, attack: 0.002 })
  },

  // 40ms square-ish blip with a pitch drop.
  click: (c, out, t) => {
    tone(c, out, { type: 'square', freq: 1150, to: 520, start: t, dur: 0.04, gain: 0.32, attack: 0.002, lowpass: 3800 })
    tone(c, out, { type: 'triangle', freq: 300, to: 160, start: t, dur: 0.035, gain: 0.25, attack: 0.002 })
  },

  // Quick upward chirp.
  jump: (c, out, t) => {
    tone(c, out, { type: 'square', freq: 260, to: 940, start: t, dur: 0.14, gain: 0.26, attack: 0.005, lowpass: 4200 })
  },

  // Two-note "coin" sparkle (B5 → E6).
  pickup: (c, out, t) => {
    tone(c, out, { type: 'square', freq: 987.77, start: t, dur: 0.07, gain: 0.22, lowpass: 5200 })
    tone(c, out, { type: 'square', freq: 1318.51, start: t + 0.065, dur: 0.22, gain: 0.22, lowpass: 5200 })
    tone(c, out, { type: 'sine', freq: 2637.02, start: t + 0.065, dur: 0.16, gain: 0.08 })
  },

  // Filtered noise burst + a low thud.
  crash: (c, out, t) => {
    noise(c, out, { start: t, dur: 0.42, gain: 0.85, filter: 'lowpass', freq: 2600, to: 220, q: 0.7, attack: 0.003 })
    tone(c, out, { type: 'sine', freq: 150, to: 42, start: t, dur: 0.32, gain: 0.95, attack: 0.003 })
    tone(c, out, { type: 'square', freq: 90, to: 50, start: t, dur: 0.12, gain: 0.18, attack: 0.002, lowpass: 600 })
  },

  // Major arpeggio C5 E5 G5 C6.
  success: (c, out, t) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      const last = i === notes.length - 1
      tone(c, out, { type: 'triangle', freq: f, start: t + i * 0.075, dur: last ? 0.45 : 0.16, gain: 0.34, attack: 0.006 })
      tone(c, out, { type: 'square', freq: f * 2, start: t + i * 0.075, dur: last ? 0.2 : 0.08, gain: 0.05, lowpass: 5000 })
    })
  },

  // Band-passed noise sweeping up then fading.
  whoosh: (c, out, t) => {
    noise(c, out, { start: t, dur: 0.42, gain: 0.7, filter: 'bandpass', freq: 380, to: 3400, q: 1.4, attack: 0.16 })
  },

  // Retro "power-up": fast rising square arpeggio + a shimmering tail.
  unlock: (c, out, t) => {
    const notes = [392, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98]
    notes.forEach((f, i) => {
      tone(c, out, { type: 'square', freq: f, start: t + i * 0.045, dur: 0.075, gain: 0.17, attack: 0.003, lowpass: 5000 })
    })
    const tail = t + notes.length * 0.045
    tone(c, out, { type: 'triangle', freq: 1567.98, start: tail, dur: 0.38, gain: 0.26, attack: 0.008 })
    tone(c, out, { type: 'sine', freq: 3135.96, start: tail, dur: 0.3, gain: 0.07, attack: 0.008 })
  },
}

/**
 * Play a UI sound. Silently does nothing when sound is off, before the first
 * user gesture, or when Web Audio is unavailable. Never throws.
 */
export function playSfx(name: SfxName): void {
  if (!enabled || !hasGesture()) return
  if (name === 'hover') {
    const now = performance.now()
    if (now - lastHover < HOVER_GAP) return
    lastHover = now
  }
  const c = wake()
  if (!c || !master) return
  try {
    voices[name](c, master, c.currentTime + 0.005)
  } catch {
    /* a failed blip must never break the UI */
  }
}
