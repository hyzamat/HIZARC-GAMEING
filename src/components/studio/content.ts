import { Gamepad2, Glasses, Globe, MapIcon, Smartphone, Sparkles, type LucideIcon } from 'lucide-react'
import type { TargetAndTransition } from 'framer-motion'

/* ---------------------------------------------------------------- */
/*  Studio copy & data — edit here, the components just render it.  */
/* ---------------------------------------------------------------- */

/** `*…*` marks the words that get the brand gradient. Keep highlights whitespace-delimited. */
export const manifesto =
  'HIZARC Games is the game studio of HIZARC — a technology company from *Calicut, Kerala, India.* We make *our own games:* open worlds you can build, drive and live in, for *Android, iOS and PC.* *Every frame is built to be felt.*'

export type Capability = {
  title: string
  text: string
  /** Mono chips at the bottom of the card. */
  tags: string[]
  Icon: LucideIcon
  /** Icon micro-animation, played on fine-pointer hover. */
  hover: TargetAndTransition
}

const ease = [0.45, 0, 0.2, 1] as const

export const capabilities: Capability[] = [
  {
    title: 'Original IP',
    text: 'Worlds, heroes and mechanics we dream up in-house — taken from the first sketch all the way to a live service.',
    tags: ['Game design', 'Art direction', 'Live ops'],
    Icon: Sparkles,
    hover: { rotate: [0, 16, -10, 0], scale: [1, 1.25, 0.95, 1], transition: { duration: 0.8, ease } },
  },
  {
    title: 'Open worlds',
    text: 'A city you build and then walk through as its Mayor, hill roads you drive for real: every game we make is a living open world.',
    tags: ['City building', 'Driving', 'Physics'],
    Icon: MapIcon,
    hover: { rotate: [0, -14, 10, 0], scale: [1, 1.18, 1], transition: { duration: 0.7, ease } },
  },
  {
    title: 'Mobile games',
    text: 'One-thumb controls, a 120 fps feel and economies tuned for the way the world plays on the go.',
    tags: ['iOS', 'Android', 'Unity'],
    Icon: Smartphone,
    hover: { rotate: [0, -16, 12, 0], y: [0, -4, 0], transition: { duration: 0.7, ease } },
  },
  {
    title: 'PC & console',
    text: 'Deep systems, controller-first design and the cinematic fidelity of Unreal Engine 5 — polished to platform standards.',
    tags: ['Unreal 5', 'Steam', 'Console'],
    Icon: Gamepad2,
    hover: { x: [0, -3, 3, -2, 2, 0], rotate: [0, -7, 7, -4, 0], transition: { duration: 0.6, ease: 'linear' } },
  },
  {
    title: 'WebGL & instant games',
    text: 'Zero-install play. Lightweight builds that load in seconds and run in any browser, on any device.',
    tags: ['WebGL', 'No install', 'Instant'],
    Icon: Globe,
    hover: { rotate: [0, 24, -16, 0], scale: [1, 1.14, 1], transition: { duration: 0.9, ease } },
  },
  {
    title: 'AR / VR experiences',
    text: 'Spatial games and hand-tracked interactions for headsets and phones.',
    tags: ['Headsets', 'Hand tracking', 'Spatial'],
    Icon: Glasses,
    hover: { scaleX: [1, 1.22, 1], y: [0, -3, 0], transition: { duration: 0.7, ease } },
  },
]

export const engineCards = [
  {
    id: 'unity',
    index: '01',
    name: 'Unity',
    line: 'Fast iteration and rock-solid reach — our workhorse for mobile, web and XR.',
    tags: ['Mobile', 'WebGL', '2D / 3D', 'XR'],
  },
  {
    id: 'unreal',
    index: '02',
    name: 'Unreal Engine',
    line: 'Cinematic lighting and AAA-grade worlds for PC, console and immersive VR.',
    tags: ['PC', 'Console', 'Unreal 5', 'VR'],
  },
] as const

export const pillars = [
  {
    n: '01',
    kicker: 'Why we ship',
    title: 'Player-first',
    text: 'We playtest early, listen hard and cut anything that does not make the game better for the person holding the controller.',
  },
  {
    n: '02',
    kicker: 'How we build',
    title: 'Craft over noise',
    text: 'A small team and obsessive polish on feel, sound and motion. One game players love beats ten they forget.',
  },
  {
    n: '03',
    kicker: 'How we grow',
    title: 'Ship & iterate',
    text: 'Real builds in weeks, not quarters. Live data and community feedback steer every update long after launch.',
  },
] as const

/** Disciplines scrolling through the careers band (not a list of open roles). */
export const disciplines = ['Gameplay', 'Tech art', '3D environments', 'Animation', 'Game design', 'Engine programming', 'UI / UX', 'QA', 'Production']
