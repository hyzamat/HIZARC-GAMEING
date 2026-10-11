import { LayoutGroup, motion } from 'framer-motion'
import { useRef, type KeyboardEvent } from 'react'
import { contactTopics, type ContactTopic } from '@/config/site'
import { cn } from '@/lib/cn'
import { chamferRing } from './ChamferFrame'
import { topicMeta } from './topics'

type TopicPickerProps = {
  value: ContactTopic
  onChange: (topic: ContactTopic) => void
  /** id of the visible label for the radiogroup. */
  labelledBy: string
  /** id of the element describing the current choice. */
  describedBy?: string
  /** Flash a chip (e.g. when a deep link switched the topic). A new `key` replays the flash; `delay` (s) waits for a scroll to land. */
  pulse?: { key: number; topic: ContactTopic; delay?: number } | null
}

const RING = chamferRing(8)
const RING_THICK = chamferRing(8, 2)

/**
 * Single-select topic chips with radiogroup semantics:
 * roving tabindex, ←/→/↑/↓ move + select, Home/End jump. The active highlight glides between chips (layoutId).
 * Phones get a 2-up grid of "mode select" tiles (icon over label); wider screens get compact inline chips.
 */
export function TopicPicker({ value, onChange, labelledBy, describedBy, pulse }: TopicPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const count = contactTopics.length

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = contactTopics.indexOf(value)
    let next = -1
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % count
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + count) % count
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = count - 1
        break
      default:
        return
    }
    e.preventDefault()
    onChange(contactTopics[next])
    refs.current[next]?.focus()
  }

  return (
    <LayoutGroup id="contact-topic">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3"
      >
        {contactTopics.map((topic, i) => {
          const active = topic === value
          const Icon = topicMeta[topic].icon
          return (
            <motion.button
              key={topic}
              ref={(el: HTMLButtonElement | null) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(topic)}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'group/chip relative flex min-h-[4.5rem] flex-col items-start justify-between gap-2 p-3 text-left font-mono text-[0.66rem] leading-tight font-medium tracking-[0.1em] uppercase transition-colors duration-300',
                'sm:min-h-12 sm:flex-row sm:items-center sm:justify-start sm:gap-2.5 sm:px-3.5 sm:py-2 sm:text-[0.68rem]',
                active ? 'text-white' : 'text-mist hover:text-snow',
              )}
            >
              {/* resting surface + chamfered hairline */}
              <span aria-hidden className="chamfer-sm absolute inset-0 bg-white/[0.035] transition-colors duration-300 group-hover/chip:bg-white/[0.07]" />
              <span aria-hidden className="absolute inset-0 bg-white/[0.1] transition-colors duration-300 group-hover/chip:bg-white/[0.22]" style={{ clipPath: RING }} />
              {active && (
                <motion.span
                  layoutId="contact-topic-highlight"
                  aria-hidden
                  className="chamfer-sm absolute inset-0 bg-[linear-gradient(110deg,var(--color-brand-600),#0a6ee6_55%,var(--color-brand))]"
                  transition={{ type: 'spring', stiffness: 430, damping: 34, mass: 0.9 }}
                >
                  {/* top light + cyan edge for depth */}
                  <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 h-[2px] bg-cyan/80" />
                </motion.span>
              )}
              {/* deep-link flash: a cyan outline that blooms off the chip */}
              {pulse?.topic === topic && (
                <motion.span
                  key={pulse.key}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-cyan"
                  style={{ clipPath: RING_THICK }}
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.16 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: pulse.delay ?? 0.15 }}
                />
              )}
              <Icon
                aria-hidden
                className={cn('relative size-[18px] shrink-0 transition-colors duration-300 sm:size-4', active ? 'text-white' : 'text-brand-300 group-hover/chip:text-cyan')}
                strokeWidth={2}
              />
              <span className="relative">{topic}</span>
              {/* HUD index on the phone tiles */}
              <span
                aria-hidden
                className={cn('absolute top-3 right-3 text-[0.58rem] tracking-[0.14em] tabular-nums transition-colors duration-300 sm:hidden', active ? 'text-white/70' : 'text-haze')}
              >
                0{i + 1}
              </span>
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
