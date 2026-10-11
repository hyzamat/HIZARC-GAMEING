import { useInsertionEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { playSfx, useSfxEnabled } from '@/lib/sfx'
import { ensureFxStyles } from './styles'

/** Per-bar loop timing + the resting height used when motion is reduced. */
const BARS: { dur: number; delay: number; rest: number }[] = [
  { dur: 0.82, delay: -0.3, rest: 0.55 },
  { dur: 1.06, delay: -0.1, rest: 1 },
  { dur: 0.74, delay: -0.55, rest: 0.7 },
  { dur: 0.96, delay: -0.2, rest: 0.4 },
]

/**
 * 44×44 sound-effects switch for the dark glass navbar.
 * On: four equalizer bars bouncing on staggered CSS loops. Off: a flat line
 * with a small 28° slash. Turning it on plays the 'unlock' power-up.
 * State is shared app-wide (useSfxEnabled), so every instance stays in sync.
 */
export function SoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useSfxEnabled()
  const reduce = useReducedMotion()
  // Bumped on every enable so the ping ring replays.
  const [ping, setPing] = useState(0)

  useInsertionEffect(() => ensureFxStyles(), [])

  const toggle = () => {
    const next = !on
    setOn(next)
    if (next) {
      playSfx('unlock')
      setPing((n) => n + 1)
    }
  }

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label="Sound effects on/off"
        data-sfx="off"
        className={cn(
          'group peer relative grid size-11 place-items-center transition-colors duration-300',
          on ? 'text-snow' : 'text-mist hover:text-snow',
        )}
      >
        {/* Chamfer lives on a backing layer so it never clips the focus ring */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 chamfer-sm transition-colors duration-300',
            on ? 'bg-brand/[0.16] group-hover:bg-brand/25' : 'bg-white/[0.07] group-hover:bg-white/[0.12]',
          )}
        />

        {/* Equalizer (on) */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 grid place-items-center transition-[opacity,scale] duration-300 ease-out-expo',
            on ? 'scale-y-100 opacity-100' : 'hz-eq-paused scale-y-[0.15] opacity-0',
          )}
        >
          <span className="flex h-4 items-center gap-[2px]">
            {BARS.map((b, i) => (
              <span
                key={i}
                className="hz-eq-bar block h-4 w-[3px] rounded-[1px] bg-gradient-to-t from-brand-400 to-cyan shadow-[0_0_6px_rgba(46,230,255,0.45)]"
                style={{ '--hz-eq-dur': `${b.dur}s`, '--hz-eq-delay': `${b.delay}s`, transform: `scaleY(${b.rest})` } as CSSProperties}
              />
            ))}
          </span>
        </span>

        {/* Muted (off): flat line + slash */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 grid place-items-center transition-[opacity,scale] duration-300 ease-out-expo',
            on ? 'scale-75 opacity-0' : 'scale-100 opacity-100',
          )}
        >
          <span className="relative block h-4 w-[18px]">
            <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-current opacity-70" />
            <span className="absolute top-1/2 left-1/2 h-[2px] w-[22px] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] rounded-full bg-ember/90 shadow-[0_0_0_2px_var(--color-ink-900)]" />
          </span>
        </span>
      </button>

      {/* Enable flourish — lives outside the chamfered button so it isn't clipped */}
      <AnimatePresence>
        {ping > 0 && on && !reduce && (
          <motion.span
            key={ping}
            aria-hidden
            className="pointer-events-none absolute inset-0 chamfer-sm ring-2 ring-cyan/70 ring-inset"
            initial={{ opacity: 0.9, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Mono HUD hint (hover-capable devices + keyboard focus) */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-full left-1/2 mt-2 hidden -translate-x-1/2 translate-y-1 items-center gap-1.5 bg-ink-900/95 px-2.5 py-1.5 font-mono text-[0.6rem] tracking-[0.22em] whitespace-nowrap text-mist uppercase opacity-0 ring-1 ring-white/10 transition-[opacity,translate] duration-200 ring-inset chamfer [--cut:5px] peer-hover:translate-y-0 peer-hover:opacity-100 peer-focus-visible:translate-y-0 peer-focus-visible:opacity-100 md:inline-flex"
      >
        <span className={cn('size-1.5 rounded-full', on ? 'bg-volt shadow-[0_0_6px_var(--color-volt)]' : 'bg-haze')} />
        SFX {on ? 'on' : 'off'}
      </span>
    </span>
  )
}
