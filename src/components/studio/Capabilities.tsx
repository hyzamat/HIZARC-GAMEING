import { motion } from 'framer-motion'
import type { PointerEvent } from 'react'
import { Reveal } from '@/components/ui/Reveal'
import { pad2 } from '@/components/upcoming/meta'
import { cn } from '@/lib/cn'
import { capabilities, type Capability } from './content'
import { Frame } from './Frame'
import { SubHeading } from './SubHeading'

/** "What we do": six capability cards with a cursor-following border spotlight on desktop. */
export function Capabilities({ className }: { className?: string }) {
  return (
    <div className={className}>
      <SubHeading
        label="Capabilities"
        title="What we *do.*"
        aside="Six ways we turn ideas into games people can't put down — alone or as an extension of your team."
      />
      <ul className="mt-9 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {capabilities.map((item, i) => (
          <CapabilityCard key={item.title} item={item} index={i} />
        ))}
      </ul>
    </div>
  )
}

/* Spotlight layers read --mx / --my, which the pointer handler writes straight to the DOM (no re-render). */
const BORDER_SPOT = 'radial-gradient(230px circle at var(--mx) var(--my), rgb(46 230 255 / 0.95), rgb(10 124 255 / 0.5) 42%, transparent 72%)'
const SURFACE_SPOT = 'radial-gradient(360px circle at var(--mx) var(--my), rgb(10 124 255 / 0.17), transparent 68%)'

function CapabilityCard({ item, index }: { item: Capability; index: number }) {
  const { Icon } = item

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <Reveal as="li" y={32} delay={(index % 3) * 0.09} amount={0.2} className="group relative [--mx:30%] [--my:0%]" onPointerMove={onPointerMove} whileHover="hover">
      <Frame
        cut={22}
        outerClassName="h-full"
        className="flex h-full flex-col bg-ink-800 p-5 sm:p-6 lg:p-7"
        behind={
          <span
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: BORDER_SPOT }}
          />
        }
      >
        {/* static glow for touch screens + hover spotlight for mice */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgb(10_124_255/0.15),transparent_55%)]" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: SURFACE_SPOT }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center bg-gradient-to-br from-brand/30 to-cyan/10 text-cyan ring-1 ring-brand/30 transition-[background-color,color] duration-300 ring-inset chamfer-sm group-hover:from-brand group-hover:to-brand-400 group-hover:text-white sm:size-14">
            <motion.span variants={{ hover: item.hover }} className="grid place-items-center">
              <Icon aria-hidden className="size-6 sm:size-7" strokeWidth={1.7} />
            </motion.span>
          </span>
          <span aria-hidden className="font-mono text-[0.7rem] tracking-[0.25em] text-haze">
            [{pad2(index + 1)}]
          </span>
        </div>

        <h4 className="relative mt-6 font-display text-[1.1rem] leading-snug font-semibold tracking-[-0.01em] text-snow sm:mt-7 sm:text-xl">{item.title}</h4>
        <p className="relative mt-2.5 text-[0.95rem] leading-relaxed text-mist">{item.text}</p>

        <ul aria-label={`${item.title} focus`} className="relative mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-6 font-mono text-[0.62rem] tracking-[0.18em] text-mist uppercase">
          {item.tags.map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-2 -skew-x-[28deg] bg-brand/70" />
              {t}
            </li>
          ))}
        </ul>

        {/* baseline that charges up on hover */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-[0.14] bg-gradient-to-r from-cyan via-brand to-transparent transition-transform duration-700 ease-out-expo group-hover:scale-x-100',
          )}
        />
      </Frame>
    </Reveal>
  )
}
