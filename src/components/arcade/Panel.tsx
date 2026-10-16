import type { ReactNode } from 'react'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Tag } from '@/components/ui/Tag'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { padScore } from './constants'
import { Keycap } from './Keycap'
import { Leaderboard } from './Leaderboard'
import type { ArcadeScores } from './scores'

const heading = 'flex items-center gap-3 font-mono text-[0.68rem] tracking-[0.25em] text-brand-300 uppercase'

/** Dark chamfered card with a 1px hairline, matching the cabinet language. */
function Card({ index, title, children, className }: { index: string; title: string; children: ReactNode; className?: string }) {
  return (
    <div className="chamfer flex h-full flex-col bg-white/[0.1] p-px [--cut:16px]">
      <div className={cn('chamfer flex-1 bg-ink-800/90 p-5 [--cut:15px] sm:p-6', className)}>
        <p className={cn(heading, 'mb-4')}>
          <span className="text-cyan">[{index}]</span>
          {title}
        </p>
        {children}
      </div>
    </div>
  )
}

function ControlRow({ keys, children }: { keys: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex flex-wrap items-center gap-1.5">{keys}</span>
      <span className="text-right text-sm text-mist">{children}</span>
    </li>
  )
}

/**
 * Right-hand column: how to play + local scores.
 * Phones/tablets: stacked (two columns from `sm`) under the cabinet. Desktop: stretches to the height of the
 * cabinet + CTA column so both sides end on the same line.
 */
export function ArcadePanel({ scores }: { scores: ArcadeScores }) {
  return (
    <div className="grid h-full gap-4 sm:grid-cols-2 lg:flex lg:flex-col">
      <Reveal delay={0.05} amount={0.1} className="lg:shrink-0">
        <Card index="01" title="How to play">
          <ul className="grid gap-3.5">
            <ControlRow
              keys={
                <>
                  <Keycap>Space</Keycap>
                  <Keycap>↑</Keycap>
                  <Keycap>W</Keycap>
                  <Keycap>Tap</Keycap>
                </>
              }
            >
              Jump
            </ControlRow>
            <ControlRow keys={<Keycap>Hold</Keycap>}>Jump higher</ControlRow>
            <ControlRow keys={<Keycap>Again</Keycap>}>Double jump in air</ControlRow>
            <ControlRow
              keys={
                <>
                  <Keycap>Esc</Keycap>
                  <Keycap>P</Keycap>
                </>
              }
            >
              Pause
            </ControlRow>
          </ul>
          <p className="mt-5 flex gap-3 border-t border-line pt-4 text-sm leading-relaxed text-mist">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-volt shadow-[0_0_10px_rgba(215,255,58,0.7)]" />
            <span>
              Grab volt orbs to charge <span className="font-medium text-snow">Overdrive</span>: double score, smash through shards, glide over gaps.
            </span>
          </p>
        </Card>
      </Reveal>

      <Reveal delay={0.12} amount={0.1} className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <Card index="02" title="High scores" className="flex flex-col lg:flex-1">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[0.62rem] tracking-[0.26em] text-haze uppercase">Your best</p>
              <p className="mt-1 font-display text-[clamp(1.7rem,6vw,2.1rem)] leading-none font-extrabold tracking-[-0.01em] text-gradient tabular-nums">{padScore(scores.best)}</p>
            </div>
            <Tag tone="volt" dot>
              Local
            </Tag>
          </div>
          <Leaderboard board={scores.board} latest={scores.latest} stretch />
          <p className="mt-3 text-xs text-haze">Saved on this device only.</p>
        </Card>
      </Reveal>
    </div>
  )
}

/** "End of level" call to action — a wide banner under the cabinet. */
export function ArcadeCta() {
  return (
    <div className="@container chamfer bg-gradient-to-br from-brand via-brand-600 to-violet p-px [--cut:20px]">
      <div className="chamfer relative overflow-hidden bg-ink-900 p-6 [--cut:19px] sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 bg-[radial-gradient(closest-side,rgba(46,230,255,0.28),transparent)]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 bg-[radial-gradient(closest-side,rgba(124,92,255,0.3),transparent)]" />
        {/* Container query: side-by-side only when the banner itself is wide enough (not just the viewport) */}
        <div className="relative flex flex-col gap-6 @[40rem]:flex-row @[40rem]:items-center @[40rem]:gap-8">
          <div aria-hidden className="w-11 shrink-0 drop-shadow-[0_0_20px_rgba(46,230,255,0.45)] sm:w-14">
            <LogoMark variant="gradient" title="" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={heading}>
              <span className="text-cyan">[+]</span>
              Built by {site.name}
            </p>
            <p className="mt-3 font-display text-[clamp(1.15rem,4.6vw,1.75rem)] leading-[1.15] font-bold text-balance text-snow">
              Liked the dash? <span className="text-gradient">Our full games</span> are on the way.
            </p>
          </div>
          <div className="shrink-0">
            <Button href="#games" size="lg">
              See our games
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
