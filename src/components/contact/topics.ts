import { Briefcase, Handshake, Layers, LifeBuoy, Newspaper, Rocket, type LucideIcon } from 'lucide-react'
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
  Partnership: {
    icon: Handshake,
    blurb: 'Brand collabs, IP licensing and long-term studio partnerships.',
    prompt: 'Tell us about your brand, the audience you want to reach and your timeline…',
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(10,124,255,0.2),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(124,92,255,0.14),transparent_70%)]',
  },
  Publishing: {
    icon: Rocket,
    blurb: "Got a game that's ready to grow? Pitch it to our publishing team.",
    prompt: 'Title, genre, platforms, current stage — plus a build or trailer link…',
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(124,92,255,0.22),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(10,124,255,0.14),transparent_70%)]',
  },
  'Co-development': {
    icon: Layers,
    blurb: 'Extra firepower in Unity or Unreal — art, engineering, porting, live-ops.',
    prompt: 'Engine, platforms, team size and where you need extra hands…',
    aura: 'bg-[radial-gradient(60%_45%_at_70%_0%,rgba(46,230,255,0.16),transparent_70%),radial-gradient(50%_40%_at_20%_100%,rgba(10,124,255,0.16),transparent_70%)]',
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
