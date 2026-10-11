import { motion, type Variants } from 'framer-motion'
import { Container } from '@/components/ui/Container'
import { EASE_OUT } from '@/components/ui/Reveal'
import { engines, platformsWeBuildFor } from '@/config/site'
import { cn } from '@/lib/cn'
import { useHeroTiming } from './timing'

type HeroHudProps = {
  /** Intro finished — the row may enter (pass useIntroDone()). */
  play: boolean
}

/** Engines first, then platforms — the single source for the HUD list. */
const ITEMS: string[] = [...engines, ...platformsWeBuildFor]

/**
 * Responsive budget for the list so it can never overflow the row:
 * 3 entries on tiny phones · 4 from 360px · 5 from sm · 6 from md · all from xl.
 * (Classes are written out in full so Tailwind can see them.)
 */
function visibility(i: number) {
  if (i < 3) return 'flex'
  if (i === 3) return 'hidden min-[360px]:flex'
  if (i === 4) return 'hidden sm:flex'
  if (i === 5) return 'hidden md:flex'
  return 'hidden xl:flex'
}

/** "Unreal Engine" → "Unreal" on the smallest screens; "Web / WebGL" → "WebGL" (a slash inside a slash list reads as two items). */
function Label({ text }: { text: string }) {
  if (text === 'Web / WebGL') return <>WebGL</>
  const m = text.match(/^(.*?)( Engine)$/)
  if (!m) return <>{text}</>
  return (
    <>
      {m[1]}
      <span className="hidden sm:inline">{m[2]}</span>
    </>
  )
}

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE_OUT } },
}

/**
 * Bottom HUD row of the hero: a scroll cue on the left (falling light on a
 * hairline), studio coordinates in the middle (wide desktop), and the engines
 * & platforms as a thin mono list with slashes on the right.
 */
export function HeroHud({ play }: HeroHudProps) {
  const t = useHeroTiming()
  return (
    <motion.div
      initial="hidden"
      animate={play ? 'show' : 'hidden'}
      variants={{ hidden: {}, show: { transition: { delayChildren: t.hud, staggerChildren: 0.12 } } }}
    >
      <Container className="pb-safe flex items-end justify-between gap-5 pt-3">
        {/* Scroll cue */}
        <motion.a
          href="#games"
          aria-label="Scroll down to our games"
          variants={rise}
          className="group -ml-2 flex min-h-11 shrink-0 items-center gap-3 pr-3 pl-2 font-mono text-[0.62rem] tracking-[0.28em] text-haze uppercase transition-colors duration-300 hover:text-snow sm:text-[0.66rem]"
        >
          <span aria-hidden className="relative h-9 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[hz-drop_2.2s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-gradient-to-b from-transparent via-cyan to-transparent" />
          </span>
          Scroll
        </motion.a>

        {/* Studio coordinates (wide desktop only) */}
        <motion.p
          variants={rise}
          aria-hidden
          className="hidden items-center gap-3 pb-3 font-mono text-[0.62rem] tracking-[0.25em] whitespace-nowrap text-haze/80 uppercase xl:flex"
        >
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/25" />
          11.26° N <span className="text-white/25">/</span> 75.78° E
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-white/25" />
        </motion.p>

        {/* Engines & platforms */}
        <motion.ul
          variants={rise}
          aria-label="Engines and platforms"
          className="flex min-w-0 items-center pb-3 font-mono text-[0.6rem] tracking-[0.16em] whitespace-nowrap text-haze uppercase sm:text-[0.66rem] sm:tracking-[0.2em]"
        >
          {ITEMS.map((item, i) => (
            <li key={item} className={cn('items-center', visibility(i))}>
              {i > 0 && (
                <span aria-hidden className="px-[0.6em] text-brand-400/80 sm:px-[0.8em]">
                  /
                </span>
              )}
              <span className={cn(i < engines.length && 'text-mist')}>
                <Label text={item} />
              </span>
            </li>
          ))}
        </motion.ul>
      </Container>
    </motion.div>
  )
}
