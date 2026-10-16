import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Mail, RotateCcw } from 'lucide-react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { EASE_OUT } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import { site } from '@/config/site'
import { buildMailtoDraft, type ContactPayload, type ContactResult } from '@/lib/contact'
import { NAV_OFFSET, scrollToTarget } from '@/lib/scroll'
import { CopyButton } from './CopyButton'

type SuccessPanelProps = {
  via: ContactResult['via']
  payload: ContactPayload
  onReset: () => void
}

/* Celebration shards: evenly spread with a little jitter, brand palette. */
const SHARD_COLORS = ['bg-cyan', 'bg-brand', 'bg-volt', 'bg-violet', 'bg-brand-300'] as const
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12)
  const dist = 78 + (i % 3) * 18
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rotate: (angle * 180) / Math.PI,
    color: SHARD_COLORS[i % SHARD_COLORS.length],
    delay: 0.5 + (i % 4) * 0.03,
  }
})

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.55 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
}

/** Chamfered badge whose outline + check mark draw themselves, with rings and a shard burst. */
function SuccessBadge() {
  const reduce = useReducedMotion()
  const gid = `ok-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div aria-hidden className="relative grid size-28 place-items-center sm:size-32">
      <span className="absolute -inset-12 bg-[radial-gradient(closest-side,rgba(46,230,255,0.26),rgba(10,124,255,0.12)_55%,transparent)]" />

      {!reduce &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="chamfer absolute inset-0 border-2 border-cyan/60 [--cut:22px]"
            initial={{ scale: 0.7, opacity: 0.9 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.5, delay: 0.55 + i * 0.22, ease: EASE_OUT }}
          />
        ))}

      {!reduce &&
        SHARDS.map((s, i) => (
          <motion.span
            key={i}
            className={`chamfer absolute top-1/2 left-1/2 -mt-[3px] -ml-2 h-1.5 w-4 [--cut:3px] ${s.color}`}
            style={{ rotate: s.rotate }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
            animate={{ x: s.x, y: s.y, opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.5] }}
            transition={{ duration: 1.1, delay: s.delay, ease: EASE_OUT, times: [0, 0.15, 0.6, 1] }}
          />
        ))}

      <motion.svg
        viewBox="0 0 120 120"
        className="relative size-full overflow-visible"
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3d9bff" />
            <stop offset="100%" stopColor="#2ee6ff" />
          </linearGradient>
        </defs>
        {/* chamfered plate (logo-cut corners) */}
        <path d="M28 4H116V92L92 116H4V28Z" fill="rgba(10,124,255,0.12)" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <motion.path
          d="M28 4H116V92L92 116H4V28Z"
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="3"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
        />
        <motion.path
          d="M36 62L52 78L85 43"
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: 0.55, delay: 0.6, ease: EASE_OUT }, opacity: { duration: 0.1, delay: 0.6 } }}
        />
      </motion.svg>
    </div>
  )
}

/** Replaces the form after sending: celebratory badge, confirmation copy and a reset. */
export function SuccessPanel({ via, payload, onReset }: SuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const mailto = via === 'mailto'
  const firstName = payload.name.split(/\s+/)[0] ?? payload.name
  // The same draft the browser was handed (also used by "Open email app again").
  const draft = useMemo(() => (mailto ? buildMailtoDraft(payload) : null), [mailto, payload])

  // Move focus to the confirmation (screen readers hear it) and make sure it's on screen.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < NAV_OFFSET || r.top > window.innerHeight * 0.6) scrollToTarget(el, { offset: -NAV_OFFSET - 24 })
  }, [])

  return (
    <motion.div ref={rootRef} variants={list} initial="hidden" animate="show" className="flex flex-col items-center px-5 pt-16 pb-12 text-center sm:px-10 sm:pt-20 sm:pb-16">
      <SuccessBadge />

      <motion.p variants={item} className="mt-9 font-mono text-[0.68rem] tracking-[0.26em] text-cyan uppercase">
        {mailto ? '// Almost there' : '// Transmission complete'}
      </motion.p>
      <motion.h3
        ref={headingRef}
        tabIndex={-1}
        variants={item}
        className="mt-3 font-display text-[clamp(1.55rem,6.4vw,2.6rem)] leading-[1.08] font-bold tracking-[-0.02em] text-balance text-snow outline-none"
      >
        {mailto ? 'Your email app is opening…' : 'Message received.'}
      </motion.h3>

      <motion.p variants={item} className="mt-4 max-w-md text-base leading-relaxed text-mist">
        {mailto ? (
          <>We've pre-filled everything for you — just hit send. If nothing opened, email us directly:</>
        ) : (
          <>
            Thanks, <span className="text-snow">{firstName}</span> — your {payload.topic.toLowerCase()} enquiry just landed with the right team. We'll reply to{' '}
            <span className="break-all text-snow">{payload.email}</span> soon.
          </>
        )}
      </motion.p>

      {mailto ? (
        <motion.div variants={item} className="mt-6 flex w-full max-w-sm flex-col items-center gap-3">
          {/* The chamfered surface is a sibling layer, so the "Copied!" toast can pop out of the box unclipped. */}
          <div className="relative flex w-full items-center gap-3 py-1.5 pr-1.5 pl-4">
            <span aria-hidden className="chamfer-sm absolute inset-0 bg-white/[0.05] ring-1 ring-white/10 ring-inset" />
            <Mail className="relative size-4 shrink-0 text-brand-300" aria-hidden />
            <a
              href={`mailto:${site.email}`}
              className="relative min-w-0 flex-1 text-left font-display text-[0.8rem] font-semibold [overflow-wrap:anywhere] text-snow hover:text-cyan min-[380px]:text-[0.92rem]"
            >
              {site.email}
            </a>
            <CopyButton text={site.email} label={`Copy email address ${site.email}`} toastSide="top" />
          </div>
          <a
            href={draft?.href}
            className="inline-flex min-h-11 items-center font-mono text-[0.7rem] tracking-[0.18em] text-brand-300 uppercase underline decoration-brand/40 underline-offset-4 transition-colors hover:text-cyan hover:decoration-cyan"
          >
            Open email app again
          </a>
          {draft?.truncated && (
            // Long messages don't fit in an email link on every platform — hand over the full text.
            <div className="relative flex w-full items-center gap-3 py-1.5 pr-1.5 pl-4 text-left">
              <span aria-hidden className="chamfer-sm absolute inset-0 bg-volt/[0.07] ring-1 ring-volt/30 ring-inset" />
              <p className="relative min-w-0 flex-1 text-[0.82rem] leading-snug text-mist">
                Your message is long, so the draft holds the first part. Copy the full text and paste it into the email.
              </p>
              <CopyButton text={payload.message} label="Copy your full message" toastSide="top" />
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={item} className="mt-6 flex flex-wrap justify-center gap-2">
          <Tag tone="brand" dot>
            {payload.topic}
          </Tag>
          {payload.company && (
            <Tag className="max-w-full">
              <span className="min-w-0 truncate">{payload.company}</span>
            </Tag>
          )}
        </motion.div>
      )}

      <motion.div variants={item} className="mt-9 w-full sm:w-auto">
        <Button variant="ghost" onClick={onReset} icon={<RotateCcw className="size-4" strokeWidth={2.4} />} magnetic={false} className="w-full sm:w-auto">
          Send another
        </Button>
      </motion.div>
    </motion.div>
  )
}
