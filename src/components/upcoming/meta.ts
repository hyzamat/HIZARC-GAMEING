import type { ComponentProps } from 'react'
import type { Tag } from '@/components/ui/Tag'
import type { DevStage } from '@/data/games'

export type StageTone = NonNullable<ComponentProps<typeof Tag>['tone']>

/** Production pipeline, in order. */
export const STAGES: DevStage[] = ['Concept', 'Pre-production', 'Production', 'Alpha', 'Beta', 'Soft launch']

/** Tag colour per development stage — colder early, hotter (volt) close to launch. */
export const stageTone: Record<DevStage, StageTone> = {
  Concept: 'default',
  'Pre-production': 'violet',
  Production: 'brand',
  Alpha: 'cyan',
  Beta: 'volt',
  'Soft launch': 'volt',
}

/** Solid accent per stage — progress segments, HUD brackets, pipeline. Matches the Tag tones. */
export const stageAccent: Record<DevStage, string> = {
  Concept: '#aab5d3',
  'Pre-production': '#9d86ff',
  Production: '#3d9bff',
  Alpha: '#2ee6ff',
  Beta: '#d7ff3a',
  'Soft launch': '#d7ff3a',
}

/** Stages with players already in the build get a pulsing "live" dot. */
export const isLiveStage = (stage: DevStage) => stage === 'Beta' || stage === 'Soft launch'

/** Two-digit HUD index: 1 → "01". */
export const pad2 = (n: number) => String(n).padStart(2, '0')

/** '#rrggbb' + alpha → 'rgb(r g b / a)'. Falls back to the input for non-hex colours. */
export function withAlpha(hex: string, alpha: number) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim())
  if (!m) return hex
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return `rgb(${r} ${g} ${b} / ${alpha})`
}

// Launch times are announced in studio time (Calicut, IST / UTC+5:30).
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kolkata' })

export function formatLaunch(ms: number) {
  return { date: dateFmt.format(ms), time: `${timeFmt.format(ms)} IST` }
}

/** Parse an ISO date; returns null when missing or invalid. */
export function parseLaunch(iso?: string) {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}
