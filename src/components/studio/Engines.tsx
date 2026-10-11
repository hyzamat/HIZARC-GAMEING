import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Gamepad2, Glasses, Globe, Monitor, Smartphone, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import { Reveal } from '@/components/ui/Reveal'
import { engines, platformsWeBuildFor } from '@/config/site'
import { cn } from '@/lib/cn'
import { engineCards } from './content'
import { Frame } from './Frame'

type PlatformLabel = (typeof platformsWeBuildFor)[number]

const platformIcon: Record<PlatformLabel, LucideIcon> = {
  iOS: Smartphone,
  Android: Smartphone,
  PC: Monitor,
  'Web / WebGL': Globe,
  Console: Gamepad2,
  'AR / VR': Glasses,
}

/** "Powered by" strip: two engine plates with drifting text wordmarks, then the platform dock. */
export function Engines({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h3 className="mb-5 sm:mb-6">
        <Reveal as="span" y={10} className="flex items-center gap-3 font-mono text-[0.68rem] tracking-[0.25em] text-mist uppercase">
          <span aria-hidden className="h-[3px] w-6 -skew-x-[28deg] bg-cyan" />
          Powered by
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          <span className="hidden text-snow sm:inline">{engines.join(' + ')}</span>
        </Reveal>
      </h3>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-5">
        {engineCards.map((engine, i) => (
          <EnginePlate key={engine.id} engine={engine} index={i} />
        ))}
      </div>

      <div className="mt-8 sm:mt-10">
        <h4 className="mb-4">
          <Reveal as="span" y={10} className="block font-mono text-[0.68rem] tracking-[0.25em] text-mist uppercase">
            Built for
          </Reveal>
        </h4>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {platformsWeBuildFor.map((p, i) => {
            const Icon = platformIcon[p]
            return (
              <Reveal
                as="li"
                key={p}
                y={18}
                delay={i * 0.06}
                amount={0.4}
                className="group flex h-14 min-w-0 items-center gap-2.5 bg-white/[0.035] px-3.5 text-mist ring-1 ring-white/[0.08] transition-[background-color,color,box-shadow] duration-300 ring-inset chamfer-sm hover:bg-brand/10 hover:text-snow hover:ring-cyan/40 sm:gap-3 sm:px-4"
              >
                <Icon aria-hidden className="size-[1.15rem] shrink-0 text-brand-300 transition-colors group-hover:text-cyan" strokeWidth={1.8} />
                <span className="min-w-0 font-mono text-[0.66rem] tracking-[0.12em] whitespace-nowrap uppercase sm:text-[0.68rem] sm:tracking-[0.14em]">{p}</span>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

type EngineCard = (typeof engineCards)[number]

function EnginePlate({ engine, index }: { engine: EngineCard; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // Wordmarks drift in opposite directions as the strip crosses the screen.
  const drift = index === 0 ? [-34, 34] : [34, -34]
  const x = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : drift)
  const unreal = engine.id === 'unreal'

  return (
    <Reveal y={36} delay={index * 0.1} amount={0.25}>
      <div ref={ref} className="group h-full">
        <Frame
          cut={26}
          outerClassName="h-full"
          frameClassName="bg-gradient-to-br from-white/20 via-white/[0.06] to-white/15 group-hover:from-cyan/50 group-hover:via-brand/20 group-hover:to-brand/40"
          className="flex h-full min-h-[17rem] flex-col overflow-hidden bg-ink-800 p-5 sm:min-h-[19rem] sm:p-7 lg:p-8"
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0',
              unreal
                ? 'bg-[radial-gradient(70%_80%_at_100%_100%,rgb(124_92_255/0.22),transparent_70%)]'
                : 'bg-[radial-gradient(70%_80%_at_0%_100%,rgb(10_124_255/0.24),transparent_70%)]',
            )}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-dots opacity-50 [mask-image:linear-gradient(to_bottom,transparent,#000_45%,transparent)]" />

          <div className="relative flex items-center justify-between font-mono text-[0.64rem] tracking-[0.22em] uppercase">
            <span className="text-cyan">Engine {engine.index}</span>
            <span aria-hidden className="h-px flex-1 mx-4 bg-gradient-to-r from-white/15 to-transparent" />
            <span className="text-mist">{unreal ? 'AAA fidelity' : 'Maximum reach'}</span>
          </div>

          {/* The wordmark: pure type, no external logos. */}
          <motion.h4
            style={{ x }}
            className="relative mt-7 font-display text-[clamp(2.7rem,12.5vw,5.75rem)] leading-[0.92] font-bold tracking-[-0.035em] uppercase will-change-transform lg:text-[clamp(2.7rem,5.4vw,5.75rem)]"
          >
            <span className="sr-only">{engine.name}</span>
            {unreal ? (
              <>
                <span aria-hidden className="text-outline block">
                  Unreal
                </span>
                <span aria-hidden className="mt-1 block text-[0.42em] tracking-[0.34em] text-snow">
                  Engine<span className="text-gradient"> 5</span>
                </span>
              </>
            ) : (
              <span aria-hidden className="text-snow">
                Unity<span className="text-gradient">/</span>
              </span>
            )}
          </motion.h4>

          <p className="relative mt-auto max-w-md pt-8 text-[0.95rem] leading-relaxed text-mist">{engine.line}</p>
          <ul aria-label={`${engine.name} focus`} className="relative mt-4 flex flex-wrap gap-2">
            {engine.tags.map((t) => (
              <li key={t} className="bg-white/[0.05] px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-mist uppercase ring-1 ring-white/10 ring-inset chamfer-sm">
                {t}
              </li>
            ))}
          </ul>
        </Frame>
      </div>
    </Reveal>
  )
}
