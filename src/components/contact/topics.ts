import { Briefcase, Handshake, LifeBuoy, Newspaper, type LucideIcon } from 'lucide-react'
import type { ContactTopic } from '@/config/site'

type TopicMeta = {
  icon: LucideIcon
  /** One-liner shown under the chips so people know they picked the right lane. */
  blurb: string
  /** Placeholder for the message box (visible while focused and empty). */
  prompt: string
  /** Tint of the console's outer aura — the panel "tunes" to the lane you pick (crossfaded, opacity only). */
  aura: string
}

/** Copy + icon for each contact topic chip. */
export const topicMeta: Record<ContactTopic, TopicMeta> = {
  Business: {
    icon: Handshake,
    blurb: 'Stores, platforms, licensing or anything else about our games.',
    prompt: 'Who you are, which game it is about and what you have in mind…',
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(10,124,255,0.2),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(124,92,255,0.14),transparent_70%)]',
  },
  'Press & Media': {
    icon: Newspaper,
    blurb: 'Interviews, press kits, review keys and event appearances.',
    prompt: "Your outlet, deadline and what you'd like to cover…",
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(125,185,255,0.16),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(46,230,255,0.12),transparent_70%)]',
  },
  Careers: {
    icon: Briefcase,
    blurb: 'Want to build worlds with us? Share your craft and a portfolio link.',
    prompt: "The role you're after, your experience and a portfolio or LinkedIn link…",
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(124,92,255,0.2),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(46,230,255,0.12),transparent_70%)]',
  },
  'Player Support': {
    icon: LifeBuoy,
    blurb: 'Stuck in one of our games? Tell us the game, platform and your player ID.',
    prompt: 'Game, platform, device and what happened — links to screenshots help…',
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(46,230,255,0.14),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(124,92,255,0.16),transparent_70%)]',
  },
}
