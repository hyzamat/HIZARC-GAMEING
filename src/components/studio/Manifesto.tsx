import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useMemo, useRef } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { Reveal } from '@/components/ui/Reveal'
import { useNow } from '@/components/upcoming/clock'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { manifesto } from './content'

type Word = { text: string; hl: boolean }

/** Split the manifesto into words; text between `*…*` markers is flagged as highlighted. */
function parseWords(source: string): Word[] {
  const words: Word[] = []
  source.split('*').forEach((chunk, i) => {
    for (const text of chunk.split(/\s+/).filter(Boolean)) words.push({ text, hl: i % 2 === 1 })
  })
  return words
}

/** Each word's reveal window overlaps its neighbours, so the light "travels" along the text. */
const WINDOW = 0.2

/**
 * Scroll-linked manifesto: every word fades from 15% → 100% as the paragraph travels through the
 * viewport (offset start 0.85 → end 0.45), with a progress rail alongside. Desktop adds a sticky
 * "studio card" (logo, HQ, live Calicut time) that stays put while the text lights up.
 */
export function Manifesto({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const words = useMemo(() => parseWords(manifesto), [])
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: paragraphRef, offset: ['start 0.85', 'end 0.45'] })
  const headY = useTransform(scrollYProgress, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`)

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16 xl:gap-24', className)}>
      <StudioCard />

      <div className="relative pl-5 sm:pl-8 lg:pl-10">
        {/* reading-progress rail */}
        <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-[2px] bg-white/10" />
        <motion.span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-[2px] origin-top bg-gradient-to-b from-cyan via-brand to-violet" style={{ scaleY: scrollYProgress }} />
        <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-[2px]">
          <motion.span
            className="absolute -left-[3px] size-2 -translate-y-1/2 rotate-45 bg-cyan shadow-[0_0_14px_3px_rgba(46,230,255,0.65)]"
            style={{ top: headY }}
          />
        </span>

        <p
          ref={paragraphRef}
          className="text-[clamp(1.5rem,5vw,3rem)] leading-[1.2] font-semibold tracking-[-0.025em] text-snow"
        >
          {words.map((w, i) => (
            <ManifestoWord key={i} index={i} count={words.length} word={w} progress={scrollYProgress} reduce={!!reduce} last={i === words.length - 1} />
          ))}
        </p>
      </div>
    </div>
  )
}

type WordProps = { word: Word; index: number; count: number; progress: MotionValue<number>; reduce: boolean; last: boolean }

/** One word + the trailing space (kept outside the span so lines still wrap naturally). */
function ManifestoWord({ word, index, count, progress, reduce, last }: WordProps) {
  const start = (index / count) * (1 - WINDOW)
  const opacity = useTransform(progress, [start, start + WINDOW], [0.15, 1])
  // Plain words flash electric cyan as the "reading head" passes, then settle to snow —
  // a scanner sweeping along the text. (Gradient words keep their own fill.)
  const color = useTransform(progress, [start, start + WINDOW * 0.55, start + WINDOW], ['#6c789c', '#2ee6ff', '#f4f7ff'])
  return (
    <>
      <motion.span className={cn('inline-block', word.hl && 'text-gradient')} style={reduce ? undefined : word.hl ? { opacity } : { opacity, color }}>
        {word.text}
      </motion.span>
      {!last && ' '}
    </>
  )
}

/* ---------------------------------------------------------------- */
/*  Studio card (left rail)                                         */
/* ---------------------------------------------------------------- */

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kolkata' })

function StudioCard() {
  const ref = useRef<HTMLDListElement>(null)
  const visible = useInView(ref)
  const now = useNow(visible)

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <Reveal className="flex items-center gap-5 lg:flex-col lg:items-start lg:gap-7">
        <div className="relative w-14 shrink-0 lg:w-24">
          <span aria-hidden className="absolute -inset-6 bg-[radial-gradient(closest-side,rgb(10_124_255/0.28),transparent)]" />
          <LogoMark variant="gradient" title="" className="relative" />
        </div>
        <dl ref={ref} className="grid gap-3.5 font-mono text-[0.66rem] tracking-[0.2em] uppercase">
          <div>
            <dt className="flex items-center gap-2 text-haze">
              <span aria-hidden className="h-[3px] w-4 -skew-x-[28deg] bg-cyan" />
              Manifesto
            </dt>
            <dd className="mt-1.5 text-snow">The short version</dd>
          </div>
          <div>
            <dt className="text-haze">Headquarters</dt>
            <dd className="mt-1.5 text-snow">{site.location}</dd>
          </div>
          <div>
            <dt className="text-haze">Studio time</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-snow">
              <span aria-hidden className="size-1.5 animate-pulse-soft rounded-full bg-volt shadow-[0_0_10px_rgba(215,255,58,0.8)]" />
              <span className="tabular-nums">{timeFmt.format(now)}</span> IST
            </dd>
          </div>
        </dl>
      </Reveal>
    </div>
  )
}
